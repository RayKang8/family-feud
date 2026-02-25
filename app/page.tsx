export default function Home() {
  return (
    <main className="min-h-screen bg-blue-900 text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-5xl font-bold">Family Feud Builder</h1>

      <div className="flex gap-6">
        <a
          href="/create"
          className="bg-yellow-400 text-black px-6 py-3 rounded-xl font-semibold hover:bg-yellow-300 transition"
        >
          Create Game
        </a>

        <a
          href="/play"
          className="bg-white text-blue-900 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition"
        >
          Play Game
        </a>
      </div>
    </main>
  );
}