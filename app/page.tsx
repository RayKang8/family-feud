import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  // If logged in → go to dashboard
  if (data.user) {
    redirect("/dashboard");
  }

  // If NOT logged in → show login button only
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