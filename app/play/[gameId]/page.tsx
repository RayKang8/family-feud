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
        className="group w-full [perspective:1200px] disabled:opacity-60"
      >
        <div
          className={[
            "relative min-h-[88px] w-full transition-transform duration-500 [transform-style:preserve-3d]",
            revealedNow || isFlipping ? "[transform:rotateX(180deg)]" : "",
          ].join(" ")}
        >
          <div className="absolute inset-0 [backface-visibility:hidden] rounded-2xl border border-orange-300/40 bg-gradient-to-b from-blue-700 via-blue-800 to-blue-950 px-5 py-4 shadow-[0_0_0_1px_rgba(251,146,60,0.18),0_8px_20px_rgba(0,0,0,0.45)]">
            <div className="flex h-full items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-lg border border-orange-300/40 bg-black/25 flex items-center justify-center text-xl font-black text-orange-200 shadow-inner">
                  {slotIndex + 1}
                </div>

                <div className="text-2xl font-black tracking-widest text-yellow-100">
                  {a ? "────────" : "────────"}
                </div>
              </div>

              <div className="min-w-16 text-right text-3xl font-black text-orange-200" />
            </div>
          </div>

          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateX(180deg)] rounded-2xl border px-5 py-4 shadow-2xl">
            <div
              className={[
                "absolute inset-0 rounded-2xl",
                revealedNow
                  ? "border border-orange-200/60 bg-gradient-to-b from-orange-200 via-amber-300 to-orange-500 shadow-[0_0_25px_rgba(251,146,60,0.38)]"
                  : "border border-orange-300/40 bg-gradient-to-b from-blue-700 via-blue-800 to-blue-950",
              ].join(" ")}
            />

            <div className="relative flex h-full items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={[
                    "h-11 w-11 rounded-lg flex items-center justify-center text-xl font-black shadow-inner",
                    revealedNow
                      ? "border border-orange-700/30 bg-orange-100 text-orange-900"
                      : "border border-orange-300/30 bg-black/25 text-orange-200",
                  ].join(" ")}
                >
                  {slotIndex + 1}
                </div>

                <div
                  className={[
                    "text-2xl font-black tracking-wide",
                    revealedNow ? "text-orange-950" : "text-yellow-100",
                  ].join(" ")}
                >
                  {a ? a.text : "────────"}
                </div>
              </div>

              <div
                className={[
                  "min-w-16 text-right text-3xl font-black tabular-nums",
                  revealedNow ? "text-orange-950" : "text-orange-200",
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#273c88_0%,_#10214d_40%,_#170d0a_75%,_#09090b_100%)] p-8 text-white">
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
            <h1 className="text-4xl font-black tracking-tight text-orange-200">
              {game.title}
            </h1>
            <div className="mt-2 text-sm text-orange-100/70">
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
              className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-400"
            >
              Edit Game
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-[30px] border border-orange-300/35 bg-gradient-to-b from-orange-400/20 via-orange-300/10 to-transparent p-3 shadow-[0_0_0_2px_rgba(251,146,60,0.15),0_0_40px_rgba(251,146,60,0.12)]">
          <div className="rounded-[24px] border border-orange-200/20 bg-gradient-to-b from-[#1c3f97] via-[#0b2460] to-[#061532] p-6">
            <div className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-orange-200/70">
              Prompt
            </div>
            <div className="text-4xl font-black tracking-tight text-white">
              {currentQ?.prompt}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[30px] border border-orange-300/35 bg-gradient-to-b from-orange-400/20 via-orange-300/10 to-transparent p-4 shadow-[0_0_0_2px_rgba(251,146,60,0.15),0_0_45px_rgba(0,0,0,0.55)]">
          <div className="rounded-[24px] bg-gradient-to-b from-[#1a3f9d] via-[#0b2d73] to-[#071632] p-4">
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