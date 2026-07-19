"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Authentication failed");
        return;
      }

      const { redirectTo } = await response.json();
      router.push(redirectTo);
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 p-6">
      <div className="w-full max-w-md rounded-lg bg-gray-900 p-8 shadow-lg">
        <h1 className="mb-6 text-center text-3xl font-bold text-white">
          <img src="/logo.png" alt="RandomeriaFlix" className="mx-auto mb-2 h-12 w-auto" />
        </h1>
        <p className="mb-8 text-center text-gray-400">
          Enter your password to access your memories.
        </p>

        <form onSubmit={handleSubmit} action="#" method="post" className="space-y-6">
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-md border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:ring-red-500"
              placeholder="Password (Hint: DDMMYY)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-center text-sm font-medium text-red-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-md bg-red-600 px-4 py-3 text-lg font-semibold text-white shadow-md transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? (
              <svg
                className="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              "Login"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
