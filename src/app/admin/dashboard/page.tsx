import Link from "next/link";
import { AdminSidebar } from "@/components/admin-ui";
import { GlassCard, QuizHeader } from "@/components/quiz-ui";

const recentExams = [
  ["Pre-test Psikologi Eksperimen", "124 peserta", "Berjalan"],
  ["Post-test Praktikum 02", "56 peserta", "Terjadwal"],
  ["Pre-test Praktikum 01", "98 peserta", "Selesai"],
];

const overviewCards = [
  { label: "Quiz aktif", value: "06", action: "Kelola sesi quiz", href: "/admin/exam-management", featured: true },
  { label: "Quiz taken", value: "78", action: "Buka hasil quiz", href: "/admin/reports" },
  { label: "Praktikan", value: "128", action: "Buka monitoring", href: "/admin/monitoring" },
];

export default function AdminDashboardPage() {
  return (
    <main className="admin-dashboard-shell">
      <QuizHeader adminName="PROG" adminRole="superadmin" logoutHref="/admin/login" />
      <div className="admin-dashboard-body">
        <AdminSidebar />
        <section className="admin-dashboard-content">
          <div className="admin-dashboard-intro">
            <div><p className="eyebrow">Overview</p><h1>Dashboard</h1><p>Pantau sesi ujian dan aktivitas praktikan dari satu tempat.</p></div>
            <Link className="primary-button" href="/admin/exam-management">Buat sesi ujian</Link>
          </div>
          <div className="admin-dashboard-overview">
            {overviewCards.map((card) => <Link className={`admin-overview-card ${card.featured ? "featured" : ""}`} href={card.href} key={card.label}><span className="admin-overview-label">{card.label}</span><strong>{card.value}</strong><span className="admin-overview-action">{card.action} -&gt;</span></Link>)}
          </div>
          <GlassCard className="admin-activity-card">
            <div className="admin-panel-heading"><div><h2>Aktivitas ujian terbaru</h2><p>Ringkasan sesi ujian yang paling baru diperbarui.</p></div><Link className="text-button" href="/admin/exam-management">Lihat semua</Link></div>
            <div className="admin-activity-table" role="table" aria-label="Aktivitas ujian terbaru">
              {recentExams.map(([name, participants, status]) => <div className="admin-activity-row" key={name}><strong>{name}</strong><span>{participants}</span><span className="status-chip">{status}</span></div>)}
            </div>
          </GlassCard>
        </section>
      </div>
      <footer className="admin-dashboard-footer">LABORATORIUM PSIKOLOGI</footer>
    </main>
  );
}