"use client";

import { useState } from "react";

export default function PlayPage() {
  const [revealed, setRevealed] = useState<number[]>([]);
  const [teamA, setTeamA] = useState(0);
  const [teamB, setTeamB] = useState(0);

  const answers = [
    { text: "Apple", points: 35 },
    { text: "Banana", points: 25 },
    { text: "Strawberry", points: 15 },
    { text: "Mango", points: 10 },
    { text: "Blueberry", points: 8 },
    { text: "Pineapple", points: 7 },
  ];

  const reveal = (index: number) => {
    if (!revealed.includes(index)) {
      setRevealed([...revealed, index]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-blue-900 text-white p-6">

      {/* HEADER */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-extrabold tracking-widest text-yellow-400 drop-shadow-lg">
          FAMILY FEUD
        </h1>
        <p className="text-2xl mt-4">Name a fruit you put in a smoothie</p>
      </div>

      {/* SCOREBOARD */}
      <div className="flex justify-center gap-12 mb-10">
        <div className="bg-red-600 px-10 py-6 rounded-2xl shadow-2xl text-center">
          <h2 className="text-xl font-bold">TEAM A</h2>
          <p className="text-4xl mt-2">{teamA}</p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setTeamA(teamA + 10)}
              className="bg-white text-red-600 px-3 py-1 rounded"
            >
              +10
            </button>
            <button
              onClick={() => setTeamA(Math.max(0, teamA - 10))}
              className="bg-white text-red-600 px-3 py-1 rounded"
            >
              -10
            </button>
          </div>
        </div>

        <div className="bg-green-600 px-10 py-6 rounded-2xl shadow-2xl text-center">
          <h2 className="text-xl font-bold">TEAM B</h2>
          <p className="text-4xl mt-2">{teamB}</p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setTeamB(teamB + 10)}
              className="bg-white text-green-600 px-3 py-1 rounded"
            >
              +10
            </button>
            <button
              onClick={() => setTeamB(Math.max(0, teamB - 10))}
              className="bg-white text-green-600 px-3 py-1 rounded"
            >
              -10
            </button>
          </div>
        </div>
      </div>

      {/* ANSWER BOARD */}
      <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto">
        {answers.map((answer, index) => (
          <div
            key={index}
            onClick={() => reveal(index)}
            className="cursor-pointer bg-yellow-400 text-blue-900 font-bold text-2xl rounded-xl p-6 shadow-2xl flex justify-between items-center hover:scale-105 transition-transform duration-200"
          >
            {revealed.includes(index) ? (
              <>
                <span>{answer.text}</span>
                <span>{answer.points}</span>
              </>
            ) : (
              <span className="w-full text-center">---</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}