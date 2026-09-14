"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CenterStage, GlassCard, ParticipantRouteGuard, QuizHeader, useBeforeUnload } from "@/components/quiz-ui";
import { trpc } from "@/lib/trpc/client";
import { MOCK_API_ENABLED, mockSaveAnswer, mockStartExam, mockSubmitExam } from "@/lib/mock-service";

// ─── Types ───────────────────────────────────────────────────────────────────

type BatchKey = "pilihanGanda" | "essay" | "kasus";
type SesiKey = "quiz" | "post-test";
type AnswerMap = Record<string, string>;
type ExamQuestion = {
  id: number;
  prompt: string;
  type: "mc" | "fill";
  options?: { id: number; text: string }[];
  stimulusUrls: string[];
};
type UiQuestion = ExamQuestion & { imageUrl?: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const OPTIONS = ["Sangat tidak sesuai", "Tidak sesuai", "Sesuai", "Sangat sesuai"];

function ExamProgressBar({ answered, total }: { answered: number; total: number }) {
  const progress = total > 0 ? Math.min(100, Math.round((answered / total) * 100)) : 0;
  return <div aria-label={`Progress tes ${progress}%`} className="exam-progress-bar" role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>;
}

function TimerDisplay() {
  const totalSeconds = 15 * 60;
  const [remaining, setRemaining] = useState(12 * 60 + 32);
  useEffect(() => {
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const ratio = remaining / totalSeconds;
  const circumference = 2 * Math.PI * 17;
  const minutes = Math.floor(remaining / 60).toString().padStart(2, "0");
  const seconds = (remaining % 60).toString().padStart(2, "0");
  return <div className={`exam-timer ${ratio < 0.2 ? "is-low" : ""}`}>
    <svg aria-hidden="true" className="timer-ring" viewBox="0 0 40 40">
      <circle className="timer-ring-track" cx="20" cy="20" r="17" />
      <circle className="timer-ring-progress" cx="20" cy="20" r="17" style={{ strokeDasharray: circumference, strokeDashoffset: circumference * (1 - ratio) }} />
    </svg>
    <span><small>Sisa waktu</small>{minutes} : {seconds}</span>
  </div>;
}

function EssayAnswer({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return <div className="exam-answer-wrap">
    <textarea aria-label={label} className="text-input exam-answer" maxLength={500} onChange={(event) => onChange(event.target.value)} placeholder="Tulis jawaban Anda di sini..." value={value} />
    <span className="character-counter">{value.length} / 500 karakter</span>
  </div>;
}

const SESI_LABEL: Record<SesiKey, string> = {
  quiz: "Quiz Praktikum",
  "post-test": "Post-Test Psikologi Eksperimen",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readParticipant() {
  if (typeof window === "undefined") return { name: "Peserta", attendanceNumber: 1 };
  try {
    const value = sessionStorage.getItem("webquiz-participant");
    const p = value
      ? (JSON.parse(value) as { name?: string; attendanceNumber?: string | number })
      : {};
    return { name: p.name || "Peserta", attendanceNumber: Number(p.attendanceNumber) || 1 };
  } catch {
    return { name: "Peserta", attendanceNumber: 1 };
  }
}

function goPrevious(
  batch: BatchKey,
  number: number,
  selectBatch: (b: BatchKey, n?: number) => void,
  batches: Record<BatchKey, UiQuestion[]>,
) {
  if (number > 1) return selectBatch(batch, number - 1);
  if (batch === "essay") return selectBatch("pilihanGanda", batches.pilihanGanda.length);
  if (batch === "kasus") return selectBatch("essay", batches.essay.length);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ChoiceInput({ answer, onChange }: { answer: string; onChange: (a: string) => void }) {
  return (
    <div className="exam-options">
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          aria-pressed={answer === opt}
          className={`option-button ${answer === opt ? "selected" : ""}`}
          onClick={() => onChange(opt)}
        >
          <span className="option-radio" aria-hidden="true" />
          <span>{opt}</span>
        </button>
      ))}
    </div>
  );
}

function Sidebar({ activeBatch, onSelect }: { activeBatch: BatchKey; onSelect: (b: BatchKey) => void }) {
  return (
    <aside className="glass-card exam-sidebar">
      <div className="exam-sidebar-title">Dashboard<br />Praktikan</div>
      {(["pilihanGanda", "essay", "kasus"] as BatchKey[]).map((batch) => (
        <button
          key={batch}
          className={`exam-sidebar-link ${activeBatch === batch ? "active" : ""}`}
          onClick={() => onSelect(batch)}
        >
          {batch === "pilihanGanda" ? "Pilihan Ganda" : batch === "essay" ? "Essay" : "Kasus"}
        </button>
      ))}
    </aside>
  );
}

function QuestionNavigator({
  activeBatch,
  batches,
  answers,
  currentNumber,
  onSelect,
  totalQuestions,
  answeredCount,
}: {
  activeBatch: BatchKey;
  batches: Record<BatchKey, UiQuestion[]>;
  answers: AnswerMap;
  currentNumber: number;
  onSelect: (b: BatchKey, n?: number) => void;
  totalQuestions: number;
  answeredCount: number;
}) {
  const batchLabel =
    activeBatch === "pilihanGanda" ? "Pilihan Ganda" : activeBatch === "essay" ? "Essay" : "Kasus";
  return (
    <aside className="glass-card exam-navigator">
      <div className="navigator-heading">
        <strong>{batchLabel}</strong>
        <span>{answeredCount}/{totalQuestions}</span>
      </div>
      <div className="question-grid">
        {batches[activeBatch].map((q, idx) => {
          const n = idx + 1;
          const key = `${activeBatch}-${n}`;
          const current = n === currentNumber;
          const answered = Boolean(answers[key]) && !current;
          return (
            <button
              key={`${activeBatch}-${q.id}`}
              aria-label={`Buka ${activeBatch} soal ${n}`}
              className={`question-number ${current ? "current" : ""} ${answered ? "answered" : ""}`}
              onClick={() => onSelect(activeBatch, n)}
            >
              {n}
            </button>
          );
        })}
      </div>
      <TimerDisplay />
      <p className="navigator-summary">{answeredCount} dari {totalQuestions} soal terjawab</p>
    </aside>
  );
}

/** Navigator flat tanpa grouping tipe — khusus Pre-Test / Post-Test (semua essay) */
function LinearNavigator({
  questions,
  answers,
  currentNumber,
  answeredCount,
  onSelect,
}: {
  questions: UiQuestion[];
  answers: AnswerMap;
  currentNumber: number;
  answeredCount: number;
  onSelect: (n: number) => void;
}) {
  return (
    <aside className="glass-card exam-navigator">
      <div className="navigator-heading">
        <strong>Soal Essay</strong>
        <span>{answeredCount}/{questions.length}</span>
      </div>
      <div className="question-grid">
        {questions.map((q, idx) => {
          const n = idx + 1;
          const key = `essay-${n}`;
          const current = n === currentNumber;
          const answered = Boolean(answers[key]) && !current;
          return (
            <button
              key={q.id}
              aria-label={`Buka soal ${n}`}
              className={`question-number ${current ? "current" : ""} ${answered ? "answered" : ""}`}
              onClick={() => onSelect(n)}
            >
              {n}
            </button>
          );
        })}
      </div>
      <TimerDisplay />
      <p className="navigator-summary">{answeredCount} dari {questions.length} soal terjawab</p>
    </aside>
  );
}

// SVG icons — inline, no library dependency
const IconInfo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="8" r="0.5" fill="currentColor" strokeWidth="0" />
    <line x1="12" y1="11" x2="12" y2="16" />
  </svg>
);
const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

function PreflightScreen({ participantName, sesiLabel, onStart, loading, error }: { participantName: string; sesiLabel: string; onStart: () => void; loading?: boolean; error?: string }) {
  return (
    <main className="figma-login functional-page">
      <QuizHeader participantLabel={participantName} participantOnly />
      <CenterStage className="preflight-layout figma-login-stage">
        <GlassCard className="preflight-card figma-login-card">
          <p className="eyebrow">Sebelum memulai</p>
          <h1>{sesiLabel}</h1>
          <p className="body-lead">
            Luangkan waktu untuk membaca informasi berikut agar Anda dapat mengerjakan dengan nyaman dan sadar.
          </p>
          <div className="preflight-list">
            <div className="preflight-item">
              <span className="preflight-icon"><IconInfo /></span>
              <div><strong>Tujuan tes</strong><p>Mengumpulkan respons untuk kebutuhan evaluasi praktikum psikologi.</p></div>
            </div>
            <div className="preflight-item">
              <span className="preflight-icon"><IconClock /></span>
              <div><strong>Estimasi durasi</strong><p>Sekitar 15 menit. Anda dapat berpindah antar soal kapan saja.</p></div>
            </div>
            <div className="preflight-item">
              <span className="preflight-icon"><IconShield /></span>
              <div><strong>Kerahasiaan data</strong><p>Respons Anda bersifat rahasia dan hanya dapat diakses oleh tim laboratorium.</p></div>
            </div>
          </div>
          {error && <p className="exam-alert-warning" role="alert">{error}</p>}
          <button className="primary-button" disabled={loading} onClick={onStart}>{loading ? "Menyiapkan tes..." : "Saya mengerti dan siap memulai"}</button>
        </GlassCard>
      </CenterStage>
      <footer className="figma-login-footer">LABORATORIUM PSIKOLOGI</footer>
    </main>
  );
}

function FinishDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card finish-dialog">
        <span aria-hidden="true" className="confirmation-icon confirmation-icon-warning">!</span>
        <h2>Selesaikan tes?</h2>
        <p>Setelah submit, jawaban tidak dapat diubah. Pastikan seluruh jawaban sudah sesuai sebelum melanjutkan.</p>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onCancel}>Kembali</button>
          <button className="primary-button" onClick={onConfirm}>Ya, Submit Sekarang</button>
        </div>
      </div>
    </div>
  );
}

const IconCheck = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function CompletionScreen() {
  return (
    <main className="figma-login functional-page">
      <QuizHeader hideMeta />
      <CenterStage className="figma-login-stage completion-stage">
        <GlassCard className="completion-card figma-login-card">
          <div className="completion-icon">
            <IconCheck />
          </div>
          <p className="eyebrow">Respons diterima</p>
          <h1 className="completion-title">Terima kasih sudah menyelesaikan tes.</h1>
          <p className="completion-copy">Jawaban Anda sudah tersimpan. Silakan ikuti arahan asisten lab untuk langkah berikutnya.</p>
          <Link className="primary-button completion-btn" href="/dashboard">Kembali ke dashboard</Link>
        </GlassCard>
      </CenterStage>
      <footer className="figma-login-footer">LABORATORIUM PSIKOLOGI</footer>
    </main>
  );
}

// ─── Mode: Ujian (Pilihan Ganda + Essay + Kasus) ──────────────────────────────

function UjianExam({
  participant,
  sesiLabel,
  completionHref,
}: {
  participant: { name: string; attendanceNumber: number };
  sesiLabel: string;
  completionHref: string;
}) {
  const [started, setStarted] = useState(false);
  const [activeBatch, setActiveBatch] = useState<BatchKey>("pilihanGanda");
  const [currentNumber, setCurrentNumber] = useState(1);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [message, setMessage] = useState("");
  const [batches, setBatches] = useState<Record<BatchKey, UiQuestion[]>>({ pilihanGanda: [], essay: [], kasus: [] });
  const allowNavigation = useBeforeUnload(started);
  const startMutation = trpc.exam.start.useMutation();
  const saveAnswerMutation = trpc.exam.saveAnswer.useMutation();
  const submitMutation = trpc.exam.submit.useMutation();

  function startExam() {
    if (MOCK_API_ENABLED) {
      const { questions } = mockStartExam("post-test");
      const next = { pilihanGanda: [], essay: [], kasus: [] } as Record<BatchKey, UiQuestion[]>;
      questions.forEach((question) => {
        const batch: BatchKey = question.type === "mc" ? "pilihanGanda" : question.stimulusUrls.length ? "kasus" : "essay";
        next[batch].push({ ...question, imageUrl: question.stimulusUrls[0] });
      });
      setBatches(next);
      setStarted(true);
      return;
    }
    startMutation.mutate(undefined, {
      onSuccess: ({ questions }) => {
        const next = { pilihanGanda: [], essay: [], kasus: [] } as Record<BatchKey, UiQuestion[]>;
        questions.forEach((question) => {
          const batch: BatchKey = question.type === "mc" ? "pilihanGanda" : question.stimulusUrls.length ? "kasus" : "essay";
          next[batch].push({ ...question, imageUrl: question.stimulusUrls[0] });
        });
        setBatches(next);
        setStarted(true);
      },
      onError: () => setMessage("Soal belum dapat dimuat. Pastikan sesi peserta sudah aktif."),
    });
  }

  useEffect(() => {
    const syncId = window.setTimeout(() => {
      const stored = sessionStorage.getItem("webquiz-answers-post-test");
      if (!stored) return;
      try { setAnswers(JSON.parse(stored) as AnswerMap); } catch { sessionStorage.removeItem("webquiz-answers-post-test"); }
    }, 0);
    return () => window.clearTimeout(syncId);
  }, []);

  const currentQuestions = batches[activeBatch];
  const currentQuestion = currentQuestions[currentNumber - 1] as UiQuestion | undefined;
  const currentKey = `${activeBatch}-${currentNumber}`;
  const currentAnswer = answers[currentKey] ?? "";
  const totalQuestions = batches.pilihanGanda.length + batches.essay.length + batches.kasus.length;
  const answeredCount = Object.keys(answers).length;

  function selectBatch(batch: BatchKey, number = 1) {
    setActiveBatch(batch);
    setCurrentNumber(Math.min(number, batches[batch].length));
    setMessage("");
  }

  function saveAnswer(answer: string) {
    setAnswers((prev) => {
      const next = { ...prev, [currentKey]: answer };
      sessionStorage.setItem("webquiz-answers-post-test", JSON.stringify(next));
      return next;
    });
    const answerInput = {
      questionId: currentQuestion?.id ?? 0,
      ...(activeBatch === "pilihanGanda"
        ? { optionId: currentQuestion?.options?.find((option) => option.text === answer)?.id }
        : { text: answer }),
    };
    if (MOCK_API_ENABLED) mockSaveAnswer(answerInput);
    else saveAnswerMutation.mutate(answerInput);
    setMessage("Jawaban tersimpan");
    window.setTimeout(() => setMessage(""), 1400);
  }

  function nextQuestion() {
    if (currentNumber < currentQuestions.length) { setCurrentNumber(currentNumber + 1); return; }
    if (activeBatch === "pilihanGanda") selectBatch("essay");
    else if (activeBatch === "essay") selectBatch("kasus");
    else if (answeredCount < totalQuestions) setMessage(`Lengkapi ${totalQuestions - answeredCount} soal yang belum terjawab.`);
    else setShowFinishDialog(true);
  }

  if (!started) return <PreflightScreen participantName={participant.name} sesiLabel={sesiLabel} onStart={startExam} loading={startMutation.isPending} error={message} />;
  if (!currentQuestion) return null;

  const isChoice = activeBatch === "pilihanGanda";
  const isCase = activeBatch === "kasus";
  const batchLabel = isChoice ? "Pilihan Ganda" : isCase ? "Kasus" : "Essay";

  return (
    <main className="exam-dashboard">
      <QuizHeader participantLabel={participant.name} participantOnly />
      <ExamProgressBar answered={answeredCount} total={totalQuestions} />
      <div className="exam-dashboard-body">
        <Sidebar activeBatch={activeBatch} onSelect={selectBatch} />
        <section className="exam-question-area">
          <div className="exam-topline">
            <div className="exam-breadcrumb" aria-label="Posisi soal"><span>{sesiLabel}</span><b>›</b><strong>{batchLabel}</strong><b>›</b><span>Soal {currentNumber} dari {currentQuestions.length}</span></div>
            <span className={`save-indicator ${message.startsWith("Lengkapi") ? "exam-alert-warning" : ""}`} role={message.startsWith("Lengkapi") ? "alert" : undefined}>{message || "Jawaban tersimpan otomatis"}</span>
          </div>
          <GlassCard className="exam-question-card">
            <span className="question-type">{isChoice ? "Pilihan ganda" : isCase ? "Kasus" : "Essay"}</span>
            {isCase && currentQuestion.imageUrl && (
              <Image alt="Stimulus soal" className="exam-stimulus" height={520} src={currentQuestion.imageUrl} width={1200} />
            )}
            <h1>{currentQuestion.prompt}</h1>
            {isChoice
              ? <ChoiceInput answer={currentAnswer} onChange={saveAnswer} />
              : <EssayAnswer label={isCase ? "Jawaban kasus" : "Jawaban essay"} onChange={saveAnswer} value={currentAnswer} />
            }
            <div className="exam-actions">
              <button className="secondary-button" disabled={activeBatch === "pilihanGanda" && currentNumber === 1} onClick={() => goPrevious(activeBatch, currentNumber, selectBatch, batches)}>Soal Sebelumnya</button>
              <button className="primary-button" disabled={!currentAnswer.trim()} onClick={nextQuestion}>
                {isCase && currentNumber === currentQuestions.length ? "Selesaikan Tes" : "Soal Berikutnya"}
              </button>
            </div>
          </GlassCard>
        </section>
        <QuestionNavigator activeBatch={activeBatch} batches={batches} answers={answers} currentNumber={currentNumber} onSelect={selectBatch} totalQuestions={totalQuestions} answeredCount={answeredCount} />
      </div>
      <footer className="exam-dashboard-footer">LABORATORIUM PSIKOLOGI</footer>
      {showFinishDialog && <FinishDialog onCancel={() => setShowFinishDialog(false)} onConfirm={() => {
              if (MOCK_API_ENABLED) {
                mockSubmitExam();
                allowNavigation();
                sessionStorage.removeItem("webquiz-answers-post-test");
                window.location.href = completionHref;
                return;
              }
              submitMutation.mutate(undefined, {
                onSuccess: () => { allowNavigation(); sessionStorage.removeItem("webquiz-answers-post-test"); window.location.href = completionHref; },
                onError: () => setMessage("Jawaban belum dapat dikirim. Coba lagi."),
              });
            }} />}
    </main>
  );
}

// ─── Mode: Quiz (Essay saja, 5 soal, tanpa sidebar kiri) ─────

function LinearExam({
  participant,
  sesiLabel,
  completionHref,
}: {
  participant: { name: string; attendanceNumber: number };
  sesiLabel: string;
  completionHref: string;
}) {
  const [started, setStarted] = useState(false);

  const [currentNumber, setCurrentNumber] = useState(1);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [message, setMessage] = useState("");
  const [questions, setQuestions] = useState<UiQuestion[]>([]);
  const allowNavigation = useBeforeUnload(started);
  const startMutation = trpc.exam.start.useMutation();
  const saveAnswerMutation = trpc.exam.saveAnswer.useMutation();
  const submitMutation = trpc.exam.submit.useMutation();

  function startExam() {
    if (MOCK_API_ENABLED) {
      setQuestions(mockStartExam("quiz").questions);
      setStarted(true);
      return;
    }
    startMutation.mutate(undefined, {
      onSuccess: ({ questions: apiQuestions }) => {
        setQuestions(apiQuestions.filter((question) => question.type === "fill" && question.stimulusUrls.length === 0));
        setStarted(true);
      },
      onError: () => setMessage("Soal belum dapat dimuat. Pastikan sesi peserta sudah aktif."),
    });
  }

  useEffect(() => {
    const syncId = window.setTimeout(() => {
      const stored = sessionStorage.getItem("webquiz-answers-quiz");
      if (!stored) return;
      try { setAnswers(JSON.parse(stored) as AnswerMap); } catch { sessionStorage.removeItem("webquiz-answers-quiz"); }
    }, 0);
    return () => window.clearTimeout(syncId);
  }, []);

  const currentKey = `essay-${currentNumber}`;
  const currentAnswer = answers[currentKey] ?? "";
  const currentQuestion = questions[currentNumber - 1] as UiQuestion | undefined;
  const answeredCount = Object.keys(answers).length;

  function saveAnswer(answer: string) {
    setAnswers((prev) => {
      const next = { ...prev, [currentKey]: answer };
      sessionStorage.setItem("webquiz-answers-quiz", JSON.stringify(next));
      return next;
    });
    const answerInput = { questionId: currentQuestion?.id ?? 0, text: answer };
    if (MOCK_API_ENABLED) mockSaveAnswer(answerInput);
    else saveAnswerMutation.mutate(answerInput);
    setMessage("Jawaban tersimpan");
    window.setTimeout(() => setMessage(""), 1400);
  }

  function nextQuestion() {
    if (currentNumber < questions.length) { setCurrentNumber(currentNumber + 1); return; }
    if (answeredCount < questions.length) {
      setMessage(`Lengkapi ${questions.length - answeredCount} soal yang belum terjawab.`);
      return;
    }
    setShowFinishDialog(true);
  }

  function prevQuestion() {
    if (currentNumber > 1) setCurrentNumber(currentNumber - 1);
  }

  if (!started) return <PreflightScreen participantName={participant.name} sesiLabel={sesiLabel} onStart={startExam} loading={startMutation.isPending} error={message} />;

  if (!currentQuestion) return null;

  return (
    <main className="exam-dashboard">
      <QuizHeader participantLabel={participant.name} participantOnly />
      <ExamProgressBar answered={answeredCount} total={questions.length} />
      <div className="exam-dashboard-body exam-dashboard-body--linear">
        <CenterStage className="exam-question-area">
          <div className="exam-topline">
            <div className="exam-breadcrumb" aria-label="Posisi soal"><span>{sesiLabel}</span><b>›</b><strong>Essay</strong><b>›</b><span>Soal {currentNumber} dari {questions.length}</span></div>
            <span className={`save-indicator ${message.startsWith("Lengkapi") ? "exam-alert-warning" : ""}`} role={message.startsWith("Lengkapi") ? "alert" : undefined}>{message || "Jawaban tersimpan otomatis"}</span>
          </div>
          <GlassCard className="exam-question-card">
            <span className="question-type">Essay</span>
            <h1>{currentQuestion.prompt}</h1>
            <EssayAnswer label="Jawaban essay" onChange={saveAnswer} value={currentAnswer} />
            <div className="exam-actions">
              <button className="secondary-button" disabled={currentNumber === 1} onClick={prevQuestion}>Soal Sebelumnya</button>
              <button className="primary-button" disabled={!currentAnswer.trim()} onClick={nextQuestion}>
                {currentNumber === questions.length ? "Selesaikan Tes" : "Soal Berikutnya"}
              </button>
            </div>
          </GlassCard>
        </CenterStage>
        <LinearNavigator questions={questions} answers={answers} currentNumber={currentNumber} answeredCount={answeredCount} onSelect={setCurrentNumber} />
      </div>
      <footer className="exam-dashboard-footer">LABORATORIUM PSIKOLOGI</footer>
      {showFinishDialog && <FinishDialog onCancel={() => setShowFinishDialog(false)} onConfirm={() => {
              if (MOCK_API_ENABLED) {
                mockSubmitExam();
                allowNavigation();
                sessionStorage.removeItem("webquiz-answers-quiz");
                window.location.href = completionHref;
                return;
              }
              submitMutation.mutate(undefined, {
                onSuccess: () => { allowNavigation(); sessionStorage.removeItem("webquiz-answers-quiz"); window.location.href = completionHref; },
                onError: () => setMessage("Jawaban belum dapat dikirim. Coba lagi."),
              });
            }} />}
    </main>
  );
}

// ─── Root page (reads ?sesi param) ────────────────────────────────────────────

function ExamPageInner() {
  const searchParams = useSearchParams();
  const isCompletion = searchParams.get("status") === "selesai";
  const rawSesi = searchParams.get("sesi") ?? "quiz";
  const sesi: SesiKey = (["quiz", "post-test"] as SesiKey[]).includes(rawSesi as SesiKey)
    ? (rawSesi as SesiKey)
    : "quiz";
  const sesiLabel = SESI_LABEL[sesi];
  const isLinear = sesi === "quiz";

  const [participant, setParticipant] = useState({ name: "Peserta", attendanceNumber: 1 });

  useEffect(() => {
    const id = window.setTimeout(() => {
      setParticipant(readParticipant());
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  if (isCompletion) return <CompletionScreen />;

  return isLinear
    ? <LinearExam participant={participant} sesiLabel={sesiLabel} completionHref="/exam?status=selesai" />
    : <UjianExam participant={participant} sesiLabel={sesiLabel} completionHref="/kesan-pesan" />;
}

export default function ExamPage() {
  return (
    <ParticipantRouteGuard>
      <Suspense>
        <ExamPageInner />
      </Suspense>
    </ParticipantRouteGuard>
  );
}
