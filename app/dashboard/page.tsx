"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type GameRow = {
  id: string;
  title: string;
  created_at: string;
};

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [games, setGames] = useState<GameRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function requireUserOrRedirect() {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // treat as logged out if auth fails
      router.replace("/login");
      return null;
    }
    if (!data.user) {
      router.replace("/login");
      return null;
    }
    setUserEmail(data.user.email ?? "");
    return data.user;
  }

  async function loadGames() {
    setLoading(true);
    setError(null);

    const user = await requireUserOrRedirect();
    if (!user) return;

    const { data, error } = await supabase
      .from("games")
      .select("id,title,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setGames((data ?? []) as GameRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createNewGame() {
    if (creating) return;
    setCreating(true);
    setError(null);

    const user = await requireUserOrRedirect();
    if (!user) {
      setCreating(false);
      return;
    }

    // Create a new game row, then send user to builder /create/[gameId]
    const { data, error } = await supabase
      .from("games")
      .insert({ title: "Untitled Game", owner_id: user.id })
      .select("id")
      .single();

    if (error) {
      setError(error.message);
      setCreating(false);
      return;
    }

    router.push(`/create/${data.id}`);
  }

  if (loading) {
    return <main className="min-h-screen p-8">Loading...</main>;
  }

  return (
    <main className="min-h-screen p-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 opacity-80">Logged in as: {userEmail}</p>
        </div>

        <button
          onClick={createNewGame}
          disabled={creating}
          className="rounded-lg bg-blue-700 px-4 py-2 text-white font-semibold disabled:opacity-60"
        >
          {creating ? "Creating..." : "+ Create New Game"}
        </button>
      </div>

      <h2 className="text-xl font-semibold mt-10 mb-4">My Games</h2>

      {error && <p className="text-red-400">Error: {error}</p>}

      {games.length === 0 ? (
        <div className="rounded-xl border border-white/10 p-6">
          <p className="opacity-80">No games yet. Create your first one.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {games.map((g) => (
            <div
              key={g.id}
              className="rounded-xl border border-white/10 p-5 flex items-center justify-between"
            >
              <div>
                <div className="font-semibold">{g.title}</div>
                <div className="text-sm opacity-70">
                  {new Date(g.created_at).toLocaleString()}
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  href={`/play/${g.id}`}
                  className="rounded bg-green-600 px-3 py-1.5 text-sm font-semibold text-white"
                >
                  Play
                </Link>
                <Link
                  href={`/create/${g.id}`}
                  className="rounded bg-yellow-600 px-3 py-1.5 text-sm font-semibold text-white"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}