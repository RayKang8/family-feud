"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type GameRow = { id: string; title: string };
type QuestionRow = { id: string; prompt: string; order_index: number };
type AnswerRow = { id: string; question_id: string; text: string; points: number; order_index: number };

export default function PlayGamePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const params = useParams();
  const gameId = (params?.gameId as string) ?? "";

  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<GameRow | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [answersByQ, setAnswersByQ] = useState<Record<string, AnswerRow[]>>({});

  async function requireUserOrRedirect() {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      alert(error.message);
      router.push("/login");
      return false;
    }
    if (!data.user) {
      router.push("/login");
      return false;
    }
    return true;
  }

  async function loadAll() {
    if (!gameId) return;

    setLoading(true);
    if (!(await requireUserOrRedirect())) return;

    const { data: gameData, error: gErr } = await supabase
      .from("games")
      .select("id,title")
      .eq("id", gameId)
      .single();

    if (gErr) {
      alert(gErr.message);
      setLoading(false);
      return;
    }
    setGame(gameData);

    const { data: qData, error: qErr } = await supabase
      .from("questions")
      .select("id,prompt,order_index")
      .eq("game_id", gameId)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });

    if (qErr) {
      alert(qErr.message);
      setLoading(false);
      return;
    }
    setQuestions(qData ?? []);

    const qIds = (qData ?? []).map((q) => q.id);
    if (qIds.length === 0) {
      setAnswersByQ({});
      setLoading(false);
      return;
    }

    const { data: aData, error: aErr } = await supabase
      .from("answers")
      .select("id,question_id,text,points,order_index")
      .in("question_id", qIds)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });

    if (aErr) {
      alert(aErr.message);
      setLoading(false);
      return;
    }

    const grouped: Record<string, AnswerRow[]> = {};
    for (const a of aData ?? []) {
      (grouped[a.question_id] ??= []).push(a);
    }
    setAnswersByQ(grouped);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  if (loading) {
    return <main className="min-h-screen p-8">Loading...</main>;
  }

  if (!game) {
    return <main className="min-h-screen p-8">Game not found.</main>;
  }

  return (
    <main className="min-h-screen p-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold">{game.title}</h1>
          <p className="opacity-70 mt-2">Host view (simple v1 — reveal UI comes next)</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg bg-white/10 px-4 py-2 font-semibold"
          >
            Back
          </button>
          <button
            onClick={() => router.push(`/create/${gameId}`)}
            className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white"
          >
            Edit Game
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {questions.map((q, idx) => (
          <div key={q.id} className="rounded-2xl border border-white/10 p-6">
            <div className="text-sm opacity-70">Question {idx + 1}</div>
            <div className="text-xl font-semibold mt-1">{q.prompt}</div>

            <div className="mt-4 grid gap-2">
              {(answersByQ[q.id] ?? []).map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg bg-white/5 px-4 py-2 flex justify-between"
                >
                  <span className="font-semibold">{a.text}</span>
                  <span className="opacity-80">{a.points}</span>
                </div>
              ))}

              {(answersByQ[q.id] ?? []).length === 0 && (
                <div className="opacity-70">No answers.</div>
              )}
            </div>
          </div>
        ))}

        {questions.length === 0 && <div className="opacity-70">No questions yet.</div>}
      </div>
    </main>
  );
}