import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function GlassCard({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`glass-surface ${className}`.trim()}>{children}</div>;
}

/** Shared full-height stage that keeps participant cards centered and responsive. */
export function CenterStage({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`center-stage ${className}`.trim()}>{children}</section>;
}

export function QuizHeader({
  participantLabel,
  adminName,
  adminRole,
  logoutHref,
  contextLabel = "Pre-test Praktikum 02",
  timeLabel = "Sisa waktu: 12:32",
  actionLabel,
  actionHref,
  participantOnly = false,
  hideMeta = false,
  dashboardName,
}: {
  participantLabel?: string;
  adminName?: string;
  adminRole?: string;
  logoutHref?: string;
  contextLabel?: string;
  timeLabel?: string;
  actionLabel?: string;
  actionHref?: string;
  participantOnly?: boolean;
  hideMeta?: boolean;
  /** Nama praktikan ditampilkan besar di kanan header (khusus halaman dashboard) */
  dashboardName?: string;
}) {
  return (
    <header className="figma-login-header quiz-header">
      <Link className="figma-brand" href="/">
        <Image src="/figma/admin-building.jpeg" alt="Logo Laboratorium Psikologi" width={68} height={68} />
        <span><strong>QUIZ LABORATORIUM PSIKOLOGI</strong><small>LABORATORIUM PSIKOLOGI UNIVERSITAS GUNADARMA</small></span>
      </Link>
      {adminName && adminRole && logoutHref ? <div className="admin-header-user"><span><strong>{adminName}</strong><small>{adminRole}</small></span><Link className="figma-audience" href={logoutHref}>Logout</Link></div> : dashboardName ? <span className="quiz-header-name">{dashboardName}</span> : actionLabel && actionHref ? <Link className="figma-audience" href={actionHref}>{actionLabel}</Link> : hideMeta ? null : participantOnly ? <div className="exam-meta"><span>{participantLabel}</span></div> : <div className="exam-meta"><span>{participantLabel}</span><span>{contextLabel}</span><span className="time-note">{timeLabel}</span></div>}
    </header>
  );
}
