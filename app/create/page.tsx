"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CreateGamePage() {
  const supabase = createClient();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function createGame() {
    setSaving(true);

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) {
      alert("You must be logged in.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("games").insert({
      title,
      owner_id: userRes.user.id,
    });

    setSaving(false);

    if (error) return alert(error.message);

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 p-6">
        <h1 className="text-2xl font-bold mb-4">Create a New Game</h1>

        <label className="block text-sm font-medium mb-1">Game title</label>
        <input
          className="w-full rounded-lg border border-white/10 bg-transparent p-2 mb-4"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Birthday Party Feud"
        />

        <button
          disabled={!title.trim() || saving}
          onClick={createGame}
          className="rounded-lg bg-blue-700 px-4 py-2 text-white font-semibold disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create Game"}
        </button>
      </div>
    </main>
  );
}