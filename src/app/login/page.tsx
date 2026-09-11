"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, QuizHeader } from "@/components/quiz-ui";

export default function PraktikanLoginPage() {
	const [error, setError] = useState("");
	const router = useRouter();

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const values = new FormData(event.currentTarget);
		const name = String(values.get("name") ?? "").trim();
		const npm = String(values.get("npm") ?? "").trim();
		const className = String(values.get("class") ?? "").trim();
		const attendanceNumber = String(values.get("attendanceNumber") ?? "").trim();
		const token = String(values.get("token") ?? "").trim();
		if (!name || !npm || !className || !attendanceNumber || !token) {
			setError("Lengkapi identitas dan token sebelum melanjutkan.");
			return;
		}
		setError("");
		sessionStorage.setItem("webquiz-participant", JSON.stringify({ name, npm, className, attendanceNumber, token }));
		router.push("/dashboard");
	}

	return (
		<main className="figma-login praktikan-figma-login">
			<QuizHeader actionLabel="ADMIN" actionHref="/admin/login" />
			<section className="figma-login-stage">
				<GlassCard className="figma-login-card">
					<h1 className="figma-display-title">Quiz Portal<br /><span>Laboratorium Psikologi</span></h1>
					<form className="figma-login-form" onSubmit={handleSubmit} noValidate>
						<label htmlFor="name">Nama</label>
						<input id="name" name="name" autoComplete="name" aria-invalid={Boolean(error)} />
						<label htmlFor="npm">NPM</label>
						<input id="npm" name="npm" inputMode="numeric" aria-invalid={Boolean(error)} />
						<div className="figma-form-row">
							<div><label htmlFor="class">Kelas</label><input id="class" name="class" aria-invalid={Boolean(error)} /></div>
							<div><label htmlFor="attendanceNumber">No. absen</label><input id="attendanceNumber" name="attendanceNumber" inputMode="numeric" aria-invalid={Boolean(error)} /></div>
						</div>
						<label htmlFor="token">Token</label>
						<input id="token" name="token" autoComplete="one-time-code" aria-invalid={Boolean(error)} />
						{error && <p className="figma-form-error" role="alert">{error}</p>}
						<button className="figma-submit" type="submit">Masuk ke tes</button>
					</form>
				</GlassCard>
			</section>
			<footer className="figma-login-footer">LABORATORIUM PSIKOLOGI</footer>
		</main>
	);
}
