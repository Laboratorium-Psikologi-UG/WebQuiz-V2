"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, QuizHeader } from "@/components/quiz-ui";
import { useToast } from "@/components/toast";

const DEMO_USERNAME = "admin";
const DEMO_PASSWORD = "admin123";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string; form?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  function validate() {
    const next: typeof errors = {};
    if (!username.trim()) next.username = "Username wajib diisi.";
    if (!password) next.password = "Password wajib diisi.";
    return next;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const next = validate();
    if (Object.keys(next).length) {
      setErrors(next);
      showToast("Lengkapi field yang wajib diisi.", "warning");
      return;
    }
    setLoading(true);
    window.setTimeout(() => {
      if (username.trim() !== DEMO_USERNAME || password !== DEMO_PASSWORD) {
        setErrors({ form: "Username atau password salah." });
        setLoading(false);
        showToast("Username atau password salah.", "error");
        return;
      }
      setErrors({});
      sessionStorage.setItem("webquiz-admin", "true");
      showToast("Login berhasil.", "success");
      router.push("/admin/dashboard");
    }, 450);
  }

  return (
    <main className="figma-login admin-figma-login">
      <QuizHeader actionLabel="PRAKTIKAN" actionHref="/login" />
      <section className="figma-login-stage">
        <GlassCard className="figma-login-card">
          <h1 className="figma-display-title">Admin login<br /><span>Quiz Portal Laboratorium Psikologi</span></h1>
          <form className="figma-login-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="username">Username</label>
            <input id="username" name="username" autoComplete="username" aria-invalid={Boolean(errors.username || errors.form)} onBlur={() => !username.trim() && setErrors((current) => ({ ...current, username: "Username wajib diisi." }))} onChange={(event) => { setUsername(event.target.value); setErrors((current) => ({ ...current, username: undefined, form: undefined })); }} value={username} />
            {errors.username && <p className="form-field-error" role="alert">⚠ {errors.username}</p>}
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" aria-invalid={Boolean(errors.password || errors.form)} onBlur={() => !password && setErrors((current) => ({ ...current, password: "Password wajib diisi." }))} onChange={(event) => { setPassword(event.target.value); setErrors((current) => ({ ...current, password: undefined, form: undefined })); }} value={password} />
              <button aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} className="password-toggle" onClick={() => setShowPassword((value) => !value)} type="button">{showPassword ? "◉" : "◌"}</button>
            </div>
            {errors.password && <p className="form-field-error" role="alert">⚠ {errors.password}</p>}
            {errors.form && <p className="figma-form-error" role="alert">⚠ {errors.form}</p>}
            <button className="figma-submit" disabled={loading} type="submit">{loading ? <><span className="button-spinner" />Memeriksa...</> : "Masuk"}</button>
          </form>
        </GlassCard>
      </section>
      <footer className="figma-login-footer">LABORATORIUM PSIKOLOGI</footer>
    </main>
  );
}
