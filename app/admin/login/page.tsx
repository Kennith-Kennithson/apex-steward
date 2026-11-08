import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/admin-login-form";
import { isAdminAuthenticated } from "@/lib/admin-session";

async function AdminLoginContent() {
  await connection();

  const authenticated = await isAdminAuthenticated();

  if (authenticated) {
    redirect("/admin");
  }

  return <AdminLoginForm />;
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#101113] px-5 text-white">
          <p className="text-sm text-neutral-400">Loading administrator login...</p>
        </main>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
