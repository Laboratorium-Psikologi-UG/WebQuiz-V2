"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GlassCard, QuizHeader } from "@/components/quiz-ui";
import { getExamBatchesByAttendance, MockQuestion } from "@/lib/mock-data";

type BatchKey = "pilihanGanda" | "essay" | "kasus";
type AnswerMap = Record<string, string>;

const options = ["Sangat tidak sesuai", "Tidak sesuai", "Sesuai", "Sangat sesuai"];

function readParticipant() {
  if (typeof window === "undefined") return { name: "Peserta", attendanceNumber: 1 };
  try {
    const value = sessionStorage.getItem("webquiz-participant");
    const participant = value ? JSON.parse(value) as { name?: string; attendanceNumber?: string | number } : {};
    return { name: participant.name || "Peserta", attendanceNumber: Number(participant.attendanceNumber) || 1 };
  } catch {
    return { name: "Peserta", attendanceNumber: 1 };
  }
}

export default function ExamPage() {
  const [participant, setParticipant] = useState({ name: "Peserta", attendanceNumber: 1 });
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [activeBatch, setActiveBatch] = useState<BatchKey>("pilihanGanda");
  const [currentNumber, setCurrentNumber] = useState(1);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [message, setMessage] = useState("");
  const [batches, setBatches] = useState(() => getExamBatchesByAttendance(1));

  useEffect(() => {
    const syncId = window.setTimeout(() => {
      const storedParticipant = readParticipant();
      setParticipant(storedParticipant);
      setBatches(getExamBatchesByAttendance(storedParticipant.attendanceNumber));
      setStarted(Boolean(sessionStorage.getItem("webquiz-participant")));
    }, 0);
    return () => window.clearTimeout(syncId);
  }, []);

  const currentQuestions = batches[activeBatch];
  const currentQuestion = currentQuestions[currentNumber - 1] as MockQuestion | undefined;
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
    setAnswers((previous) => ({ ...previous, [currentKey]: answer }));
    setMessage("Jawaban tersimpan");
    window.setTimeout(() => setMessage(""), 1400);
  }

  function nextQuestion() {
    if (currentNumber < currentQuestions.length) {
      setCurrentNumber(currentNumber + 1);
      return;
    }
    if (activeBatch === "pilihanGanda") selectBatch("essay");
    else if (activeBatch === "essay") selectBatch("kasus");
    else setShowFinishDialog(true);
  }

  if (!currentQuestion) return null;
  if (!started) return <PreflightScreen participantName={participant.name} onStart={() => setStarted(true)} />;
  if (finished) return <CompletionScreen />;

  const isChoice = activeBatch === "pilihanGanda";
  const isCase = activeBatch === "kasus";
  const batchLabel = isChoice ? "Pilihan Ganda" : isCase ? "Kasus" : "Essay";

  return (
    <main className="exam-dashboard">
      <QuizHeader participantLabel={participant.name} participantOnly />
      <div className="exam-dashboard-body">
        <Sidebar activeBatch={activeBatch} onSelect={selectBatch} />
        <section className="exam-question-area">
          <div className="exam-topline"><div><p className="eyebrow">{batchLabel}</p><p className="exam-progress-label">Soal {currentNumber} dari {currentQuestions.length}</p></div><span className="save-indicator">{message || "Jawaban tersimpan otomatis"}</span></div>
          <GlassCard className="exam-question-card">
            <span className="question-type">{isChoice ? "Pilihan ganda" : isCase ? "Kasus" : "Essay"}</span>
            {isCase && currentQuestion.imageUrl && <Image alt="Stimulus soal" className="exam-stimulus" height={520} src={currentQuestion.imageUrl} width={1200} />}
            <h1>{currentQuestion.prompt}</h1>
            {isChoice ? <ChoiceInput answer={currentAnswer} onChange={saveAnswer} /> : <textarea aria-label={isCase ? "Jawaban kasus" : "Jawaban essay"} className="text-input exam-answer" onChange={(event) => saveAnswer(event.target.value)} placeholder="Tulis jawaban Anda di sini..." value={currentAnswer} />}
            <div className="exam-actions"><button className="secondary-button" disabled={activeBatch === "pilihanGanda" && currentNumber === 1} onClick={() => goPrevious(activeBatch, currentNumber, selectBatch, batches)}>Soal Sebelumnya</button><button className="primary-button" disabled={!currentAnswer.trim()} onClick={nextQuestion}>{isCase && currentNumber === currentQuestions.length ? "Selesaikan Tes" : "Soal Berikutnya"}</button></div>
          </GlassCard>
        </section>
        <QuestionNavigator activeBatch={activeBatch} batches={batches} answers={answers} currentNumber={currentNumber} onSelect={selectBatch} totalQuestions={totalQuestions} answeredCount={answeredCount} />
      </div>
      <footer className="exam-dashboard-footer">LABORATORIUM PSIKOLOGI</footer>
      {showFinishDialog && <FinishDialog onCancel={() => setShowFinishDialog(false)} onConfirm={() => { setFinished(true); setShowFinishDialog(false); }} />}
    </main>
  );
}

function goPrevious(batch: BatchKey, number: number, selectBatch: (batch: BatchKey, number?: number) => void, batches: Record<BatchKey, MockQuestion[]>) {
  if (number > 1) return selectBatch(batch, number - 1);
  if (batch === "essay") return selectBatch("pilihanGanda", batches.pilihanGanda.length);
  if (batch === "kasus") return selectBatch("essay", batches.essay.length);
}

function ChoiceInput({ answer, onChange }: { answer: string; onChange: (answer: string) => void }) {
  return <div className="exam-options">{options.map((option) => <button aria-pressed={answer === option} className={`option-button ${answer === option ? "selected" : ""}`} key={option} onClick={() => onChange(option)}><span className="option-radio" aria-hidden="true" /><span>{option}</span></button>)}</div>;
}

function Sidebar({ activeBatch, onSelect }: { activeBatch: BatchKey; onSelect: (batch: BatchKey) => void }) {
  return <aside className="exam-sidebar"><div className="exam-sidebar-title">Dashboard<br />Praktikan</div>{(["pilihanGanda", "essay", "kasus"] as BatchKey[]).map((batch) => <button className={`exam-sidebar-link ${activeBatch === batch ? "active" : ""}`} key={batch} onClick={() => onSelect(batch)}>{batch === "pilihanGanda" ? "Pilihan Ganda" : batch === "essay" ? "Essay" : "Kasus"}</button>)}</aside>;
}

function QuestionNavigator({ activeBatch, batches, answers, currentNumber, onSelect, totalQuestions, answeredCount }: { activeBatch: BatchKey; batches: Record<BatchKey, MockQuestion[]>; answers: AnswerMap; currentNumber: number; onSelect: (batch: BatchKey, number?: number) => void; totalQuestions: number; answeredCount: number }) {
  return <aside className="exam-navigator"><div className="navigator-heading"><strong>{activeBatch === "pilihanGanda" ? "Pilihan Ganda" : activeBatch === "essay" ? "Essay" : "Kasus"}</strong><span>{answeredCount}/{totalQuestions}</span></div><div className="question-grid">{batches[activeBatch].map((question, index) => { const number = index + 1; const key = `${activeBatch}-${number}`; const current = number === currentNumber; const answered = Boolean(answers[key]) && !current; return <button aria-label={`Buka ${activeBatch} soal ${number}`} className={`question-number ${current ? "current" : ""} ${answered ? "answered" : ""}`} key={`${activeBatch}-${question.id}`} onClick={() => onSelect(activeBatch, number)}>{number}</button>; })}</div><div className="exam-timer"><span aria-hidden="true" className="timer-icon">◷</span><span>12 : 32</span></div><p className="navigator-summary">{answeredCount} dari {totalQuestions} soal terjawab</p></aside>;
}

function PreflightScreen({ participantName, onStart }: { participantName: string; onStart: () => void }) {
  return <main className="exam-dashboard"><QuizHeader participantLabel={participantName} /><section className="preflight-layout"><GlassCard className="preflight-card"><p className="eyebrow">Sebelum memulai</p><h1 className="display-title preflight-title">Kenali sesi tes Anda.</h1><p className="body-lead preflight-lead">Luangkan waktu untuk membaca informasi berikut agar Anda dapat mengerjakan dengan nyaman dan sadar.</p><div className="preflight-list"><div className="preflight-item"><span className="lock-icon">i</span><div><strong>Tujuan tes</strong><p>Mengumpulkan respons untuk kebutuhan evaluasi praktikum psikologi.</p></div></div><div className="preflight-item"><span className="lock-icon">w</span><div><strong>Estimasi durasi</strong><p>Sekitar 15 menit. Anda dapat berpindah antar soal kapan saja.</p></div></div><div className="preflight-item"><span className="lock-icon">L</span><div><strong>Kerahasiaan data</strong><p>Respons Anda bersifat rahasia dan hanya dapat diakses oleh tim laboratorium.</p></div></div></div><button className="primary-button" onClick={onStart}>Saya mengerti dan siap memulai</button></GlassCard></section></main>;
}

function FinishDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return <div className="modal-backdrop"><div className="modal-card finish-dialog"><h2>Selesaikan tes?</h2><p>Pastikan seluruh jawaban sudah sesuai sebelum mengirim respons.</p><div className="modal-actions"><button className="secondary-button" onClick={onCancel}>Kembali</button><button className="primary-button" onClick={onConfirm}>Selesaikan Tes</button></div></div></div>;
}

function CompletionScreen() {
  return <main className="page-shell completion-shell"><div className="completion-ring"><span className="completion-mark">✓</span></div><p className="eyebrow">Respons diterima</p><h1 className="display-title completion-title">Terima kasih sudah menyelesaikan tes.</h1><p className="body-lead completion-copy">Jawaban Anda sudah tersimpan. Silakan ikuti arahan asisten lab untuk langkah berikutnya.</p><Link className="primary-button" href="/">Kembali ke halaman utama</Link></main>;
}