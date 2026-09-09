"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, QuizHeader } from "@/components/quiz-ui";

export default function AdminLoginPage() {
  const [error, setError] = useState("");
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (!formData.get("username") || !formData.get("password")) {
      setError("Username dan password wajib diisi untuk melanjutkan.");
      return;
    }
    setError("");
    router.push("/admin/dashboard");
  }

  return (
    <main className="figma-login admin-figma-login">
      <QuizHeader actionLabel="PRAKTIKAN" actionHref="/login" />
      <section className="figma-login-stage">
        <GlassCard className="figma-login-card">
          <h1 className="figma-display-title">Admin login<br /><span>Quiz Portal Laboratorium Psikologi</span></h1>
          <form className="figma-login-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="username">Username</label>
            <input id="username" name="username" autoComplete="username" aria-invalid={Boolean(error)} />
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" aria-invalid={Boolean(error)} />
            {error && <p className="figma-form-error" role="alert">{error}</p>}
            <button className="figma-submit" type="submit">Masuk</button>
          </form>
        </GlassCard>
      </section>
      <footer className="figma-login-footer">LABORATORIUM PSIKOLOGI</footer>
    </main>
  );
}