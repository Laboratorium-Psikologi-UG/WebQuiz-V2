"use client";

import { useEffect, useState } from "react";
import { AdminRouteGuard, AdminSidebar } from "@/components/admin-ui";
import { useToast } from "@/components/toast";
import { GlassCard, QuizHeader } from "@/components/quiz-ui";
import { trpc } from "@/lib/trpc/client";
import {
  MOCK_API_ENABLED,
  mockCreateQuestion,
  mockCreateSession,
  mockCreateUser,
  mockDeleteQuestion,
  mockDeleteSession,
  mockDeleteUser,
  mockExportReports,
  mockListFeedback,
  mockListQuestions,
  mockListReports,
  mockListSessions,
  mockListUsers,
  mockMonitoring,
  mockUpdateQuestion,
  mockUpdateSession,
  mockUpdateUser,
} from "@/lib/mock-service";
import {
  MockParticipant, MockQuestion, MockResult,
  MockExamSession, MockAdminUser,
  mockExamSessions, mockQuestionBankSummary,
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
  const activeQuery = trpc.admin.monitoring.active.useQuery(undefined, { enabled: !MOCK_API_ENABLED, retry: false });
  const [mockRows, setMockRows] = useState(() => MOCK_API_ENABLED ? mockMonitoring() : []);
  const activeParticipants = MOCK_API_ENABLED ? mockRows : (activeQuery.data ?? []);
  const filteredActive = activeParticipants.filter((participant) => kelas === "Semua kelas" || participant.kelas === kelas);
  const refreshMonitoring = () => { if (MOCK_API_ENABLED) setMockRows(mockMonitoring()); else void activeQuery.refetch(); };

  return (
    <AdminPageShell page="monitoring">
      <AdminPageIntro eyebrow="Live overview" title="Monitoring user" description="Pantau status peserta yang sedang mengikuti sesi ujian secara real-time." action={<button className="secondary-button" onClick={refreshMonitoring}>Refresh data</button>} />
      <StatCards cards={[{ label: "Sedang mengerjakan", value: String(activeParticipants.length).padStart(2, "0") }, { label: "Status API", value: MOCK_API_ENABLED ? "OK" : activeQuery.isLoading ? "..." : activeQuery.error ? "ERR" : "OK" }, { label: "Pembaruan", value: "Live" }]} />
      <GlassCard className="admin-data-card">
        <div className="admin-panel-heading">
          <div><h2>Status peserta ujian</h2><p>Data aktif dari monitoring API.</p></div>
          <div className="admin-filter-group"><select aria-label="Pilih kelas" className="text-input admin-filter" onChange={(event) => setKelas(event.target.value)} value={kelas}><option>Semua kelas</option><option>3PA00</option><option>3PA01</option><option>3PA02</option></select><button className="secondary-button" onClick={refreshMonitoring}>Refresh data</button></div>
        </div>
        {!MOCK_API_ENABLED && activeQuery.error && <p className="empty-state" role="alert">Data monitoring belum dapat dimuat.</p>}
        <AdminTable headers={["Nama Praktikan", "NPM", "Kelas", "Aktivitas terakhir"]}>
          {filteredActive.map((p) => (
            <div className="admin-table admin-table-row" key={`${p.npm}-${p.lastActivityAt}`}>
              <strong>{p.name}</strong>
              <span>{p.npm}</span>
              <span>{p.kelas}</span>
              <span>{p.lastActivityAt}</span>
            </div>
          ))}
        </AdminTable>
        {(MOCK_API_ENABLED || (!activeQuery.isLoading && !activeQuery.error)) && filteredActive.length === 0 && <p className="empty-state">Belum ada peserta aktif.</p>}
      </GlassCard>
    </AdminPageShell>
  );
}

/* ── 2. Exam Management ────────────────────────────────────────── */

export function ExamManagementPage() {
  const { showToast } = useToast();
  const createPackMutation = trpc.admin.pack.create.useMutation();
  const [sessions, setSessions] = useState(() => MOCK_API_ENABLED ? mockListSessions() : mockExamSessions);
  const [deleteSessionTarget, setDeleteSessionTarget] = useState<string | null>(null);
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
    if (MOCK_API_ENABLED) {
      const next = editing ? mockUpdateSession(editing.id, session) : mockCreateSession(session);
      setSessions(mockListSessions());
      setShowForm(false);
      setEditing(null);
      setMessage("Sesi ujian berhasil disimpan.");
      showToast(next ? "Sesi ujian berhasil disimpan." : "Sesi tidak ditemukan.", next ? "success" : "error");
      return;
    }
    createPackMutation.mutate({ title: session.name, durationMinutes: 60 }, {
      onSuccess: () => {
        setSessions((cur) => editing ? cur.map((s) => s.id === editing.id ? session : s) : [...cur, session]);
        setShowForm(false);
        setEditing(null);
        setMessage("Sesi ujian berhasil disimpan.");
        showToast("Sesi ujian berhasil disimpan.", "success");
      },
      onError: () => showToast("Sesi ujian belum dapat disimpan.", "error"),
    });
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
                { label: "Hapus", danger: true, onClick: () => setDeleteSessionTarget(s.id) },
              ]} />
            </div>
          ))}
        </AdminTable>
        {sessions.length === 0 && <p className="empty-state">Tidak ada sesi ujian.</p>}
      </GlassCard>
      {deleteSessionTarget && <ConfirmDialog title="Hapus sesi ujian?" description="Sesi yang dihapus tidak dapat dipulihkan dari mock data." confirmLabel="Ya, Hapus" onCancel={() => setDeleteSessionTarget(null)} onConfirm={() => { if (MOCK_API_ENABLED) { mockDeleteSession(deleteSessionTarget); setSessions(mockListSessions()); } setDeleteSessionTarget(null); }} />}

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
              <button className="action-button-blue" disabled={createPackMutation.isPending} type="submit">{createPackMutation.isPending ? "Menyimpan..." : "Simpan sesi"}</button>
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
  const [items, setItems] = useState(() => MOCK_API_ENABLED ? mockListQuestions() : mockQuestionBankSummary);
  const [sessionFilter, setSessionFilter] = useState("Semua sesi");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const visibleItems = sessionFilter === "Semua sesi"
    ? items
    : items.filter((item) => item.session === sessionFilter);

  function removeItem(id: string) {
    if (MOCK_API_ENABLED) {
      mockDeleteQuestion(id);
      setItems(mockListQuestions());
    } else {
      setItems((cur) => cur.filter((i) => i.id !== id));
    }
  }

  function addQuestion() {
    if (MOCK_API_ENABLED) {
      mockCreateQuestion({ type: "Essay", count: 1, kelas: "3PA00", status: "Draft", session: "Quiz Praktikum", prompt: "Soal baru dari mock service" });
      setItems(mockListQuestions());
      showToast("Soal baru berhasil ditambahkan.", "success");
      return;
    }
    setItems((cur) => [...cur, { id: `qb-${Date.now()}`, type: "Pilihan Ganda", count: 0, kelas: "3PA01", status: "Draft", session: "Post-test Praktikum 02" }]);
  }

  function importQuestions() {
    if (MOCK_API_ENABLED) {
      ["Pilihan Ganda", "Essay", "Kasus"].forEach((type) => mockCreateQuestion({ type, count: 1, kelas: "3PA00", status: "Draft", session: "Quiz Praktikum", prompt: `Soal import ${type}` }));
      setItems(mockListQuestions());
      showToast("Import mock berhasil menambahkan 3 soal.", "success");
      return;
    }
    showToast("Import soal siap dihubungkan ke backend.", "info");
  }

  function editQuestion(item: (typeof items)[number]) {
    if (!MOCK_API_ENABLED) { showToast(`Edit ${item.type} siap dibuka.`, "info"); return; }
    const prompt = window.prompt("Isi soal", (item as { prompt?: string }).prompt ?? "");
    if (!prompt) return;
    mockUpdateQuestion(item.id, { ...item, prompt });
    setItems(mockListQuestions());
    showToast("Soal berhasil diperbarui.", "success");
  }

  return (
    <AdminPageShell page="question-bank">
      <AdminPageIntro
        eyebrow="Content studio"
        title="Question bank"
        description="Kelola soal pilihan ganda, essay, dan kasus untuk setiap sesi praktikum."
        action={
          <div className="admin-action-group">
            <button className="action-button-blue" onClick={importQuestions}>+ Import Soal</button>
            <button className="action-button-blue" onClick={addQuestion}>+ Tambah Soal</button>
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
                { label: "Edit", onClick: () => editQuestion(item) },
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
  const attemptsQuery = trpc.admin.report.attempts.useQuery({ packId: 1 }, { enabled: !MOCK_API_ENABLED, retry: false });
  const [mockReports] = useState(() => MOCK_API_ENABLED ? mockListReports() : []);
  const reports = MOCK_API_ENABLED ? mockReports : (attemptsQuery.data ?? []);
  const filtered = reports
    .filter((r) => kelas === "Semua kelas" || r.kelas === kelas)
    .filter((r) => Object.values(r).join(" ").toLowerCase().includes(search.toLowerCase()));
  function exportReports() {
    const rows = MOCK_API_ENABLED ? mockExportReports() : filtered.map((row) => [row.npm, row.name, row.kelas, row.score, row.passed]);
    const csv = [["NPM", "Nama", "Kelas", "Nilai", "Lulus"], ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "reports-mock.csv"; link.click(); URL.revokeObjectURL(url);
    showToast("Export laporan berhasil dibuat.", "success");
  }

  return (
    <AdminPageShell page="reports">
      <AdminPageIntro
        eyebrow="Reporting"
        title="Reports and grading"
        description="Tinjau hasil ujian, lakukan grading, dan siapkan laporan untuk tim laboratorium."
        action={<button className="action-button-blue" onClick={exportReports}>Export</button>}
      />
      <StatCards cards={[{ label: "Total respons", value: String(reports.length) }, { label: "Lulus", value: String(reports.filter((report) => report.passed).length) }, { label: "Belum tersedia", value: attemptsQuery.isLoading ? "..." : attemptsQuery.error ? "Error" : "0" }]} />
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
        {attemptsQuery.error && <p className="empty-state" role="alert">Laporan belum dapat dimuat.</p>}
        <AdminTable headers={["Nama Praktikan", "NPM", "Kelas", "Nilai", "Status"]}>
          {filtered.map((r) => (
            <div className="admin-table admin-table-row" key={r.npm}>
              <strong>{r.name}</strong>
              <span>{r.npm}</span>
              <span>{r.kelas}</span>
              <span>{r.score}</span>
              <span>{r.passed ? "Lulus" : "Belum lulus"}</span>
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
  const usersQuery = trpc.admin.user.list.useQuery(undefined, { enabled: !MOCK_API_ENABLED, retry: false });
  const createUserMutation = trpc.admin.user.create.useMutation();
  const setRoleMutation = trpc.admin.user.setRole.useMutation();
  const [mockUsers, setMockUsers] = useState(() => MOCK_API_ENABLED ? mockListUsers() : []);
  const users = MOCK_API_ENABLED ? mockUsers : (usersQuery.data ?? []);
  const [roleFilter, setRoleFilter] = useState("Semua role");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MockAdminUser | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<number | null>(null);

  function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const username = String(fd.get("username"));
    const role = String(fd.get("role"));
    const roleId = role === "Prog" ? 1 : role === "Staff/Structure" ? 2 : 3;
    if (MOCK_API_ENABLED) {
      if (editing && Number.isFinite(Number(editing.id))) mockUpdateUser(Number(editing.id), { username, role, status: String(fd.get("status")) });
      else mockCreateUser({ username, role, status: String(fd.get("status")) });
      setMockUsers(mockListUsers());
      setShowForm(false);
      setEditing(null);
      showToast("Data user berhasil disimpan.", "success");
      return;
    }
    const options = {
      onSuccess: () => { setShowForm(false); setEditing(null); showToast("Data user berhasil disimpan.", "success"); },
      onError: () => showToast("Data user belum dapat disimpan.", "error"),
    };
    if (editing && typeof editing.id === "number") setRoleMutation.mutate({ userId: editing.id, roleId }, options);
    else createUserMutation.mutate({ username, password: "temporary", roleId }, options);
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
                { label: "Edit", onClick: () => { setEditing({ id: String(u.id), username: u.username, role: u.role, status: u.status as "Aktif" | "Menunggu" }); setShowForm(true); } },
                { label: "Detail", onClick: () => showToast(`Detail user: ${u.username}`, "info") },
                { label: "Hapus", danger: true, onClick: () => setDeleteUserTarget(u.id) },
              ]} />
            </div>
          ))}
        </AdminTable>
        {filteredUsers.length === 0 && <p className="empty-state">Tidak ada user dengan role tersebut.</p>}
      </GlassCard>

      {deleteUserTarget !== null && <ConfirmDialog title="Hapus user?" description="User yang dihapus tidak dapat dipulihkan dari mock data." confirmLabel="Ya, Hapus" onCancel={() => setDeleteUserTarget(null)} onConfirm={() => { if (MOCK_API_ENABLED) setMockUsers(mockListUsers().filter((user) => user.id !== deleteUserTarget)); mockDeleteUser(deleteUserTarget); setDeleteUserTarget(null); }} />}

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

function groupMockFeedback(entries: ReturnType<typeof mockListFeedback>): FeedbackGroup[] {
  return Object.values(entries.reduce<Record<string, FeedbackGroup>>((groups, entry) => {
    const group = groups[entry.kelas] ?? { kelas: entry.kelas, entries: [] };
    group.entries.push({ kesan: entry.kesan, pesan: entry.pesan });
    groups[entry.kelas] = group;
    return groups;
  }, {}));
}

export function KesanPesanPage() {
  const [feedbackGroups, setFeedbackGroups] = useState(() => MOCK_API_ENABLED ? groupMockFeedback(mockListFeedback()) : mockFeedbackGroups);
  const [kelasFilter, setKelasFilter] = useState("Semua Kelas");

  useEffect(() => {
    if (MOCK_API_ENABLED) return;
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
