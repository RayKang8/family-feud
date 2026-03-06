"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function login() {
    if (busy) return;
    setBusy(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setBusy(false);
    if (error) return alert(error.message);

    router.replace("/dashboard");
  }

  async function register() {
    if (busy) return;
    setBusy(true);

    const { data, error } = await supabase.auth.signUp({ email, password });

    setBusy(false);
    if (error) return alert(error.message);

    if (data.session) {
      router.replace("/dashboard");
      return;
    }

    alert("Registered! Check your email to confirm, then log in.");
    router.replace("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl border border-gray-200">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-6">
          Family Feud Labs
        </h1>

        <input
          className="w-full border border-gray-300 rounded-lg p-3 mb-3 text-gray-900 placeholder-gray-400 bg-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          autoComplete="email"
        />

        <input
          className="w-full border border-gray-300 rounded-lg p-3 mb-5 text-gray-900 placeholder-gray-400 bg-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          autoComplete="current-password"
        />

        <button
          onClick={login}
          disabled={busy}
          className="w-full rounded-lg bg-blue-700 text-white py-3 font-semibold disabled:opacity-60"
        >
          {busy ? "Working..." : "Login"}
        </button>

        <button
          onClick={register}
          disabled={busy}
          className="w-full rounded-lg bg-green-600 text-white py-3 font-semibold mt-3 disabled:opacity-60"
        >
          {busy ? "Working..." : "Register"}
        </button>
      </div>
    </div>
  );
}