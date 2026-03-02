import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login");

  const { data: games, error } = await supabase
    .from("games")
    .select("id, title, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen p-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 opacity-80">Logged in as: {userData.user.email}</p>
        </div>

        <Link
          href="/create"
          className="rounded-lg bg-blue-700 px-4 py-2 text-white font-semibold"
        >
          + Create New Game
        </Link>
      </div>

      <h2 className="text-xl font-semibold mt-10 mb-4">My Games</h2>

      {error && (
        <p className="text-red-400">
          Error loading games: {error.message}
        </p>
      )}

      {!games || games.length === 0 ? (
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