import Link from "next/link";
import { GlassCard, QuizHeader } from "@/components/quiz-ui";

export default function Home() {
  return (
    <main className="landing-page">
      <QuizHeader hideMeta />
      <section className="landing-content">
        <GlassCard className="landing-card">
          <p className="eyebrow">Ruang asesmen praktikum</p>
          <h1>Sistem Pre-test &amp; Post-test Praktikum Laboratorium Psikologi Universitas Gunadarma</h1>
          <p className="landing-description">Platform terpusat untuk mengerjakan soal praktikum dengan alur yang jelas, tenang, dan mudah digunakan oleh praktikan maupun tim laboratorium.</p>
          <div className="landing-actions">
            <Link className="primary-button" href="/login">Masuk sebagai Praktikan</Link>
            <Link className="secondary-button" href="/admin/login">Masuk sebagai Admin</Link>
          </div>
        </GlassCard>
      </section>
      <footer className="landing-footer">LABORATORIUM PSIKOLOGI</footer>
    </main>
  );
}
