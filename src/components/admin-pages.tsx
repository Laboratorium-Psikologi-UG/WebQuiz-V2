"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/admin-ui";
import { GlassCard, QuizHeader } from "@/components/quiz-ui";
import {
  MockParticipant, MockQuestion, MockResult,
  MockExamSession, QuestionBankSummary, MockAdminUser,
  mockParticipants, mockQuestions, mockResults,
  mockExamSessions, mockQuestionBankSummary, mockAdminUsers,
} from "@/lib/mock-data";

type PageKey = "monitoring" | "exam-management" | "question-bank" | "reports" | "users-and-roles";

/* ── Shell & intro (unchanged) ─────────────────────────────────── */

export function AdminPageShell({ page, children }: { page: PageKey; children: React.ReactNode }) {
  return <main className="admin-dashboard-shell"><QuizHeader adminName="PROG" adminRole="superadmin" logoutHref="/admin/login" /><div className="admin-dashboard-body"><AdminSidebar /><section className="admin-dashboard-content">{children}</section></div><footer className="admin-dashboard-footer">LABORATORIUM PSIKOLOGI</footer><span className="admin-page-key" data-page={page} /></main>;
}

export function AdminPageIntro({ eyebrow = "Overview", title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="admin-dashboard-intro"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

/* ── Shared primitives ─────────────────────────────────────────── */

/** Text-link actions for Aksi column (replaces icon buttons) */
function TextActions({ actions }: { actions: Array<{ label: string; danger?: boolean; onClick: () => void }> }) {
  return (
    <div className="admin-row-actions text-actions">
      {actions.map((a) => (
        <button key={a.label} className={`action-link${a.danger ? " action-link-danger" : ""}`} onClick={a.onClick}>{a.label}</button>
      ))}
    </div>
  );
}

function AdminTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  const cols = headers.length;
  return <div className="admin-table-wrap" style={{ "--admin-cols": cols } as React.CSSProperties}><div className="admin-table admin-table-header" role="row">{headers.map((header) => <strong key={header}>{header}</strong>)}</div>{children}</div>;
}

function StatCards({ cards }: { cards: Array<{ label: string; value: string }> }) {
  return <div className="admin-dashboard-overview admin-stat-cards">{cards.map((card) => <GlassCard className="admin-stat-card" key={card.label}><span className="admin-overview-label">{card.label}</span><strong>{card.value}</strong></GlassCard>)}</div>;
}

/* ── 1. Monitoring ─────────────────────────────────────────────── */

export function MonitoringPage() {
  const [kelas, setKelas] = useState("Semua kelas");
  const filtered = mockParticipants.filter((p) => kelas === "Semua kelas" || p.kelas === kelas);

  return (
    <AdminPageShell page="monitoring">
      <AdminPageIntro eyebrow="Live overview" title="Monitoring user" description="Pantau status peserta yang sedang mengikuti sesi ujian secara real-time." action={<button className="secondary-button" onClick={() => setKelas("Semua kelas")}>Refresh data</button>} />
      <StatCards cards={[{ label: "Sedang mengerjakan", value: "02" }, { label: "Selesai", value: "01" }, { label: "Belum mulai", value: "08" }]} />
      <GlassCard className="admin-data-card">
        <div className="admin-panel-heading">
          <div><h2>Status peserta ujian</h2><p>Progress peserta berdasarkan sesi yang sedang aktif.</p></div>
          <select aria-label="Pilih kelas" className="text-input admin-filter" onChange={(e) => setKelas(e.target.value)} value={kelas}>
            <option>Semua kelas</option>
            <option>3PA01</option>
            <option>3PA02</option>
          </select>
        </div>
        <AdminTable headers={["Nama Praktikan", "NPM", "Sesi", "Status"]}>
          {filtered.map((p) => (
            <div className="admin-table admin-table-row" key={p.id}>
              <strong>{p.name}</strong>
              <span>{p.npm}</span>
              <span>{p.exam}</span>
              <span>{p.progress}</span>
            </div>
          ))}
        </AdminTable>
        {filtered.length === 0 && <p className="empty-state">Tidak ada peserta untuk kelas tersebut.</p>}
      </GlassCard>
    </AdminPageShell>
  );
}

/* ── 2. Exam Management ────────────────────────────────────────── */

export function ExamManagementPage() {
  const [sessions, setSessions] = useState(mockExamSessions);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MockExamSession | null>(null);
  const [message, setMessage] = useState("");

  function saveSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const session: MockExamSession = {
      id: editing?.id ?? `exam-${Date.now()}`,
      name: String(fd.get("name")),
      status: String(fd.get("status")) as MockExamSession["status"],
      token: String(fd.get("token")),
    };
    setSessions((cur) => editing ? cur.map((s) => s.id === editing.id ? session : s) : [...cur, session]);
    setShowForm(false);
    setEditing(null);
    setMessage("Sesi ujian berhasil disimpan.");
  }

  return (
    <AdminPageShell page="exam-management">
      <AdminPageIntro eyebrow="Exam workspace" title="Exam management" description="Buat, jadwalkan, dan kelola akses sesi ujian praktikum." action={<button className="action-button-blue" onClick={() => { setEditing(null); setShowForm(true); }}>+ Tambah Sesi</button>} />
      {message && <p className="admin-inline-message" role="status">{message}</p>}
      <GlassCard className="admin-data-card">
        <div className="admin-panel-heading">
          <div><h2>Daftar sesi ujian</h2><p>Atur sesi, token akses, dan status setiap sesi.</p></div>
        </div>
        <AdminTable headers={["Nama Sesi", "Status", "Token", "Aksi"]}>
          {sessions.map((s) => (
            <div className="admin-table admin-table-row" key={s.id}>
              <strong>{s.name}</strong>
              <span>{s.status}</span>
              <span className="token-value">{s.token}</span>
              <TextActions actions={[
                { label: "Edit", onClick: () => { setEditing(s); setShowForm(true); } },
                { label: "Detail", onClick: () => window.alert(`Detail sesi: ${s.name}`) },
              ]} />
            </div>
          ))}
        </AdminTable>
        {sessions.length === 0 && <p className="empty-state">Tidak ada sesi ujian.</p>}
      </GlassCard>

      {showForm && (
        <div className="modal-backdrop" onClick={() => { setShowForm(false); setEditing(null); }}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={saveSession}>
            <button aria-label="Tutup form sesi" className="modal-close" onClick={() => { setShowForm(false); setEditing(null); }} type="button">×</button>
            <p className="eyebrow">Exam management</p>
            <h2>{editing ? "Edit sesi ujian" : "Buat sesi ujian"}</h2>
            <label className="field-label" htmlFor="session-name">Nama sesi</label>
            <input className="text-input" defaultValue={editing?.name} id="session-name" name="name" required />
            <label className="field-label editor-label" htmlFor="session-token">Token akses</label>
            <input className="text-input" defaultValue={editing?.token} id="session-token" name="token" required />
            <label className="field-label editor-label" htmlFor="session-status">Status</label>
            <select className="text-input" defaultValue={editing?.status ?? "Aktif"} id="session-status" name="status">
              <option>Aktif</option>
              <option>Nonaktif</option>
            </select>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => { setShowForm(false); setEditing(null); }} type="button">Batal</button>
              <button className="action-button-blue" type="submit">Simpan sesi</button>
            </div>
          </form>
        </div>
      )}
    </AdminPageShell>
  );
}

/* ── 3. Question Bank ──────────────────────────────────────────── */

export function QuestionBankPage() {
  const [items, setItems] = useState(mockQuestionBankSummary);
  const [sessionFilter, setSessionFilter] = useState("Semua sesi");

  function removeItem(id: string) { setItems((cur) => cur.filter((i) => i.id !== id)); }

  return (
    <AdminPageShell page="question-bank">
      <AdminPageIntro
        eyebrow="Content studio"
        title="Question bank"
        description="Kelola soal pilihan ganda, essay, dan kasus untuk setiap sesi praktikum."
        action={
          <div className="admin-action-group">
            <button className="action-button-blue" onClick={() => window.alert("Import soal: fitur siap dihubungkan ke backend.")}>+ Import Soal</button>
            <button className="action-button-blue" onClick={() => setItems((cur) => [...cur, { id: `qb-${Date.now()}`, type: "Pilihan Ganda", count: 0, kelas: "3PA01", status: "Draft" }])}>+ Tambah Soal</button>
          </div>
        }
      />
      <GlassCard className="admin-data-card">
        <div className="admin-panel-heading">
          <div><h2>Rekap soal per tipe</h2><p>Gunakan filter untuk meninjau tipe soal dan statusnya.</p></div>
          <select aria-label="Pilih sesi" className="text-input admin-filter" onChange={(e) => setSessionFilter(e.target.value)} value={sessionFilter}>
            <option>Semua sesi</option>
            <option>Pre-test Eksperimen</option>
            <option>Post-test Praktikum 02</option>
          </select>
        </div>
        <AdminTable headers={["Tipe Soal", "Jumlah Soal", "Kelas", "Status", "Aksi"]}>
          {items.map((item) => (
            <div className="admin-table admin-table-row" key={item.id}>
              <strong>{item.type}</strong>
              <span>{item.count}</span>
              <span>{item.kelas}</span>
              <span>{item.status}</span>
              <TextActions actions={[
                { label: "Edit", onClick: () => window.alert(`Edit ${item.type}`) },
                { label: "Detail", onClick: () => window.alert(`Detail ${item.type}`) },
                { label: "Hapus", danger: true, onClick: () => removeItem(item.id) },
              ]} />
            </div>
          ))}
        </AdminTable>
        {items.length === 0 && <p className="empty-state">Tidak ada soal dengan filter tersebut.</p>}
      </GlassCard>
    </AdminPageShell>
  );
}

/* ── 4. Reports ────────────────────────────────────────────────── */

export function ReportsPage() {
  const [search, setSearch] = useState("");
  const [kelas, setKelas] = useState("Semua kelas");
  const filtered = mockResults
    .filter((r) => kelas === "Semua kelas" || r.kelas === kelas)
    .filter((r) => Object.values(r).join(" ").toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminPageShell page="reports">
      <AdminPageIntro
        eyebrow="Reporting"
        title="Reports and grading"
        description="Tinjau hasil ujian, lakukan grading, dan siapkan laporan untuk tim laboratorium."
        action={<button className="action-button-blue" onClick={() => window.alert("Export siap dihubungkan ke backend.")}>Export</button>}
      />
      <StatCards cards={[{ label: "Total respons", value: "278" }, { label: "Sudah dinilai", value: "242" }, { label: "Perlu grading", value: "36" }]} />
      <GlassCard className="admin-data-card">
        <div className="admin-panel-heading">
          <div><h2>Hasil ujian</h2><p>Review hasil peserta dan buka detail grading.</p></div>
          <div className="admin-filter-group">
            <input aria-label="Cari hasil ujian" className="text-input admin-filter" onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama atau NPM..." value={search} />
            <select aria-label="Pilih kelas" className="text-input admin-filter" onChange={(e) => setKelas(e.target.value)} value={kelas}>
              <option>Semua kelas</option>
              <option>3PA01</option>
              <option>3PA02</option>
            </select>
          </div>
        </div>
        <AdminTable headers={["Nama Praktikan", "NPM", "Sesi", "Kelas", "Status"]}>
          {filtered.map((r) => (
            <div className="admin-table admin-table-row" key={r.npm}>
              <strong>{r.participant}</strong>
              <span>{r.npm}</span>
              <span>{r.session}</span>
              <span>{r.kelas}</span>
              <span>{r.status}</span>
            </div>
          ))}
        </AdminTable>
        {filtered.length === 0 && <p className="empty-state">Tidak ada hasil yang cocok.</p>}
      </GlassCard>
    </AdminPageShell>
  );
}

/* ── 5. Users and Roles ────────────────────────────────────────── */

export function UsersAndRolesPage() {
  const [users, setUsers] = useState(mockAdminUsers);
  const [roleFilter, setRoleFilter] = useState("Semua role");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MockAdminUser | null>(null);

  function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const user: MockAdminUser = {
      id: editing?.id ?? `user-${Date.now()}`,
      username: String(fd.get("username")),
      role: String(fd.get("role")),
      status: String(fd.get("status")) as MockAdminUser["status"],
    };
    setUsers((cur) => editing ? cur.map((u) => u.id === editing.id ? user : u) : [...cur, user]);
    setShowForm(false);
    setEditing(null);
  }

  const filteredUsers = users.filter((u) => roleFilter === "Semua role" || u.role === roleFilter);

  return (
    <AdminPageShell page="users-and-roles">
      <AdminPageIntro eyebrow="Access control" title="Users and roles" description="Kelola akun admin dan akses tim laboratorium sesuai tanggung jawabnya." action={<button className="action-button-blue" onClick={() => { setEditing(null); setShowForm(true); }}>+ Tambah Role</button>} />
      <GlassCard className="admin-data-card">
        <div className="admin-panel-heading">
          <div><h2>Admin users</h2><p>Prog memiliki akses penuh; Staff/Structure mengelola ujian; Assistant menangani reports dan grading.</p></div>
          <select aria-label="Filter role admin" className="text-input admin-filter" onChange={(e) => setRoleFilter(e.target.value)} value={roleFilter}>
            <option>Semua role</option>
            <option>Prog</option>
            <option>Staff/Structure</option>
            <option>Assistant</option>
          </select>
        </div>
        <AdminTable headers={["Username", "Role", "Status", "Aksi"]}>
          {filteredUsers.map((u) => (
            <div className="admin-table admin-table-row" key={u.id}>
              <strong>{u.username}</strong>
              <span>{u.role}</span>
              <span>{u.status}</span>
              <TextActions actions={[
                { label: "Detail", onClick: () => window.alert(`Detail user: ${u.username}`) },
              ]} />
            </div>
          ))}
        </AdminTable>
        {filteredUsers.length === 0 && <p className="empty-state">Tidak ada user dengan role tersebut.</p>}
      </GlassCard>

      {showForm && (
        <div className="modal-backdrop" onClick={() => { setShowForm(false); setEditing(null); }}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={saveUser}>
            <button aria-label="Tutup form" className="modal-close" onClick={() => { setShowForm(false); setEditing(null); }} type="button">×</button>
            <p className="eyebrow">Access control</p>
            <h2>{editing ? "Edit role" : "Tambah role"}</h2>
            <label className="field-label" htmlFor="user-username">Username</label>
            <input className="text-input" defaultValue={editing?.username} id="user-username" name="username" required />
            <label className="field-label editor-label" htmlFor="user-role">Role</label>
            <select className="text-input" defaultValue={editing?.role ?? "Assistant"} id="user-role" name="role">
              <option>Prog</option>
              <option>Staff/Structure</option>
              <option>Assistant</option>
            </select>
            <label className="field-label editor-label" htmlFor="user-status">Status</label>
            <select className="text-input" defaultValue={editing?.status ?? "Aktif"} id="user-status" name="status">
              <option>Aktif</option>
              <option>Menunggu</option>
            </select>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => { setShowForm(false); setEditing(null); }} type="button">Batal</button>
              <button className="action-button-blue" type="submit">Simpan</button>
            </div>
          </form>
        </div>
      )}
    </AdminPageShell>
  );
}

export type { MockParticipant, MockQuestion, MockResult };
