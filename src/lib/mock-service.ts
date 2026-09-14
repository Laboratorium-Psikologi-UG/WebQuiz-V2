"use client";

import { mockAuthCredentials, mockExamSessions, mockQuestionBankSummary } from "@/lib/mock-data";

/**
 * Temporary frontend service layer. All writes are persisted in localStorage.
 * MOCK: replace each service method with the corresponding tRPC call once the
 * backend procedure is implemented.
 */
// Mock mode is the safe frontend default while the backend procedures are placeholders.
// Set NEXT_PUBLIC_USE_MOCK_API=false explicitly to exercise the real tRPC path.
export const MOCK_API_ENABLED = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

export type MockExamQuestion = {
  id: number;
  prompt: string;
  type: "mc" | "fill";
  options?: { id: number; text: string }[];
  stimulusUrls: string[];
};

export type MockFeedback = { kelas: string; kesan: string; pesan: string };
export type MockAdminUserRecord = { id: number; username: string; role: string; status: string };
export type MockReport = { npm: string; name: string; kelas: string; score: number; passed: boolean };
export type MockMonitoring = { npm: string; name: string; kelas: string; lastActivityAt: string; status: string };
export type MockSessionRecord = { id: string; name: string; status: "Aktif" | "Nonaktif"; token: string };
export type MockQuestionRecord = { id: string; type: string; count: number; kelas: string; status: string; session?: string; prompt?: string };

const keys = {
  questions: "webquiz-mock-questions",
  sessions: "webquiz-mock-sessions",
  feedback: "webquiz-mock-feedback",
  users: "webquiz-mock-users",
  reports: "webquiz-mock-reports",
  answers: "webquiz-mock-answers",
  monitoring: "webquiz-mock-monitoring",
};

const initialQuestions: MockQuestionRecord[] = mockQuestionBankSummary.map((item) => ({ ...item, prompt: `${item.type} contoh untuk ${item.kelas}` }));
const initialSessions: MockSessionRecord[] = mockExamSessions.map((session) => ({ ...session }));
const initialUsers: MockAdminUserRecord[] = [
  { id: 1, username: mockAuthCredentials.adminUsername, role: "Prog", status: "Aktif" },
  { id: 2, username: "assistant.demo", role: "Assistant", status: "Aktif" },
];
const initialFeedback: MockFeedback[] = [
  { kelas: "3PA00", kesan: "Materi praktikum membantu saya memahami konsep.", pesan: "Contoh kasus dapat ditambah." },
  { kelas: "3PA01", kesan: "Alur praktikum cukup jelas.", pesan: "Waktu diskusi bisa ditambah." },
];
const initialReports: MockReport[] = [
  { npm: "14521001", name: "Praktikan Demo", kelas: "3PA00", score: 82, passed: true },
  { npm: "14521002", name: "Praktikan Contoh", kelas: "3PA01", score: 68, passed: false },
];

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(value));
}

export function resetMockData() {
  if (typeof window === "undefined") return;
  Object.values(keys).forEach((key) => window.localStorage.removeItem(key));
  window.location.reload();
}

export function mockStartExam(sesi: "quiz" | "post-test"): { attemptId: number; questions: MockExamQuestion[] } {
  // MOCK: replace with exam.start once implemented.
  const essay = Array.from({ length: 5 }, (_, index) => ({
    id: index + 1,
    prompt: `Jelaskan pemahaman Anda terhadap materi praktikum pada soal ${index + 1}.`,
    type: "fill" as const,
    stimulusUrls: [],
  }));
  const postTest: MockExamQuestion[] = [
    { id: 101, prompt: "Pilih jawaban yang paling tepat untuk konsep berikut.", type: "mc", options: [{ id: 1, text: "Sangat tidak sesuai" }, { id: 2, text: "Tidak sesuai" }, { id: 3, text: "Sesuai" }, { id: 4, text: "Sangat sesuai" }], stimulusUrls: [] },
    { id: 102, prompt: "Jelaskan konsep yang Anda pahami.", type: "fill", stimulusUrls: [] },
    { id: 103, prompt: "Analisis kasus berdasarkan stimulus berikut.", type: "fill", stimulusUrls: ["/mock-stimulus.svg"] },
  ];
  return { attemptId: Date.now(), questions: sesi === "quiz" ? essay : [...postTest, ...essay] };
}

export function mockSaveAnswer(input: { questionId: number; optionId?: number; text?: string; isFlagged?: boolean }) {
  // MOCK: replace with exam.saveAnswer once implemented.
  const answers = read<Record<string, typeof input>>(keys.answers, {});
  answers[String(input.questionId)] = input;
  write(keys.answers, answers);
  return { ok: true };
}

export function mockSubmitExam() {
  // MOCK: replace with exam.submit once implemented.
  return { result: { score: 0, passed: false, gradedAt: null } };
}

export function mockSubmitFeedback(input: { kelas: string; kesan: string; pesan: string }) {
  // MOCK: replace with feedback.submit once implemented.
  const entries = read<MockFeedback[]>(keys.feedback, initialFeedback);
  write(keys.feedback, [...entries, input]);
  return { ok: true };
}

export function mockListFeedback() { return read<MockFeedback[]>(keys.feedback, initialFeedback); }

export function mockListSessions() { return read<MockSessionRecord[]>(keys.sessions, initialSessions); }
export function mockCreateSession(input: Omit<MockSessionRecord, "id">) {
  // MOCK: replace with admin.pack.create and admin.token.create once implemented.
  const sessions = mockListSessions();
  const item = { ...input, id: `exam-${Date.now()}` };
  write(keys.sessions, [...sessions, item]);
  return item;
}
export function mockUpdateSession(id: string, input: Omit<MockSessionRecord, "id">) {
  // MOCK: replace with admin.pack.update once implemented.
  const sessions = mockListSessions().map((item) => item.id === id ? { ...input, id } : item);
  write(keys.sessions, sessions);
  return sessions.find((item) => item.id === id);
}
export function mockDeleteSession(id: string) {
  // MOCK: replace with the relevant admin delete procedure once implemented.
  write(keys.sessions, mockListSessions().filter((item) => item.id !== id));
}

export function mockListQuestions() { return read<MockQuestionRecord[]>(keys.questions, initialQuestions); }
export function mockCreateQuestion(input: Omit<MockQuestionRecord, "id">) {
  // MOCK: replace with admin.question.create once implemented.
  const item = { ...input, id: `qb-${Date.now()}` };
  write(keys.questions, [...mockListQuestions(), item]);
  return item;
}
export function mockUpdateQuestion(id: string, input: Omit<MockQuestionRecord, "id">) {
  // MOCK: replace with admin.question.update once implemented.
  const items = mockListQuestions().map((item) => item.id === id ? { ...input, id } : item);
  write(keys.questions, items);
  return items.find((item) => item.id === id);
}
export function mockDeleteQuestion(id: string) {
  // MOCK: replace with admin.question.delete once implemented.
  write(keys.questions, mockListQuestions().filter((item) => item.id !== id));
}

export function mockListReports() { return read<MockReport[]>(keys.reports, initialReports); }
export function mockExportReports() {
  // MOCK: replace with admin.report.export once implemented.
  return mockListReports().map((row) => [row.npm, row.name, row.kelas, row.score, row.passed ? "true" : "false"]);
}

export function mockListUsers() { return read<MockAdminUserRecord[]>(keys.users, initialUsers); }
export function mockCreateUser(input: Omit<MockAdminUserRecord, "id">) {
  // MOCK: replace with admin.user.create once implemented.
  const item = { ...input, id: Date.now() };
  write(keys.users, [...mockListUsers(), item]);
  return item;
}
export function mockUpdateUser(id: number, input: Omit<MockAdminUserRecord, "id">) {
  // MOCK: replace with admin.user.setRole/approve once implemented.
  const users = mockListUsers().map((item) => item.id === id ? { ...input, id } : item);
  write(keys.users, users);
  return users.find((item) => item.id === id);
}
export function mockDeleteUser(id: number) {
  // MOCK: replace with admin.user.delete once implemented.
  write(keys.users, mockListUsers().filter((item) => item.id !== id));
}

export function mockMonitoring() {
  // MOCK: replace with admin.monitoring.active once implemented.
  const count = 2 + Math.floor(Math.random() * 4);
  const rows = Array.from({ length: count }, (_, index) => ({ npm: `14521${String(index + 1).padStart(3, "0")}`, name: `Praktikan ${index + 1}`, kelas: index % 2 ? "3PA01" : "3PA00", lastActivityAt: new Date().toISOString(), status: index % 3 === 0 ? "Sedang mengerjakan" : "Selesai" }));
  write(keys.monitoring, rows);
  return rows;
}

export const MOCK_RESET_HELP = "Panggil resetMockData() dari console browser untuk menghapus seluruh mock localStorage.";
