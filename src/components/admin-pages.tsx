"use client";

import { useEffect, useState } from "react";
import { AdminRouteGuard, AdminSidebar } from "@/components/admin-ui";
import { useToast } from "@/components/toast";
import { GlassCard, QuizHeader } from "@/components/quiz-ui";
import {
  MockParticipant, MockQuestion, MockResult,
  MockExamSession, MockAdminUser,
  mockParticipants, mockResults,
  mockExamSessions, mockQuestionBankSummary, mockAdminUsers,
} from "@/lib/mock-data";

type PageKey = "monitoring" | "exam-management" | "question-bank" | "reports" | "users-and-roles" | "kesan-pesan";

/* ── Shell & intro (unchanged) ─────────────────────────────────── */

export function AdminPageShell({ page, children }: { page: PageKey; children: React.ReactNode }) {
  return <AdminRouteGuard><main className="admin-dashboard-shell"><QuizHeader adminName="PROG" adminRole="superadmin" logoutHref="/admin/login" /><div className="admin-dashboard-body"><AdminSidebar /><section className="admin-dashboard-content">{children}</section></div><footer className="admin-dashboard-footer">LABORATORIUM PSIKOLOGI</footer><span className="admin-page-key" data-page={page} /></main></AdminRouteGuard>;
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

function ConfirmDialog({ title, description, confirmLabel, onCancel, onConfirm }: { title: string; description: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void }) {
  return <div className="modal-backdrop" onClick={onCancel}><div className="modal-card confirmation-dialog" onClick={(event) => event.stopPropagation()}><span aria-hidden="true" className="confirmation-icon confirmation-icon-warning">!</span><h2>{title}</h2><p>{description}</p><div className="modal-actions"><button className="secondary-button" onClick={onCancel} type="button">Batal</button><button className="danger-button" onClick={onConfirm} type="button">{confirmLabel}</button></div></div></div>;
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
  const { showToast } = useToast();
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
                { label: "Detail", onClick: () => showToast(`Detail sesi: ${s.name}`, "info") },
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
  const { showToast } = useToast();
  const [items, setItems] = useState(mockQuestionBankSummary);
  const [sessionFilter, setSessionFilter] = useState("Semua sesi");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const visibleItems = sessionFilter === "Semua sesi"
    ? items
    : items.filter((item) => item.session === sessionFilter);

  function removeItem(id: string) { setItems((cur) => cur.filter((i) => i.id !== id)); }

  return (
    <AdminPageShell page="question-bank">
      <AdminPageIntro
        eyebrow="Content studio"
        title="Question bank"
        description="Kelola soal pilihan ganda, essay, dan kasus untuk setiap sesi praktikum."
        action={
          <div className="admin-action-group">
            <button className="action-button-blue" onClick={() => showToast("Import soal siap dihubungkan ke backend.", "info")}>+ Import Soal</button>
            <button className="action-button-blue" onClick={() => setItems((cur) => [...cur, { id: `qb-${Date.now()}`, type: "Pilihan Ganda", count: 0, kelas: "3PA01", status: "Draft", session: "Post-test Praktikum 02" }])}>+ Tambah Soal</button>
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
          {visibleItems.map((item) => (
            <div className="admin-table admin-table-row" key={item.id}>
              <strong>{item.type}</strong>
              <span>{item.count}</span>
              <span>{item.kelas}</span>
              <span>{item.status}</span>
              <TextActions actions={[
                { label: "Edit", onClick: () => showToast(`Edit ${item.type} siap dibuka.`, "info") },
                { label: "Detail", onClick: () => showToast(`Detail ${item.type} siap dibuka.`, "info") },
                { label: "Hapus", danger: true, onClick: () => setDeleteTarget(item.id) },
              ]} />
            </div>
          ))}
        </AdminTable>
        {visibleItems.length === 0 && <p className="empty-state">Tidak ada soal dengan filter tersebut.</p>}
      </GlassCard>
      {deleteTarget && <ConfirmDialog title="Hapus data soal?" description="Data yang dihapus tidak dapat dipulihkan dari prototype ini." confirmLabel="Ya, Hapus" onCancel={() => setDeleteTarget(null)} onConfirm={() => { removeItem(deleteTarget); setDeleteTarget(null); }} />}
    </AdminPageShell>
  );
}

/* ── 4. Reports ────────────────────────────────────────────────── */

export function ReportsPage() {
  const { showToast } = useToast();
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
        action={<button className="action-button-blue" onClick={() => showToast("Export laporan siap dihubungkan ke backend.", "info")}>Export</button>}
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
  const { showToast } = useToast();
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
                { label: "Detail", onClick: () => showToast(`Detail user: ${u.username}`, "info") },
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

type FeedbackGroup = {
  kelas: string;
  entries: Array<{ kesan: string; pesan: string }>;
};

const mockFeedbackGroups: FeedbackGroup[] = [
  {
    kelas: "3PA00",
    entries: [
      { kesan: "Materi praktikum membantu saya memahami konsep dengan lebih terarah.", pesan: "Semoga contoh kasus dapat ditambah pada sesi berikutnya." },
      { kesan: "Alur praktikum cukup jelas dan suasananya nyaman.", pesan: "Terima kasih sudah mendampingi proses belajar kami." },
    ],
  },
  {
    kelas: "3PA01",
    entries: [
      { kesan: "Saya jadi lebih percaya diri untuk membaca hasil observasi.", pesan: "Penjelasan asisten sudah mudah diikuti." },
      { kesan: "Quiz membantu mengingat kembali materi setelah praktikum.", pesan: "Waktu diskusi singkat bisa ditambah." },
    ],
  },
  {
    kelas: "3PA02",
    entries: [
      { kesan: "Praktikum terasa interaktif dan tidak monoton.", pesan: "Terima kasih atas feedback selama sesi berlangsung." },
    ],
  },
];

export function KesanPesanPage() {
  const [feedbackGroups, setFeedbackGroups] = useState(mockFeedbackGroups);
  const [kelasFilter, setKelasFilter] = useState("Semua Kelas");

  useEffect(() => {
    const syncId = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem("webquiz-feedback");
        if (!stored) return;
        const localEntries = JSON.parse(stored) as Array<{ className?: string; kesan?: string; pesan?: string }>;
        if (!Array.isArray(localEntries)) return;
        setFeedbackGroups((current) => {
          const merged = current.map((group) => ({ ...group, entries: [...group.entries] }));
          for (const entry of localEntries) {
            if (!entry.className || !entry.kesan || !entry.pesan) continue;
            const group = merged.find((item) => item.kelas === entry.className);
            if (group) group.entries.push({ kesan: entry.kesan, pesan: entry.pesan });
            else merged.push({ kelas: entry.className, entries: [{ kesan: entry.kesan, pesan: entry.pesan }] });
          }
          return merged;
        });
      } catch {
        // Abaikan localStorage yang rusak; dummy feedback tetap tampil.
      }
    }, 0);
    return () => window.clearTimeout(syncId);
  }, []);

  const kelasOptions = ["Semua Kelas", ...feedbackGroups.map((group) => group.kelas)];
  const visibleGroups = kelasFilter === "Semua Kelas"
    ? feedbackGroups
    : feedbackGroups.filter((group) => group.kelas === kelasFilter);

  const { showToast } = useToast();

  function exportFeedback() {
    const rows = visibleGroups.flatMap((group) => group.entries.map((entry) => [group.kelas, entry.kesan, entry.pesan]));
    const csv = [
      ["Kelas", "Kesan", "Pesan"],
      ...rows,
    ].map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = kelasFilter === "Semua Kelas" ? "kesan-pesan-semua-kelas.csv" : `kesan-pesan-${kelasFilter}.csv`;
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Export ${filename} berhasil dibuat.`, "success");
  }

  return (
    <AdminPageShell page="kesan-pesan">
      <AdminPageIntro
        eyebrow="Anonymous feedback"
        title="Kesan dan Pesan"
        description="Baca masukan praktikan berdasarkan kelas tanpa menampilkan identitas pengirim."
        action={
          <div className="feedback-admin-actions">
            <label className="feedback-admin-filter-label" htmlFor="feedback-class-filter">Kelas</label>
            <select className="text-input feedback-admin-filter" id="feedback-class-filter" onChange={(event) => setKelasFilter(event.target.value)} value={kelasFilter}>
              {kelasOptions.map((kelas) => <option key={kelas}>{kelas}</option>)}
            </select>
            <button className="action-button-blue" onClick={exportFeedback}>Export</button>
          </div>
        }
      />
      <div className="feedback-admin-groups">
        {visibleGroups.map((group) => (
          <GlassCard className="admin-data-card feedback-admin-group" key={group.kelas}>
            <details open>
              <summary className="feedback-admin-heading">
                <span><strong>{group.kelas}</strong><small>{group.entries.length} respons anonim</small></span>
                <span aria-hidden="true">⌄</span>
              </summary>
              <div className="feedback-admin-list">
                {group.entries.map((entry, index) => (
                  <article className="feedback-admin-entry" key={`${group.kelas}-${index}`}>
                    <p><strong>Kesan</strong>{entry.kesan}</p>
                    <p><strong>Pesan</strong>{entry.pesan}</p>
                  </article>
                ))}
              </div>
            </details>
          </GlassCard>
        ))}
      </div>
    </AdminPageShell>
  );
}

export type { MockParticipant, MockQuestion, MockResult };
