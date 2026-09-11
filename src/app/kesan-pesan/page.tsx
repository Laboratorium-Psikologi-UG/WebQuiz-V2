"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CenterStage, GlassCard, QuizHeader } from "@/components/quiz-ui";

type ParticipantSession = {
  className?: string;
};

export default function KesanPesanPage() {
  const router = useRouter();
  const [kesan, setKesan] = useState("");
  const [pesan, setPesan] = useState("");
  const [error, setError] = useState("");

  function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!kesan.trim() || !pesan.trim()) {
      setError("Isi kesan dan pesan sebelum menyelesaikan sesi.");
      return;
    }

    let className = "Tidak diketahui";
    try {
      const raw = sessionStorage.getItem("webquiz-participant");
      if (raw) className = (JSON.parse(raw) as ParticipantSession).className || className;
    } catch {
      // Gunakan fallback kelas tanpa membaca atau menyimpan identitas peserta.
    }

    // Data feedback sengaja hanya berisi kelas dan isi anonim—tanpa nama/NPM.
    const feedback = { className, kesan: kesan.trim(), pesan: pesan.trim() };
    const existing = JSON.parse(localStorage.getItem("webquiz-feedback") || "[]") as typeof feedback[];
    localStorage.setItem("webquiz-feedback", JSON.stringify([...existing, feedback]));
    router.push("/exam?status=selesai");
  }

  return (
    <main className="figma-login praktikan-figma-login">
      <QuizHeader hideMeta />
      <CenterStage className="figma-login-stage feedback-stage">
        <GlassCard className="figma-login-card feedback-card">
          <p className="eyebrow">Satu langkah terakhir</p>
          <h1 className="feedback-title">Kesan dan Pesan untuk Asisten Praktikum</h1>
          <p className="feedback-description">
            Ceritakan pengalaman Anda secara anonim. Identitas praktikan tidak akan ditampilkan kepada asisten atau admin; hanya kelas yang tercatat untuk membantu evaluasi.
          </p>
          <form className="feedback-form" onSubmit={submitFeedback}>
            <label htmlFor="kesan">Kesan</label>
            <textarea id="kesan" value={kesan} onChange={(event) => setKesan(event.target.value)} placeholder="Bagaimana pengalaman Anda selama praktikum?" />
            <label htmlFor="pesan">Pesan untuk asisten</label>
            <textarea id="pesan" value={pesan} onChange={(event) => setPesan(event.target.value)} placeholder="Apa yang ingin Anda sampaikan kepada asisten?" />
            {error && <p className="feedback-error" role="alert">{error}</p>}
            <button className="primary-button feedback-submit" type="submit">Kirim dan Selesai</button>
          </form>
        </GlassCard>
      </CenterStage>
      <footer className="figma-login-footer">LABORATORIUM PSIKOLOGI</footer>
    </main>
  );
}
