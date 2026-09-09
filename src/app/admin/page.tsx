"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MockQuestion, mockParticipants, mockQuestions, mockRole } from "@/lib/mock-data";

type Section = "Dashboard" | "Users & Roles" | "Monitoring" | "Exam Management" | "Question Bank" | "Reports";

const menuItems: Array<[string, Section]> = [["H", "Dashboard"], ["U", "Users & Roles"], ["M", "Monitoring"], ["E", "Exam Management"], ["Q", "Question Bank"], ["R", "Reports"]];
const exams = [["Pre-test Psikologi Eksperimen", "124 peserta", "Berjalan"], ["Post-test Praktikum 02", "56 peserta", "Terjadwal"], ["Pre-test Praktikum 01", "98 peserta", "Selesai"]];
const users = [["Prog", "Prog", "Aktif"], ["Staff and Structure", "Admin", "Aktif"], ["Asisten", "Asisten", "Menunggu"]];

export default function AdminPage() {
  const router = useRouter();
  const [section, setSection] = useState<Section>("Dashboard");
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState("");
  const [questions, setQuestions] = useState<MockQuestion[]>(mockQuestions);
  const [editingQuestion, setEditingQuestion] = useState<MockQuestion | null>(null);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function createExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowModal(false);
    notify("Sesi ujian berhasil disimpan sebagai draft.");
  }

  function renderContent() {
    if (section === "Dashboard") return <Dashboard onCreate={() => setShowModal(true)} onNavigate={setSection} />;
    if (section === "Users & Roles") return <DataSection title="Users & Roles Management" description="Kelola akses staf yang membantu operasional laboratorium." columns={["Nama pengguna", "Role", "Status"]} rows={users} action="Tambah pengguna" onAction={() => notify("Form pengguna siap dihubungkan ke API admin.")} />;
    if (section === "Monitoring") return <DataSection title="Monitoring User" description="Lihat sesi peserta yang sedang berjalan tanpa mengganggu pengalaman mengerjakan." columns={["Peserta", "Ujian", "Progress"]} rows={mockParticipants.map((participant) => [`${participant.npm} · ${participant.name}`, participant.exam, participant.progress])} action="Refresh data" onAction={() => notify("Data monitoring diperbarui.")} />;
    if (section === "Exam Management") return <DataSection title="Exam Management" description="Buat sesi, atur akses token, dan pantau status publikasi ujian." columns={["Nama sesi", "Peserta", "Status"]} rows={exams} action="Buat sesi ujian" onAction={() => setShowModal(true)} />;
    if (section === "Question Bank") return <QuestionBank questions={questions} onAdd={() => setEditingQuestion({ id: `q-${Date.now()}`, prompt: "", type: "multiple-choice", options: ["", "", "", ""], status: "Draft" })} onEdit={setEditingQuestion} />;
    return <Reports filter={filter} setFilter={setFilter} onExport={() => notify("Export CSV dibuat sebagai prototype. Backend export belum diaktifkan.")} />;
  }

  return <main className="admin-shell"><aside className="admin-sidebar"><Link className="brand-lockup" href="/"><span className="brand-mark">W</span><span>WebQuiz Admin</span></Link><div className="sidebar-section-label">Workspace</div><nav className="sidebar-nav" aria-label="Admin menu">{menuItems.map(([icon, label]) => <button className={`sidebar-link ${section === label ? "active" : ""}`} key={label} onClick={() => setSection(label)}><span className="nav-glyph" aria-hidden="true">{icon}</span><span>{label}</span></button>)}</nav><div className="sidebar-footer">WebQuiz v2.0 · Lab Psikologi<br /><button className="logout-link" onClick={() => router.push("/admin/login")}>Keluar dari panel</button></div></aside><div className="admin-main"><header className="admin-header"><div><p className="admin-kicker">Admin workspace</p><h1>{section}</h1><p>{section === "Dashboard" ? "Ringkasan aktivitas platform hari ini." : "Kelola data dengan ritme kerja yang jelas."}</p></div><div className="admin-user"><span className="avatar">{mockRole}</span><span>{mockRole}</span><button aria-label="Buka menu profil" className="icon-button" onClick={() => notify(`Role aktif: ${mockRole}`)}>...</button></div></header><section className="admin-content">{renderContent()}</section></div>{editingQuestion && <QuestionEditor initialQuestion={editingQuestion} onCancel={() => setEditingQuestion(null)} onSave={(question) => { setQuestions((previous) => previous.some((item) => item.id === question.id) ? previous.map((item) => item.id === question.id ? question : item) : [...previous, question]); setEditingQuestion(null); notify("Pertanyaan disimpan ke mock data lokal."); }} />}{showModal && <div className="modal-backdrop" onClick={() => setShowModal(false)}><form className="modal-card" onClick={(event) => event.stopPropagation()} onSubmit={createExam}><button aria-label="Tutup dialog" className="modal-close" onClick={() => setShowModal(false)} type="button">×</button><p className="eyebrow">Exam management</p><h2>Buat sesi ujian baru</h2><p className="modal-description">Ini adalah form prototype. Data belum dikirim ke backend.</p><label className="field-label" htmlFor="exam-name">Nama sesi</label><input className="text-input" id="exam-name" placeholder="Contoh: Post-test Praktikum 03" required /><div className="modal-grid"><div><label className="field-label" htmlFor="exam-type">Tipe</label><select className="text-input" id="exam-type"><option>Post-test</option><option>Pre-test</option></select></div><div><label className="field-label" htmlFor="exam-token">Token akses</label><input className="text-input" id="exam-token" placeholder="PRAKTIK-03" required /></div></div><div className="modal-actions"><button className="secondary-button" onClick={() => setShowModal(false)} type="button">Batal</button><button className="primary-button" type="submit">Simpan sebagai draft</button></div></form></div>}{toast && <div className="toast" role="status">{toast}</div>}</main>;
}

function QuestionBank({ questions, onAdd, onEdit }: { questions: MockQuestion[]; onAdd: () => void; onEdit: (question: MockQuestion) => void }) {
  return <><div className="admin-content-intro"><div><p className="eyebrow">Content studio</p><h2>Question Bank</h2><p>Susun pertanyaan pilihan ganda dan essay untuk berbagai sesi praktikum.</p></div><button className="primary-button" onClick={onAdd}>+ Tambah pertanyaan</button></div><div className="question-bank-list">{questions.map((question) => <article className="question-bank-item" key={question.id}><div className="question-bank-copy"><span className={`question-type-badge ${question.type}`}>{question.type === "essay" ? "Essay" : "Pilihan ganda"}</span><h3>{question.prompt || "Pertanyaan tanpa teks"}</h3>{question.imageUrl && <span className="image-attached">Stimulus gambar terlampir</span>}<span className="question-status">{question.status}</span></div><button className="row-action" onClick={() => onEdit(question)}>Edit soal</button></article>)}</div></>;
}

function QuestionEditor({ initialQuestion, onCancel, onSave }: { initialQuestion: MockQuestion; onCancel: () => void; onSave: (question: MockQuestion) => void }) {
  const [question, setQuestion] = useState<MockQuestion>(initialQuestion);
  const [preview, setPreview] = useState(initialQuestion.imageUrl ?? "");

  function updateQuestion(patch: Partial<MockQuestion>) {
    setQuestion((previous) => ({ ...previous, ...patch }));
  }

  function handleImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const imageUrl = String(reader.result); setPreview(imageUrl); updateQuestion({ imageUrl }); };
    reader.readAsDataURL(file);
  }

  function changeType(type: MockQuestion["type"]) {
    updateQuestion({ type, options: type === "multiple-choice" ? (question.options?.length ? question.options : ["", "", "", ""]) : undefined });
  }

  return <div className="modal-backdrop" onClick={onCancel}><form className="modal-card question-editor" onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); onSave(question); }}><button aria-label="Tutup editor soal" className="modal-close" onClick={onCancel} type="button">×</button><p className="eyebrow">Question bank · mock mode</p><h2>{initialQuestion.prompt ? "Edit pertanyaan" : "Tambah pertanyaan"}</h2><p className="modal-description">Perubahan tersimpan di state lokal. <span className="todo-note">{"// TODO: replace with tRPC mutation"}</span></p><label className="field-label" htmlFor="question-type">Tipe soal</label><select className="text-input" id="question-type" onChange={(event) => changeType(event.target.value as MockQuestion["type"])} value={question.type}><option value="multiple-choice">Pilihan Ganda</option><option value="essay">Essay</option></select><label className="field-label editor-label" htmlFor="question-prompt">Teks pertanyaan</label><textarea className="text-input question-textarea" id="question-prompt" onChange={(event) => updateQuestion({ prompt: event.target.value })} placeholder="Tulis pertanyaan atau instruksi analisis..." required value={question.prompt} />{question.type === "multiple-choice" ? <div className="choice-editor"><div className="field-label">Pilihan jawaban</div>{(question.options ?? ["", "", "", ""]).map((option, index) => <input className="text-input" key={index} onChange={(event) => updateQuestion({ options: (question.options ?? []).map((value, optionIndex) => optionIndex === index ? event.target.value : value) })} placeholder={`Pilihan ${index + 1}`} value={option} />)}</div> : <div className="upload-field"><div className="field-label">Stimulus gambar <span className="field-hint">Opsional</span></div>{preview ? <div className="image-preview"><Image alt="Preview stimulus soal" height={220} src={preview} unoptimized width={800} /><div className="preview-actions"><label className="secondary-button" htmlFor="question-image">Ganti gambar</label><button className="text-button" onClick={() => { setPreview(""); updateQuestion({ imageUrl: undefined }); }} type="button">Hapus gambar</button></div></div> : <label className="upload-dropzone" htmlFor="question-image"><span className="upload-icon">+</span><strong>Unggah gambar stimulus</strong><span>PNG, JPG atau SVG · maksimal 5 MB</span></label>}<input accept="image/*" className="visually-hidden" id="question-image" onChange={handleImage} type="file" /></div>}<div className="modal-actions"><button className="secondary-button" onClick={onCancel} type="button">Batal</button><button className="primary-button" type="submit">Simpan pertanyaan</button></div></form></div>;
}

function Dashboard({ onCreate, onNavigate }: { onCreate: () => void; onNavigate: (section: Section) => void }) {
  return <><div className="admin-content-intro"><div><p className="eyebrow">Overview</p><h2>Selamat datang kembali, Prog</h2><p>Pantau sesi ujian dan aktivitas peserta dari satu tempat.</p></div><button className="primary-button" onClick={onCreate}>+ Buat sesi ujian</button></div><div className="metrics-grid"><button className="metric-card metric-card-button" onClick={() => onNavigate("Exam Management")}><div className="metric-label">Quiz aktif</div><div className="metric-value">04</div><span>Kelola sesi quiz →</span></button><button className="metric-card metric-card-button" onClick={() => onNavigate("Reports")}><div className="metric-label">Quiz taken hari ini</div><div className="metric-value">76</div><span>Buka hasil quiz →</span></button><button className="metric-card metric-card-button" onClick={() => onNavigate("Monitoring")}><div className="metric-label">Peserta sedang mengerjakan</div><div className="metric-value">128</div><span>Lihat monitoring →</span></button></div><div className="activity-panel"><div className="panel-heading"><div><h2>Aktivitas ujian terbaru</h2><p>Data prototype untuk memvisualisasikan alur admin.</p></div><button className="text-button" onClick={() => onNavigate("Exam Management")}>Lihat semua</button></div>{exams.map(([name, count, status]) => <div className="activity-row" key={name}><strong>{name}</strong><span>{count}</span><span className="status-chip">{status}</span></div>)}</div></>;
}

function DataSection({ title, description, columns, rows, action, onAction }: { title: string; description: string; columns: string[]; rows: string[][]; action: string; onAction: () => void }) {
  return <><div className="admin-content-intro"><div><p className="eyebrow">Workspace module</p><h2>{title}</h2><p>{description}</p></div><button className="primary-button" onClick={onAction}>+ {action}</button></div><div className="activity-panel data-table"><div className="table-header">{columns.map((column) => <strong key={column}>{column}</strong>)}<span>Aksi</span></div>{rows.map((row) => <div className="table-row" key={row[0]}>{row.map((cell) => <span key={cell}>{cell}</span>)}<button className="row-action" onClick={onAction}>Detail</button></div>)}</div></>;
}

function Reports({ filter, setFilter, onExport }: { filter: string; setFilter: (value: string) => void; onExport: () => void }) {
  const rows = [["Nabila Salsabila", "PS-24031", "Pre-test", "12 Jun 2026", "Selesai"], ["Rafi Maulana", "PS-24042", "Pre-test", "12 Jun 2026", "Selesai"], ["Sinta Aulia", "PS-24058", "Post-test", "11 Jun 2026", "Selesai"]];
  const filteredRows = rows.filter((row) => row.join(" ").toLowerCase().includes(filter.toLowerCase()));
  return <><div className="admin-content-intro"><div><p className="eyebrow">Reporting</p><h2>Reports & grading</h2><p>Review participation data and prepare a report for the lab team.</p></div><button className="primary-button" onClick={onExport}>Download CSV</button></div><div className="activity-panel"><div className="report-toolbar"><input className="text-input" onChange={(event) => setFilter(event.target.value)} placeholder="Cari nama atau NPM..." value={filter} /><select className="text-input"><option>Semua sesi</option><option>Pre-test</option><option>Post-test</option></select></div><div className="table-header report-header"><strong>Peserta</strong><strong>NPM</strong><strong>Sesi</strong><strong>Tanggal</strong><strong>Status</strong></div>{filteredRows.map((row) => <div className="table-row report-row" key={row[1]}>{row.map((cell) => <span key={cell}>{cell}</span>)}</div>)}{filteredRows.length === 0 && <div className="empty-state">Tidak ada data yang cocok dengan pencarian.</div>}</div></>;
}
