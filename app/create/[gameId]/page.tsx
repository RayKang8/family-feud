"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type GameRow = { id: string; title: string };
type QuestionRow = { id: string; game_id: string; prompt: string; order_index: number };
type AnswerRow = { id: string; question_id: string; text: string; points: number; order_index: number };

export default function GameBuilderPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const params = useParams();
  const gameId = (params?.gameId as string) ?? "";

  const [loading, setLoading] = useState(true);

  const [game, setGame] = useState<GameRow | null>(null);
  const [gameTitle, setGameTitle] = useState("");

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [answersByQ, setAnswersByQ] = useState<Record<string, AnswerRow[]>>({});

  const [newPrompt, setNewPrompt] = useState("");

  async function requireUserOrRedirect() {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // If auth is misconfigured, show it loudly
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

    // Load game
    const gameRes = await supabase.from("games").select("id,title").eq("id", gameId).single();
    if (gameRes.error) {
      alert(gameRes.error.message);
      setLoading(false);
      return;
    }
    setGame(gameRes.data);
    setGameTitle(gameRes.data.title);

    // Load questions
    const qRes = await supabase
      .from("questions")
      .select("id,game_id,prompt,order_index")
      .eq("game_id", gameId)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });

    if (qRes.error) {
      alert(qRes.error.message);
      setLoading(false);
      return;
    }
    setQuestions(qRes.data ?? []);

    // Load answers for all questions
    const qIds = (qRes.data ?? []).map((q) => q.id);
    if (qIds.length === 0) {
      setAnswersByQ({});
      setLoading(false);
      return;
    }

    const aRes = await supabase
      .from("answers")
      .select("id,question_id,text,points,order_index")
      .in("question_id", qIds)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });

    if (aRes.error) {
      alert(aRes.error.message);
      setLoading(false);
      return;
    }

    const grouped: Record<string, AnswerRow[]> = {};
    for (const a of aRes.data ?? []) {
      (grouped[a.question_id] ??= []).push(a);
    }
    setAnswersByQ(grouped);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  async function saveTitle() {
    if (!gameTitle.trim()) return;
    const { error } = await supabase.from("games").update({ title: gameTitle }).eq("id", gameId);
    if (error) return alert(error.message);
    alert("Saved title");
  }

  async function addQuestion() {
    const prompt = newPrompt.trim();
    if (!prompt) return;

    const order_index = questions.length;
    const { data, error } = await supabase
      .from("questions")
      .insert({ game_id: gameId, prompt, order_index })
      .select("id,game_id,prompt,order_index")
      .single();

    if (error) return alert(error.message);

    setQuestions((prev) => [...prev, data]);
    setNewPrompt("");
  }

  async function deleteQuestion(qId: string) {
    const ok = confirm("Delete this question (and its answers)?");
    if (!ok) return;

    const { error } = await supabase.from("questions").delete().eq("id", qId);
    if (error) return alert(error.message);

    setQuestions((prev) => prev.filter((q) => q.id !== qId));
    setAnswersByQ((prev) => {
      const copy = { ...prev };
      delete copy[qId];
      return copy;
    });
  }

  async function addAnswer(qId: string) {
    const text = prompt("Answer text?");
    if (!text || !text.trim()) return;

    const pointsStr = prompt("Points (number)?", "0");
    const points = Number(pointsStr ?? 0);
    if (!Number.isFinite(points)) return alert("Points must be a number.");

    const current = answersByQ[qId] ?? [];
    const order_index = current.length;

    const { data, error } = await supabase
      .from("answers")
      .insert({ question_id: qId, text: text.trim(), points, order_index })
      .select("id,question_id,text,points,order_index")
      .single();

    if (error) return alert(error.message);

    setAnswersByQ((prev) => ({
      ...prev,
      [qId]: [...(prev[qId] ?? []), data],
    }));
  }

  async function deleteAnswer(aId: string) {
    const ok = confirm("Delete this answer?");
    if (!ok) return;

    const { data: row, error: rowErr } = await supabase
      .from("answers")
      .select("id,question_id")
      .eq("id", aId)
      .single();

    if (rowErr) return alert(rowErr.message);

    const { error } = await supabase.from("answers").delete().eq("id", aId);
    if (error) return alert(error.message);

    const qId = row.question_id;
    setAnswersByQ((prev) => ({
      ...prev,
      [qId]: (prev[qId] ?? []).filter((a) => a.id !== aId),
    }));
  }

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
          <h1 className="text-3xl font-bold">Game Builder</h1>
          <p className="opacity-70 mt-1">Build your Family Feud game.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg bg-white/10 px-4 py-2 font-semibold"
          >
            Back
          </button>
          <button
            onClick={() => router.push(`/play/${gameId}`)}
            className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white"
          >
            Host / Play
          </button>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-white/10 p-6">
        <h2 className="text-xl font-semibold mb-3">Game Title</h2>
        <div className="flex gap-3">
          <input
            className="w-full rounded-lg border border-white/10 bg-transparent p-2"
            value={gameTitle}
            onChange={(e) => setGameTitle(e.target.value)}
          />
          <button onClick={saveTitle} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">
            Save
          </button>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-white/10 p-6">
        <h2 className="text-xl font-semibold mb-3">Questions</h2>

        <div className="flex gap-3 mb-6">
          <input
            className="w-full rounded-lg border border-white/10 bg-transparent p-2"
            placeholder="Add a prompt (e.g., Name a food you eat at breakfast)"
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
          />
          <button
            onClick={addQuestion}
            className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white"
          >
            Add
          </button>
        </div>

        {questions.length === 0 ? (
          <p className="opacity-70">No questions yet.</p>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => {
              const answers = answersByQ[q.id] ?? [];
              return (
                <div key={q.id} className="rounded-xl border border-white/10 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold">{q.prompt}</div>
                      <div className="text-sm opacity-70 mt-1">
                        {answers.length} answer{answers.length === 1 ? "" : "s"}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => addAnswer(q.id)}
                        className="rounded bg-green-600 px-3 py-1.5 text-sm font-semibold text-white"
                      >
                        + Answer
                      </button>
                      <button
                        onClick={() => deleteQuestion(q.id)}
                        className="rounded bg-red-600 px-3 py-1.5 text-sm font-semibold text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    {answers.length === 0 ? (
                      <div className="opacity-70 text-sm">No answers yet.</div>
                    ) : (
                      answers.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">{a.text}</span>
                            <span className="text-sm opacity-70">{a.points} pts</span>
                          </div>
                          <button
                            onClick={() => deleteAnswer(a.id)}
                            className="text-sm rounded bg-red-600 px-2 py-1 font-semibold text-white"
                          >
                            X
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}