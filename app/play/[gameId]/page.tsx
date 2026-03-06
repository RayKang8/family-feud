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
  const [revealingId, setRevealingId] = useState<string | null>(null);

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
    if (revealingId) return;

    setRevealingId(answerId);

    setTimeout(() => {
      setRevealed((prev) => ({
        ...prev,
        [questionId]: { ...(prev[questionId] ?? {}), [answerId]: true },
      }));
      playRevealSound();
      setRevealingId(null);
    }, 220);
  }

  function nextQuestion() {
    setQIndex((i) => Math.min(i + 1, questions.length - 1));
    setRevealingId(null);
  }

  function prevQuestion() {
    setQIndex((i) => Math.max(i - 1, 0));
    setRevealingId(null);
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
  }, [currentQ, currentAnswers, revealingId]);

  if (loading) return <main className="min-h-screen p-8">Loading...</main>;
  if (error) return <main className="min-h-screen p-8">Error: {error}</main>;
  if (!game) return <main className="min-h-screen p-8">Game not found.</main>;

  const left = currentAnswers.filter((_, i) => i % 2 === 0);
  const right = currentAnswers.filter((_, i) => i % 2 === 1);

  function Tile({ slotIndex, a }: { slotIndex: number; a?: AnswerRow }) {
    const qId = currentQ!.id;
    const revealedNow = a ? isRevealed(qId, a.id) : false;
    const isFlipping = a ? revealingId === a.id : false;

    return (
      <button
        disabled={!a}
        onClick={() => a && revealAnswer(qId, a.id)}
        className="group w-full perspective-[1200px] disabled:opacity-60"
      >
        <div
          className={[
            "relative min-h-[88px] w-full transition-transform duration-500 [transform-style:preserve-3d]",
            revealedNow || isFlipping ? "rotate-x-180" : "",
          ].join(" ")}
        >
          {/* Front */}
          <div
            className={[
              "absolute inset-0 [backface-visibility:hidden] rounded-2xl border px-5 py-4 shadow-2xl",
              "border-yellow-400/35 bg-gradient-to-b from-blue-700 via-blue-800 to-blue-950",
              "group-hover:border-yellow-300/50",
            ].join(" ")}
          >
            <div className="flex h-full items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-lg border border-yellow-300/30 bg-black/25 flex items-center justify-center text-xl font-black text-yellow-300 shadow-inner">
                  {slotIndex + 1}
                </div>

                <div className="text-2xl font-black tracking-widest text-yellow-100">
                  {a ? "────────" : "────────"}
                </div>
              </div>

              <div className="min-w-16 text-right text-3xl font-black text-yellow-200" />
            </div>
          </div>

          {/* Back */}
          <div
            className={[
              "absolute inset-0 [backface-visibility:hidden] [transform:rotateX(180deg)] rounded-2xl border px-5 py-4 shadow-2xl",
              revealedNow
                ? "border-yellow-300/60 bg-gradient-to-b from-amber-200 via-yellow-300 to-amber-500 shadow-[0_0_30px_rgba(250,204,21,0.35)]"
                : "border-yellow-400/35 bg-gradient-to-b from-blue-700 via-blue-800 to-blue-950",
            ].join(" ")}
          >
            <div className="flex h-full items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={[
                    "h-11 w-11 rounded-lg flex items-center justify-center text-xl font-black shadow-inner",
                    revealedNow
                      ? "border border-amber-700/30 bg-amber-100 text-amber-900"
                      : "border border-yellow-300/30 bg-black/25 text-yellow-300",
                  ].join(" ")}
                >
                  {slotIndex + 1}
                </div>

                <div
                  className={[
                    "text-2xl font-black tracking-wide",
                    revealedNow ? "text-amber-950" : "text-yellow-100",
                  ].join(" ")}
                >
                  {a ? a.text : "────────"}
                </div>
              </div>

              <div
                className={[
                  "min-w-16 text-right text-3xl font-black tabular-nums",
                  revealedNow ? "text-amber-950" : "text-yellow-200",
                ].join(" ")}
              >
                {a ? a.points : ""}
              </div>
            </div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#123a8f_0%,_#07152f_55%,_#030712_100%)] p-8 text-white">
      {showX && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45">
          <div className="animate-pulse text-[180px] font-black text-red-600 drop-shadow-[0_0_30px_rgba(255,0,0,0.75)]">
            X
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl">
        <div className="flex justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-yellow-200">
              {game.title}
            </h1>
            <div className="mt-2 text-sm text-yellow-100/70">
              Question {qIndex + 1} / {questions.length} • Press X for buzzer • Press 1–9 to reveal
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 font-semibold hover:bg-white/15"
            >
              Back
            </button>

            <button
              onClick={() => router.push(`/create/${gameId}`)}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500"
            >
              Edit Game
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-[28px] border border-yellow-300/30 bg-gradient-to-b from-[#163f9d] via-[#0a2560] to-[#05122d] p-2 shadow-[0_0_0_2px_rgba(250,204,21,0.08),0_0_35px_rgba(0,0,0,0.45)]">
          <div className="rounded-[22px] border border-yellow-200/20 bg-black/20 p-6">
            <div className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-yellow-200/70">
              Prompt
            </div>
            <div className="text-4xl font-black tracking-tight text-white">
              {currentQ?.prompt}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[28px] border border-yellow-300/30 bg-gradient-to-b from-[#1845aa] via-[#0b2c73] to-[#061634] p-4 shadow-[0_0_0_2px_rgba(250,204,21,0.08),0_0_45px_rgba(0,0,0,0.55)]">
          <div className="grid grid-cols-2 gap-5">
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
        </div>

        <div className="mt-10 flex justify-between">
          <button
            onClick={prevQuestion}
            disabled={qIndex === 0}
            className="rounded-xl border border-white/15 bg-white/10 px-6 py-3 font-bold hover:bg-white/15 disabled:opacity-50"
          >
            ← Previous
          </button>

          <button
            onClick={nextQuestion}
            disabled={qIndex >= questions.length - 1}
            className="rounded-xl border border-white/15 bg-white/10 px-6 py-3 font-bold hover:bg-white/15 disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </div>
    </main>
  );
}