export type QuestionType = "multiple-choice" | "essay" | "case";

export type MockQuestion = {
  id: string;
  prompt: string;
  type: QuestionType;
  options?: string[];
  imageUrl?: string;
  status: "Aktif" | "Draft";
};

export type MockParticipant = {
  id: string;
  name: string;
  npm: string;
  exam: string;
  progress: string;
  status: string;
  kelas: string;
};

export type MockResult = {
  participant: string;
  npm: string;
  session: string;
  kelas: string;
  date: string;
  status: string;
};

export type MockExamSession = {
  id: string;
  name: string;
  status: "Aktif" | "Nonaktif";
  token: string;
};

export type QuestionBankSummary = {
  id: string;
  type: string;
  count: number;
  kelas: string;
  status: string;
};

export type MockAdminUser = {
  id: string;
  username: string;
  role: string;
  status: "Aktif" | "Menunggu";
};

export const mockQuestions: MockQuestion[] = [
  {
    id: "q-001",
    prompt: "Saya dapat memperhatikan detail kecil ketika mengerjakan tugas praktikum.",
    type: "multiple-choice",
    options: ["Sangat tidak sesuai", "Tidak sesuai", "Sesuai", "Sangat sesuai"],
    status: "Aktif",
  },
  {
    id: "q-002",
    prompt: "Saya merasa siap mengikuti sesi praktikum hari ini.",
    type: "multiple-choice",
    options: ["Sangat tidak sesuai", "Tidak sesuai", "Sesuai", "Sangat sesuai"],
    status: "Aktif",
  },
  {
    id: "q-003",
    prompt: "Amati stimulus visual berikut. Jelaskan proses kognitif yang mungkin terlibat dan alasan Anda.",
    type: "essay",
    imageUrl: "/mock-stimulus.svg",
    status: "Aktif",
  },
  {
    id: "q-004",
    prompt: "Jelaskan pengalaman Anda selama mengikuti praktikum dan satu hal yang ingin Anda kembangkan.",
    type: "essay",
    status: "Draft",
  },
];

export const mockExamBatches = {
  pilihanGanda: {
    setA: [
      mockQuestions[0],
      {
        id: "a-pg-002",
        prompt: "Saya dapat mengatur waktu dengan baik ketika mengerjakan tugas praktikum.",
        type: "multiple-choice" as const,
        options: ["Sangat tidak sesuai", "Tidak sesuai", "Sesuai", "Sangat sesuai"],
        status: "Aktif" as const,
      },
      {
        id: "a-pg-003",
        prompt: "Saya dapat mengikuti instruksi praktikum secara berurutan.",
        type: "multiple-choice" as const,
        options: ["Sangat tidak sesuai", "Tidak sesuai", "Sesuai", "Sangat sesuai"],
        status: "Aktif" as const,
      },
    ],
    setB: [
      mockQuestions[1],
      {
        id: "b-pg-002",
        prompt: "Saya nyaman menyampaikan pertanyaan ketika menemukan kesulitan.",
        type: "multiple-choice" as const,
        options: ["Sangat tidak sesuai", "Tidak sesuai", "Sesuai", "Sangat sesuai"],
        status: "Aktif" as const,
      },
      {
        id: "b-pg-003",
        prompt: "Saya dapat mempersiapkan diri sebelum sesi praktikum dimulai.",
        type: "multiple-choice" as const,
        options: ["Sangat tidak sesuai", "Tidak sesuai", "Sesuai", "Sangat sesuai"],
        status: "Aktif" as const,
      },
    ],
  },
  essay: {
    setA: [
      {
        id: "a-essay-001",
        prompt: "Amati stimulus visual berikut. Jelaskan proses kognitif yang mungkin terlibat dan alasan Anda.",
        type: "essay" as const,
        imageUrl: "/mock-stimulus.svg",
        status: "Aktif" as const,
      },
      {
        id: "a-essay-002",
        prompt: "Jelaskan satu hal yang Anda amati dari stimulus dan kaitkan dengan pengalaman belajar Anda.",
        type: "essay" as const,
        status: "Aktif" as const,
      },
    ],
    setB: [
      {
        id: "b-essay-001",
        prompt: "Amati stimulus visual berikut. Jelaskan proses kognitif yang mungkin terlibat dan alasan Anda.",
        type: "essay" as const,
        imageUrl: "/mock-stimulus.svg",
        status: "Aktif" as const,
      },
      {
        id: "b-essay-002",
        prompt: "Bagaimana Anda akan merancang observasi sederhana untuk menguji dugaan dari kasus tersebut?",
        type: "essay" as const,
        status: "Aktif" as const,
      },
    ],
  },
  kasus: {
    setA: [{ id: "a-case-001", prompt: "Apa maksud dari gambar di atas? Jelaskan pengamatan Anda secara singkat.", type: "case" as const, imageUrl: "/mock-stimulus.svg", status: "Aktif" as const }],
    setB: [{ id: "b-case-001", prompt: "Analisis kasus pada stimulus berikut dan jelaskan alasan Anda.", type: "case" as const, imageUrl: "/mock-stimulus.svg", status: "Aktif" as const }],
  },
};

export function getExamBatchesByAttendance(attendanceNumber: number) {
  // TODO: replace with real backend logic.
  return attendanceNumber % 2 === 0
    ? { pilihanGanda: mockExamBatches.pilihanGanda.setB, essay: mockExamBatches.essay.setB, kasus: mockExamBatches.kasus.setB }
    : { pilihanGanda: mockExamBatches.pilihanGanda.setA, essay: mockExamBatches.essay.setA, kasus: mockExamBatches.kasus.setA };
}

export const mockExamSetA: MockQuestion[] = [
  ...mockExamBatches.pilihanGanda.setA,
  ...mockExamBatches.essay.setA,
];

export const mockExamSetB: MockQuestion[] = [
  ...mockExamBatches.pilihanGanda.setB,
  ...mockExamBatches.essay.setB,
];

/*
export const legacyMockExamSetA: MockQuestion[] = [
  mockQuestions[0],
  mockQuestions[2],
  {
    id: "a-003",
    prompt: "Saya dapat mengatur waktu dengan baik ketika mengerjakan tugas praktikum.",
    type: "multiple-choice",
    options: ["Sangat tidak sesuai", "Tidak sesuai", "Sesuai", "Sangat sesuai"],
    status: "Aktif",
  },
  {
    id: "a-004",
    prompt: "Jelaskan satu hal yang Anda amati dari stimulus dan kaitkan dengan pengalaman belajar Anda.",
    type: "essay",
    status: "Aktif",
  },
];

export const mockExamSetB: MockQuestion[] = [
  mockQuestions[1],
  {
    id: "b-002",
    prompt: "Saya nyaman menyampaikan pertanyaan ketika menemukan kesulitan.",
    type: "multiple-choice",
    options: ["Sangat tidak sesuai", "Tidak sesuai", "Sesuai", "Sangat sesuai"],
    status: "Aktif",
  },
  {
    id: "b-003",
    prompt: "Amati stimulus visual berikut. Jelaskan proses kognitif yang mungkin terlibat dan alasan Anda.",
    type: "essay",
    imageUrl: "/mock-stimulus.svg",
    status: "Aktif",
  },
  {
    id: "b-004",
    prompt: "Bagaimana Anda akan merancang observasi sederhana untuk menguji dugaan dari kasus tersebut?",
    type: "essay",
    status: "Aktif",
  },
];
*/

export function getExamSetByAttendance(attendanceNumber: number): MockQuestion[] {
  const batches = getExamBatchesByAttendance(attendanceNumber);
  return [...batches.pilihanGanda, ...batches.essay];
}

export const mockParticipants: MockParticipant[] = [
  { id: "PS-24031", name: "Nabila Salsabila", npm: "PS-24031", exam: "Pre-test Eksperimen", progress: "12 / 20 soal", status: "Sedang mengerjakan", kelas: "3PA01" },
  { id: "PS-24042", name: "Rafi Maulana", npm: "PS-24042", exam: "Pre-test Eksperimen", progress: "08 / 20 soal", status: "Sedang mengerjakan", kelas: "3PA01" },
  { id: "PS-24058", name: "Sinta Aulia", npm: "PS-24058", exam: "Post-test Praktikum 02", progress: "20 / 20 soal", status: "Selesai", kelas: "3PA02" },
];

export const mockResults: MockResult[] = [
  { participant: "Nabila Salsabila", npm: "PS-24031", session: "Pre-test", kelas: "3PA01", date: "12 Jun 2026", status: "Selesai" },
  { participant: "Rafi Maulana", npm: "PS-24042", session: "Pre-test", kelas: "3PA01", date: "12 Jun 2026", status: "Selesai" },
  { participant: "Sinta Aulia", npm: "PS-24058", session: "Post-test", kelas: "3PA02", date: "11 Jun 2026", status: "Selesai" },
];

export const mockExamSessions: MockExamSession[] = [
  { id: "exam-1", name: "Pre-test Psikologi Eksperimen", status: "Aktif", token: "EISGANJIL-2026" },
  { id: "exam-2", name: "Post-test Praktikum 02", status: "Aktif", token: "POSTTP02-2026" },
  { id: "exam-3", name: "Pre-test Praktikum 01", status: "Nonaktif", token: "PRETP01-2026" },
];

export const mockQuestionBankSummary: QuestionBankSummary[] = [
  { id: "qb-1", type: "Pilihan Ganda", count: 15, kelas: "3PA01", status: "Aktif" },
  { id: "qb-2", type: "Essay", count: 8, kelas: "3PA01", status: "Aktif" },
  { id: "qb-3", type: "Kasus", count: 4, kelas: "3PA02", status: "Aktif" },
];

export const mockAdminUsers: MockAdminUser[] = [
  { id: "user-1", username: "prog.admin", role: "Prog", status: "Aktif" },
  { id: "user-2", username: "staff.lab", role: "Staff/Structure", status: "Aktif" },
  { id: "user-3", username: "assistant.01", role: "Assistant", status: "Menunggu" },
];

// TODO: replace mock data with tRPC queries and mutations when the backend is ready.
export const mockRole = "Prog";
