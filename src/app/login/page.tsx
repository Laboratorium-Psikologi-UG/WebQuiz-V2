"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, QuizHeader } from "@/components/quiz-ui";
import { useToast } from "@/components/toast";
import { trpc } from "@/lib/trpc/client";
import { mockAuthCredentials } from "@/lib/mock-data";

type ParticipantLoginData = {
	name: string;
	npm: string;
	className: string;
	kelasId: string;
	attendanceNumber: string;
	token: string;
};

type ReviewIconKind = "user" | "id" | "class" | "number";

function ReviewIcon({ kind }: { kind: ReviewIconKind }) {
	return (
		<svg aria-hidden="true" className="login-review-svg" fill="none" height="16" viewBox="0 0 24 24" width="16">
			{kind === "user" && <><circle cx="12" cy="8" r="3" /><path d="M5 20c0-3.3 2.7-5 7-5s7 1.7 7 5" /></>}
			{kind === "id" && <><rect height="14" rx="2" width="18" x="3" y="5" /><circle cx="8" cy="11" r="2" /><path d="M13 10h5M13 14h4" /></>}
			{kind === "class" && <><path d="m3 8 9-4 9 4-9 4-9-4Z" /><path d="M6 10v4c3 2 9 2 12 0v-4" /></>}
			{kind === "number" && <><path d="M9 3 7 21M17 3l-2 18M4 9h17M3 15h17" /></>}
		</svg>
	);
}

export default function PraktikanLoginPage() {
	const [error, setError] = useState("");
	const [pendingLogin, setPendingLogin] = useState<ParticipantLoginData | null>(null);
		const router = useRouter();
	const { showToast } = useToast();
	const useMockAuth = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";
	const redeemMutation = trpc.auth.redeem.useMutation();

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (redeemMutation.isPending || pendingLogin) return;
		const values = new FormData(event.currentTarget);
		const data: ParticipantLoginData = {
			name: String(values.get("name") ?? "").trim(),
			npm: String(values.get("npm") ?? "").trim(),
			className: String(values.get("class") ?? "").trim(),
			kelasId: String(values.get("class") ?? "").trim(),
			attendanceNumber: String(values.get("attendanceNumber") ?? "").trim(),
			token: String(values.get("token") ?? "").trim(),
		};
		if (!data.name || !data.npm || !data.className || !data.attendanceNumber || !data.token) {
			setError("Lengkapi identitas dan token sebelum melanjutkan.");
			showToast("Lengkapi identitas dan token terlebih dahulu.", "warning");
			return;
		}
		setError("");
		setPendingLogin(data);
	}

	function confirmLogin() {
		if (!pendingLogin || redeemMutation.isPending) return;
		// TODO: remove mock auth fallback once auth procedure is implemented.
		if (useMockAuth) {
			if (pendingLogin.token !== mockAuthCredentials.participantToken) {
				showToast(`Gunakan token demo ${mockAuthCredentials.participantToken}.`, "error");
				return;
			}
			sessionStorage.setItem("webquiz-participant", JSON.stringify(pendingLogin));
			setPendingLogin(null);
			showToast("Login demo berhasil.", "success");
			router.push("/dashboard");
			return;
		}
		// Contract saat ini meminta kelas sebagai kelasId number, sedangkan UI
		// sengaja menerima kode kelas bebas seperti 3PA00. Cast ini hanya menjaga
		// client tetap bisa dikompilasi; backend akan memvalidasi mismatch tersebut.
		redeemMutation.mutate({
			code: pendingLogin.token,
			npm: pendingLogin.npm,
			name: pendingLogin.name,
			kelasId: pendingLogin.kelasId as unknown as number,
			attendanceNo: Number(pendingLogin.attendanceNumber),
		}, {
			onSuccess: ({ redirect }) => {
				sessionStorage.setItem("webquiz-participant", JSON.stringify(pendingLogin));
				setPendingLogin(null);
				showToast("Login berhasil.", "success");
				router.push(redirect === "/exam" ? "/dashboard" : redirect);
			},
			onError: () => showToast("Login belum dapat diproses. Coba lagi setelah layanan backend siap.", "error"),
		});
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
							<div><label htmlFor="class">Kelas</label><input aria-invalid={Boolean(error)} id="class" name="class" /></div>
							<div><label htmlFor="attendanceNumber">No. absen</label><input id="attendanceNumber" name="attendanceNumber" inputMode="numeric" aria-invalid={Boolean(error)} /></div>
						</div>
						<label htmlFor="token">Token</label>
						<input id="token" name="token" autoComplete="one-time-code" aria-invalid={Boolean(error)} />
						{(error || redeemMutation.error) && <p className="figma-form-error" role="alert">{error || "Login belum dapat diproses oleh server."}</p>}
						<button className="figma-submit" disabled={redeemMutation.isPending} type="submit">{redeemMutation.isPending ? <><span className="button-spinner" />Memeriksa...</> : "Masuk ke tes"}</button>
					</form>
				</GlassCard>
			</section>
			<footer className="figma-login-footer">LABORATORIUM PSIKOLOGI</footer>
			{pendingLogin && (
				<div className="modal-backdrop" onClick={() => setPendingLogin(null)}>
					<div aria-labelledby="participant-review-title" aria-modal="true" className="modal-card confirmation-dialog" onClick={(event) => event.stopPropagation()} role="dialog">
						<span aria-hidden="true" className="confirmation-icon confirmation-icon-warning">!</span>
						<h2 id="participant-review-title">Konfirmasi data praktikan</h2>
						<p className="modal-description">Pastikan data berikut sudah benar sebelum melanjutkan.</p>
						<dl className="login-review-list">
							<div className="login-review-item"><span className="login-review-icon"><ReviewIcon kind="user" /></span><div className="login-review-copy"><dt>Nama</dt><dd>{pendingLogin.name}</dd></div></div>
							<div className="login-review-item"><span className="login-review-icon"><ReviewIcon kind="id" /></span><div className="login-review-copy"><dt>NPM</dt><dd>{pendingLogin.npm}</dd></div></div>
							<div className="login-review-item"><span className="login-review-icon"><ReviewIcon kind="class" /></span><div className="login-review-copy"><dt>Kelas</dt><dd>{pendingLogin.className}</dd></div></div>
							<div className="login-review-item"><span className="login-review-icon"><ReviewIcon kind="number" /></span><div className="login-review-copy"><dt>No. Absen</dt><dd>{pendingLogin.attendanceNumber}</dd></div></div>
						</dl>
						<p className="modal-description">Apakah data di atas sudah benar?</p>
						<div className="modal-actions">
							<button className="secondary-button" onClick={() => setPendingLogin(null)} type="button">Periksa Lagi</button>
							<button className="primary-button" disabled={redeemMutation.isPending} onClick={confirmLogin} type="button">{redeemMutation.isPending ? <><span className="button-spinner" />Memeriksa...</> : "Ya, Lanjutkan"}</button>
						</div>
					</div>
				</div>
			)}
		</main>
	);
}
