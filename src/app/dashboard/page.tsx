"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CenterStage, GlassCard, ParticipantRouteGuard, QuizHeader } from "@/components/quiz-ui";

type Participant = {
  name: string;
  npm: string;
  className: string;
  attendanceNumber: string;
  token: string;
};

type SessionCard = {
  id: "quiz" | "post-test";
  title: string;
  description: string;
  cta: string;
};

const SESSION_CARDS: SessionCard[] = [
  {
    id: "quiz",
    title: "Quiz",
    description:
      "Evaluasi singkat setelah sesi praktikum untuk merefleksikan pemahaman Anda melalui lima soal essay.",
    cta: "Mulai Quiz",
  },
  {
    id: "post-test",
    title: "Post-Test",
    description:
      "Platform terpusat untuk mengerjakan soal praktikum dengan alur yang jelas, tenang, dan mudah digunakan oleh praktikan maupun tim laboratorium.",
    cta: "Mulai Post-Test",
  },
];

export default function PraktikanDashboardPage() {
  const [participantName, setParticipantName] = useState("Praktikan");

  useEffect(() => {
    const syncId = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem("webquiz-participant");
        if (raw) setParticipantName((JSON.parse(raw) as Participant).name ?? "Praktikan");
      } catch {
        // sessionStorage tidak tersedia atau data rusak
      }
    }, 0);
    return () => window.clearTimeout(syncId);
  }, []);

  return (
    <ParticipantRouteGuard>
    <main className="figma-login praktikan-figma-login praktikan-dashboard-page">
      <QuizHeader dashboardName={participantName} />

      <CenterStage className="praktikan-dashboard-stage figma-login-stage">
        <div className="praktikan-dashboard-grid">
          {SESSION_CARDS.map((card) => (
            <GlassCard key={card.id} className="praktikan-session-card figma-login-card">
              <h2 className="praktikan-session-title">{card.title}</h2>
              <p className="praktikan-session-desc">{card.description}</p>
              <Link
                href={`/exam?sesi=${card.id}`}
                className="figma-submit praktikan-session-btn"
              >
                {card.cta}
              </Link>
            </GlassCard>
          ))}
        </div>
      </CenterStage>

      <footer className="figma-login-footer">LABORATORIUM PSIKOLOGI</footer>
    </main>
    </ParticipantRouteGuard>
  );
}
