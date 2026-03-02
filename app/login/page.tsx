"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);
    router.push("/dashboard");
  }

  async function register() {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return alert(error.message);
    alert("Registered! If email confirmation is enabled, check your inbox.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-950 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-center mb-6">Family Feud Labs</h1>

        <input
          className="w-full border rounded-lg p-2 mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
        />
        <input
          className="w-full border rounded-lg p-2 mb-5"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
        />

        <button onClick={login} className="w-full rounded-lg bg-blue-700 text-white py-2 font-semibold">
          Login
        </button>
        <button onClick={register} className="w-full rounded-lg bg-green-600 text-white py-2 font-semibold mt-3">
          Register
        </button>
      </div>
    </div>
  );
}