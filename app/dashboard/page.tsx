import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/login");

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-4">Logged in as: {data.user.email}</p>
    </div>
  );
}
