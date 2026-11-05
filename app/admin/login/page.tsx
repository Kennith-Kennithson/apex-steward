
import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/admin-login-form";
import { isAdminAuthenticated } from "@/lib/admin-session";

export default async function AdminLoginPage() {
  const authenticated = await isAdminAuthenticated();

  if (authenticated) {
    redirect("/admin");
  }

  return <AdminLoginForm />;
}
