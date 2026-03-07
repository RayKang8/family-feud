"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type GameRow = { id: string; title: string };
type QuestionRow = { id: string; prompt: string; order_index: number };
type AnswerRow = {
  id: string;
  question_id: string;
  text: string;
  points: number;
  order_index: number;
};

const revealSound = new Audio("/Correct.mp3");
const buzzerSound = new Audio("/Buzzer.mp3");

function playRevealSound() {
  revealSound.currentTime = 0;
  revealSound.play().catch(() => {});
}

function playBuzzerSound() {
  buzzerSound.currentTime = 0;
  buzzerSound.play().catch(() => {});
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
  const [revealed, setRevealed] = useState<Record<string, Record<string, true>>>(
    {}
  );
  const [showX, setShowX] = useState(false);
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(true);

  function flashX() {
    setShowX(true);
    setTimeout(() => setShowX(false), 1000);
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
    setShowIntro(true);

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
    }, 260);
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
      if (showIntro) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setShowIntro(false);
        }
        return;
      }

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
  }, [showIntro, currentQ, currentAnswers, revealingId]);

  if (loading) return <main className="min-h-screen p-8 text-white">Loading...</main>;
  if (error) return <main className="min-h-screen p-8 text-white">Error: {error}</main>;
  if (!game) return <main className="min-h-screen p-8 text-white">Game not found.</main>;

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
        className="group relative w-full [perspective:1400px] disabled:opacity-60"
      >
        <div
          className={[
            "relative min-h-[108px] w-full transition-transform duration-700 [transform-style:preserve-3d]",
            revealedNow || isFlipping ? "[transform:rotateX(180deg)]" : "",
          ].join(" ")}
        >
          <div className="absolute inset-0 [backface-visibility:hidden] overflow-hidden rounded-[24px] border border-amber-300/60 bg-gradient-to-b from-[#2d5cff] via-[#173cae] to-[#081b66] px-5 py-4 shadow-[0_0_0_2px_rgba(255,196,87,0.28),0_0_24px_rgba(255,166,0,0.18),inset_0_2px_0_rgba(255,255,255,0.3),inset_0_-8px_16px_rgba(0,0,0,0.35)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.32),transparent_45%)]" />
            <div className="pointer-events-none absolute -left-1/3 top-0 h-full w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-70 transition-transform duration-700 group-hover:translate-x-[260%]" />
            <div className="pointer-events-none absolute inset-[3px] rounded-[20px] border border-yellow-200/25" />

            <div className="relative flex h-full items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[16px] border border-amber-200/70 bg-gradient-to-b from-[#2346d0] to-[#102775] text-2xl font-black text-yellow-100 shadow-[0_0_10px_rgba(255,200,90,0.2),inset_0_1px_0_rgba(255,255,255,0.25)]">
                  {slotIndex + 1}
                </div>

                <div className="text-3xl font-black tracking-[0.25em] text-yellow-100 drop-shadow-[0_0_10px_rgba(255,240,170,0.3)]">
                  {a ? "────────" : "────────"}
                </div>
              </div>

              <div className="min-w-20 text-right text-4xl font-black text-yellow-100/0">
                00
              </div>
            </div>
          </div>

          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateX(180deg)] overflow-hidden rounded-[24px] border border-amber-200/80 px-5 py-4 shadow-[0_0_0_2px_rgba(255,196,87,0.38),0_0_30px_rgba(255,179,0,0.24),inset_0_2px_0_rgba(255,255,255,0.34),inset_0_-10px_18px_rgba(0,0,0,0.25)]">
            <div className="absolute inset-0 bg-gradient-to-b from-[#ffd978] via-[#ffb52e] to-[#ef7d00]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.55),transparent_45%)]" />
            <div className="absolute -left-1/4 top-0 h-full w-1/4 rotate-12 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-[shine_1.2s_ease-out]" />
            <div className="absolute inset-[3px] rounded-[20px] border border-orange-950/15" />

            <div className="relative flex h-full items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] border border-orange-900/20 bg-gradient-to-b from-[#fff1b8] to-[#ffc953] text-2xl font-black text-orange-950 shadow-inner">
                  {slotIndex + 1}
                </div>

                <div className="truncate text-3xl font-black uppercase tracking-wide text-orange-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.35)]">
                  {a ? a.text : "────────"}
                </div>
              </div>

              <div className="min-w-20 text-right text-4xl font-black tabular-nums text-orange-950">
                {a ? a.points : ""}
              </div>
            </div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#04050b] text-white">
      <style jsx global>{`
        @keyframes shine {
          0% {
            transform: translateX(-40%) rotate(12deg);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translateX(420%) rotate(12deg);
            opacity: 0;
          }
        }

        @keyframes boardGlow {
          0%,
          100% {
            box-shadow:
              0 0 18px rgba(255, 166, 0, 0.18),
              0 0 40px rgba(35, 104, 255, 0.18);
          }
          50% {
            box-shadow:
              0 0 28px rgba(255, 191, 0, 0.28),
              0 0 60px rgba(35, 104, 255, 0.28);
          }
        }

        @keyframes titlePulse {
          0%,
          100% {
            text-shadow:
              0 0 10px rgba(255, 207, 112, 0.2),
              0 0 20px rgba(255, 162, 0, 0.18);
          }
          50% {
            text-shadow:
              0 0 18px rgba(255, 221, 130, 0.35),
              0 0 35px rgba(255, 162, 0, 0.24);
          }
        }

        @keyframes introPop {
          0% {
            opacity: 0;
            transform: scale(0.96) translateY(10px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>

      {showX && !showIntro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[2px]">
          <div className="relative">
            <div className="absolute inset-0 scale-150 rounded-full bg-red-600/30 blur-3xl" />
            <div className="relative animate-pulse text-[220px] font-black leading-none text-red-500 drop-shadow-[0_0_30px_rgba(255,0,0,0.8)]">
              X
            </div>
          </div>
        </div>
      )}

      {showIntro && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div
            className="relative w-full max-w-3xl px-6"
            style={{ animation: "introPop 0.35s ease-out" }}
          >
            <div className="absolute inset-0 rounded-[36px] bg-orange-500/20 blur-3xl" />

            <div className="relative overflow-hidden rounded-[36px] border border-amber-300/50 bg-gradient-to-b from-[#2d61ff] via-[#14379d] to-[#081547] p-[10px] shadow-[0_0_0_2px_rgba(255,196,87,0.25),0_0_50px_rgba(255,166,0,0.18),0_0_80px_rgba(37,99,235,0.2)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_40%)]" />
              <div className="pointer-events-none absolute -left-1/4 top-0 h-full w-1/4 rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shine_2s_linear_infinite]" />

              <div className="relative rounded-[28px] border border-yellow-200/20 bg-gradient-to-b from-[#315fff] via-[#163ca8] to-[#091a57] px-8 py-12 text-center shadow-[inset_0_2px_0_rgba(255,255,255,0.22),inset_0_-10px_18px_rgba(0,0,0,0.35)]">
                <div className="mb-4 text-sm font-extrabold uppercase tracking-[0.35em] text-[#ffd8a2]/80">
                  Family Feud
                </div>

                <h1
                  className="text-6xl font-black tracking-tight text-[#ffe0ad]"
                  style={{ animation: "titlePulse 2.8s ease-in-out infinite" }}
                >
                  {game.title}
                </h1>

                <p className="mx-auto mt-5 max-w-2xl text-lg text-orange-100/85">
                  Get ready to play. Reveal answers with number keys, use X for
                  strikes, and move through the board like a real game show.
                </p>

                <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <div className="text-sm font-bold uppercase tracking-[0.2em] text-orange-200/80">
                      Reveal
                    </div>
                    <div className="mt-2 text-2xl font-black text-white">1–9</div>
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <div className="text-sm font-bold uppercase tracking-[0.2em] text-orange-200/80">
                      Strike
                    </div>
                    <div className="mt-2 text-2xl font-black text-white">X</div>
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <div className="text-sm font-bold uppercase tracking-[0.2em] text-orange-200/80">
                      Navigate
                    </div>
                    <div className="mt-2 text-2xl font-black text-white">← →</div>
                  </div>
                </div>

                <div className="mt-10">
                  <button
                    onClick={() => setShowIntro(false)}
                    className="rounded-2xl border border-orange-200/40 bg-gradient-to-b from-[#ff9a1f] to-[#ff6a00] px-10 py-4 text-xl font-black text-white shadow-[0_8px_24px_rgba(255,115,0,0.3),inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:scale-[1.02] hover:brightness-110"
                  >
                    Start Game
                  </button>
                </div>

                <div className="mt-4 text-sm text-orange-100/70">
                  Press Enter or Space to begin
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#3257ff_0%,rgba(18,37,96,0.9)_28%,rgba(12,10,18,0.96)_60%,#030308_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(255,115,0,0.16),transparent_30%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1
              className="text-5xl font-black tracking-tight text-[#ffd9a0]"
              style={{ animation: "titlePulse 2.8s ease-in-out infinite" }}
            >
              {game.title}
            </h1>
            <div className="mt-2 text-sm font-medium text-orange-100/75">
              Question {qIndex + 1} / {questions.length} • Press X for buzzer •
              Press 1–9 to reveal
            </div>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:bg-white/15"
          >
            Back
          </button>
        </div>

        <div
          className="mt-8 rounded-[34px] border border-amber-300/45 bg-gradient-to-b from-[#5a3b12]/70 via-[#241408]/90 to-[#140b06]/95 p-[10px]"
          style={{ animation: "boardGlow 2.8s ease-in-out infinite" }}
        >
          <div className="rounded-[28px] border border-yellow-200/25 bg-gradient-to-b from-[#2f62ff] via-[#1237a7] to-[#07164f] p-6 shadow-[inset_0_2px_0_rgba(255,255,255,0.22),inset_0_-10px_18px_rgba(0,0,0,0.4)]">
            <div className="mb-3 text-sm font-extrabold uppercase tracking-[0.28em] text-[#ffd8a2]/80">
              Prompt
            </div>
            <div className="text-4xl font-black tracking-tight text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.12)]">
              {currentQ?.prompt}
            </div>
          </div>
        </div>

        <div
          className="mt-8 rounded-[34px] border border-amber-300/45 bg-gradient-to-b from-[#5a3b12]/70 via-[#241408]/90 to-[#140b06]/95 p-[12px]"
          style={{ animation: "boardGlow 2.8s ease-in-out infinite" }}
        >
          <div className="rounded-[28px] border border-yellow-200/20 bg-gradient-to-b from-[#2d61ff] via-[#14379d] to-[#081547] p-5 shadow-[inset_0_2px_0_rgba(255,255,255,0.18),inset_0_-12px_20px_rgba(0,0,0,0.38)]">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
            disabled={qIndex === 0 || showIntro}
            className="rounded-2xl border border-white/15 bg-white/10 px-6 py-3 font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:bg-white/15 disabled:opacity-50"
          >
            ← Previous
          </button>

          <button
            onClick={nextQuestion}
            disabled={qIndex >= questions.length - 1 || showIntro}
            className="rounded-2xl border border-white/15 bg-white/10 px-6 py-3 font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:bg-white/15 disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </div>
    </main>
  );
}