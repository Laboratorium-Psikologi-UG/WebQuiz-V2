"use client";

import { trpc } from "@/lib/trpc/client";

export default function Home() {
  // Smoke test: hits `trpc.health.ping` on the server through the
  // mounted /api/trpc route handler. Replace with real UI once the
  // app has more to show.
  const ping = trpc.health.ping.useQuery({ name: "WebQuiz" });

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-6 py-32 px-16 bg-white dark:bg-black text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          WebQuiz V2
        </h1>
        <p className="max-w-md text-zinc-600 dark:text-zinc-400">
          tRPC is wired up. Health check below should resolve through
          <code className="mx-1 rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/[.08]">
            /api/trpc
          </code>
          to the server.
        </p>
        <pre className="rounded border border-black/[.08] dark:border-white/[.145] bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-left text-sm font-mono text-zinc-800 dark:text-zinc-200 min-w-80">
          {ping.isPending
            ? "loading…"
            : ping.error
              ? `error: ${ping.error.message}`
              : JSON.stringify(ping.data, null, 2)}
        </pre>
      </main>
    </div>
  );
}
