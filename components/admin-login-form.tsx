"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginForm() {
  const router = useRouter();

  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ passphrase }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Login failed. Please try again.");
        return;
      }

      setPassphrase("");
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Could not connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-6 py-16">
      <section className="w-full">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-red-500">
          Private access
        </p>

        <h1 className="mb-3 text-4xl font-bold tracking-tight">
          Admin login
        </h1>

        <p className="mb-8 text-sm text-neutral-400">
          This area is restricted to the site administrator.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="admin-passphrase"
              className="mb-2 block text-sm font-medium"
            >
              Admin passphrase
            </label>

            <input
              id="admin-passphrase"
              type="password"
              autoComplete="current-password"
              required
              minLength={20}
              maxLength={256}
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-red-500"
              placeholder="Enter your private passphrase"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || passphrase.length < 20}
            className="w-full rounded-md bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Checking..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-xs text-neutral-500">
          Player accounts are not required or available.
        </p>
      </section>
    </main>
  );
}