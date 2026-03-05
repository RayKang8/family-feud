"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type GameRow = { id: string; title: string };
type QuestionRow = { id: string; prompt: string; order_index: number };
type AnswerRow = { id: string; question_id: string; text: string; points: number; order_index: number };

const revealSound = new Audio("/Correct.mp3");
const buzzerSound = new Audio("/Buzzer.mp3");

function playRevealSound() {
  revealSound.currentTime = 0;
  revealSound.play();
}

function playBuzzerSound() {
  buzzerSound.currentTime = 0;
  buzzerSound.play();
}

export default function PlayGamePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;

  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<GameRow | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [answersByQ, setAnswersByQ] = useState<Record<string, AnswerRow[]>>({});
  const [error, setError] = useState<string | null>(null);

  const [qIndex, setQIndex] = useState(0);
  const [revealed, setRevealed] = useState<Record<string, Record<string, true>>>({});
  const [showX, setShowX] = useState(false);

  function flashX() {
    setShowX(true);
    setTimeout(() => setShowX(false), 900);
  }

  async function requireUserOrRedirect() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      router.replace("/login");
      return null;
    }
    return data.user;
  }

  async function loadAll() {
    setLoading(true);
    setError(null);

    const user = await requireUserOrRedirect();
    if (!user) return;

    const gRes = await supabase
      .from("games")
      .select("id,title")
      .eq("id", gameId)
      .single();

    if (gRes.error) {
      setError(gRes.error.message);
      setLoading(false);
      return;
    }

    setGame(gRes.data);

    const qRes = await supabase
      .from("questions")
      .select("id,prompt,order_index")
      .eq("game_id", gameId)
      .order("order_index", { ascending: true });

    if (qRes.error) {
      setError(qRes.error.message);
      setLoading(false);
      return;
    }

    const qList = qRes.data ?? [];
    setQuestions(qList);
    setQIndex(0);

    const qIds = qList.map((q) => q.id);

    if (qIds.length === 0) {
      setAnswersByQ({});
      setLoading(false);
      return;
    }

    const aRes = await supabase
      .from("answers")
      .select("id,question_id,text,points,order_index")
      .in("question_id", qIds)
      .order("order_index", { ascending: true });

    if (aRes.error) {
      setError(aRes.error.message);
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
  }, [gameId]);

  const currentQ = questions[qIndex] ?? null;
  const currentAnswers = currentQ ? answersByQ[currentQ.id] ?? [] : [];

  function isRevealed(questionId: string, answerId: string) {
    return !!revealed[questionId]?.[answerId];
  }

  function revealAnswer(questionId: string, answerId: string) {
    if (isRevealed(questionId, answerId)) return;

    setRevealed((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] ?? {}), [answerId]: true },
    }));

    playRevealSound();
  }

  function nextQuestion() {
    setQIndex((i) => Math.min(i + 1, questions.length - 1));
  }

  function prevQuestion() {
    setQIndex((i) => Math.max(i - 1, 0));
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!currentQ) return;

      if (e.key === "x" || e.key === "X") {
        e.preventDefault();
        playBuzzerSound();
        flashX();
        return;
      }

      if (e.key === "ArrowRight") {
        nextQuestion();
        return;
      }

      if (e.key === "ArrowLeft") {
        prevQuestion();
        return;
      }

      const n = Number(e.key);

      if (Number.isFinite(n) && n >= 1 && n <= 9) {
        const idx = n - 1;
        const ans = currentAnswers[idx];
        if (ans) revealAnswer(currentQ.id, ans.id);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentQ, currentAnswers]);

  if (loading) return <main className="min-h-screen p-8">Loading...</main>;
  if (error) return <main className="min-h-screen p-8">Error: {error}</main>;
  if (!game) return <main className="min-h-screen p-8">Game not found.</main>;

  const left = currentAnswers.filter((_, i) => i % 2 === 0);
  const right = currentAnswers.filter((_, i) => i % 2 === 1);

  function Tile({ slotIndex, a }: { slotIndex: number; a?: AnswerRow }) {
    const qId = currentQ!.id;
    const revealedNow = a ? isRevealed(qId, a.id) : false;

    return (
      <button
        disabled={!a}
        onClick={() => a && revealAnswer(qId, a.id)}
        className="w-full rounded-xl border border-white/15 bg-gradient-to-b from-blue-900/40 to-blue-950/40 px-5 py-4 text-left shadow-lg"
      >
        <div className="flex justify-between">
          <div className="flex gap-4 items-center">
            <div className="h-10 w-10 flex items-center justify-center bg-black/40 rounded font-bold">
              {slotIndex + 1}
            </div>

            <div className="text-xl font-extrabold">
              {a ? (revealedNow ? a.text : "────────") : "────────"}
            </div>
          </div>

          <div className="text-2xl font-extrabold">
            {a ? (revealedNow ? a.points : "") : ""}
          </div>
        </div>
      </button>
    );
  }

  return (
    <main className="min-h-screen p-8">

      {showX && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="text-[160px] font-black text-red-600 drop-shadow-[0_0_25px_rgba(255,0,0,0.6)]">
            X
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <div>
          <h1 className="text-4xl font-extrabold">{game.title}</h1>
          <div className="opacity-70 mt-2">
            Question {qIndex + 1} / {questions.length} • Press X for buzzer
          </div>
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

      <div className="mt-8 border border-yellow-400/25 p-6 rounded-2xl">
        <div className="text-sm opacity-70 mb-2">PROMPT</div>
        <div className="text-3xl font-extrabold">{currentQ?.prompt}</div>
      </div>

      <div className="grid grid-cols-2 gap-5 mt-8">
        <div className="space-y-4">
          {left.map((a, i) => (
            <Tile key={a.id} slotIndex={i * 2} a={a} />
          ))}
        </div>

        <div className="space-y-4">
          {right.map((a, i) => (
            <Tile key={a.id} slotIndex={i * 2 + 1} a={a} />
          ))}
        </div>
      </div>

      <div className="flex justify-between mt-10">
        <button
          onClick={prevQuestion}
          disabled={qIndex === 0}
          className="rounded-lg bg-white/10 px-5 py-2"
        >
          ← Previous
        </button>

        <button
          onClick={nextQuestion}
          disabled={qIndex >= questions.length - 1}
          className="rounded-lg bg-white/10 px-5 py-2"
        >
          Next →
        </button>
      </div>
    </main>
  );
}