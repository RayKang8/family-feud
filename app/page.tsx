"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function check() {
      const { data, error } = await supabase.auth.getUser();

      // If something goes wrong, just treat as logged out
      if (!mounted) return;

      if (error) {
        setChecking(false);
        return;
      }

      if (data.user) {
        router.replace("/dashboard");
        return;
      }

      setChecking(false);
    }

    check();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  // Optional: tiny loading state so it doesn't flash the button if you're logged in
  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="opacity-70">Loading...</div>
      </main>
    );
  }

  // Not logged in → show login button only
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-4xl font-bold">Family Feud Labs</h1>

      <Link
        href="/login"
        className="rounded-lg bg-blue-700 px-6 py-3 text-white font-semibold"
      >
        Login / Register
      </Link>
    </main>
  );
}