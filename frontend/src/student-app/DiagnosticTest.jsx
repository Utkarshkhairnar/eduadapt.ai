import React, { useState, useEffect } from 'react';
import { Activity, Clock, CheckCircle2, ArrowRight, ArrowLeft, Send, Sparkles, Brain } from 'lucide-react';

export default function DiagnosticTest({ studentId, subjectId, onCompleteWithReveal }) {
  const [loading, setLoading] = useState(true);
  const [assessmentData, setAssessmentData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

  useEffect(() => {
    async function fetchDiagnostic() {
      try {
        setLoading(true);
        const res = await fetch('/assessment/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': studentId,
            'X-User-Role': 'student',
          },
          body: JSON.stringify({
            student_id: studentId,
            subject_id: subjectId,
          }),
        });
        const data = await res.json();
        setAssessmentData(data);
      } catch (err) {
        console.error('Failed to start diagnostic:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDiagnostic();
  }, [studentId, subjectId]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleSelectOption = (qId, optionIdx) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [qId]: optionIdx,
    }));
  };

  const handleSubmit = async () => {
    if (!assessmentData || submitting) return;
    setSubmitting(true);

    const answersPayload = assessmentData.questions.map((q) => ({
      question_id: q.id,
      concept_id: q.concept_id,
      student_answer: selectedAnswers[q.id] !== undefined ? selectedAnswers[q.id] : 0,
      response_time_seconds: 5.0,
    }));

    try {
      const res = await fetch('/assessment/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': studentId,
          'X-User-Role': 'student',
        },
        body: JSON.stringify({
          student_id: studentId,
          subject_id: subjectId,
          answers: answersPayload,
        }),
      });
      const submitResult = await res.json();
      onCompleteWithReveal(submitResult);
    } catch (err) {
      console.error('Failed to submit assessment:', err);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.75rem', color: 'var(--text-muted)' }}>
        <div className="spinner" /> Assembling Breadth-First Diagnostic Test for {subjectId}...
      </div>
    );
  }

  const questions = assessmentData?.questions || [];
  const currentQ = questions[currentIndex] || {};
  const answeredCount = Object.keys(selectedAnswers).length;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progressPct = questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;
  const answeredPct = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  const diffScore = currentQ.difficulty || 3.0;
  const diffLabel = diffScore <= 2.5 ? 'EASY' : diffScore <= 5.0 ? 'MEDIUM' : 'HARD';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.65rem' }}>
      {/* Top Category Kicker and Title (As shown in Reference Image 2) */}
      <div style={{ textAlign: 'center', flexShrink: 0, padding: '0.1rem 0' }}>
        <div className="category-kicker" style={{ fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
          ADAPTIVE ASSESSMENTS
        </div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-bright)', margin: '0.15rem 0' }}>
          Assessments That Adapt to You
        </h1>
        <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
          Every question helps AI find the right challenge—not too easy, never overwhelming.
        </p>
      </div>

      {/* Main Split Layout: Left Dark Card | Right White Assessment Card */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr', gap: '0.85rem', minHeight: 0 }}>
        {/* Left Dark Dashboard Card (Reference Image 2 style) */}
        <div className="card-dark" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            {/* Current Level Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light-dim)' }}>Current Level</span>
              <span style={{ background: 'var(--bg-dark-pill)', color: '#ffffff', padding: '0.2rem 0.65rem', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', fontWeight: '600' }}>
                Intermediate
              </span>
            </div>

            {/* Question Difficulty 3-Segment Gauge */}
            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-light-dim)', marginBottom: '0.45rem' }}>
                Question difficulty
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
                {['Easy', 'Medium', 'Hard'].map((lvl) => {
                  const isActive = lvl.toUpperCase() === diffLabel;
                  return (
                    <div
                      key={lvl}
                      style={{
                        height: 5,
                        borderRadius: 3,
                        background: isActive ? '#ffffff' : '#333742',
                        transition: 'background 0.3s ease',
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-light-dim)', marginTop: '0.3rem' }}>
                <span>Easy</span>
                <span style={{ fontWeight: diffLabel === 'MEDIUM' ? '700' : '400', color: diffLabel === 'MEDIUM' ? '#ffffff' : 'inherit' }}>Medium</span>
                <span>Hard</span>
              </div>
            </div>

            {/* Performance Stat Box with Equalizer Bar Chart */}
            <div className="stat-box" style={{ padding: '0.85rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-light-dim)', marginBottom: '0.2rem' }}>Performance</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                  {answeredPct || 82}%
                </div>
                {/* Equalizer Bar Chart Visualizer */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 28 }}>
                  {[45, 60, 85, 70, 95, 80, 65, 88].map((h, i) => (
                    <div
                      key={i}
                      style={{
                        width: 4,
                        height: `${h}%`,
                        borderRadius: 2,
                        background: i >= 5 ? '#ffffff' : '#4b5563',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* AI Adjustment Callout */}
            <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '0.75rem', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.25rem' }}>
                <Sparkles size={12} color="#ffffff" /> AI adjustment
              </div>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-light-dim)', lineHeight: '1.4' }}>
                Diagnostic calibration in progress for {assessmentData?.subject_name}. Calibrating prerequisite baseline.
              </p>
            </div>
          </div>

          {/* Question Index Pills on Bottom */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {questions.map((q, idx) => {
              const isAnswered = selectedAnswers[q.id] !== undefined;
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    fontSize: '0.65rem',
                    fontWeight: '700',
                    border: isCurrent ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.1)',
                    background: isCurrent ? '#ffffff' : isAnswered ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.04)',
                    color: isCurrent ? '#000000' : isAnswered ? '#34d399' : '#94a3b8',
                    cursor: 'pointer',
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right White Assessment Card (Reference Image 2 style) */}
        <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>
          <div>
            {/* Header: Question counter & Clock Timer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                Question {currentIndex + 1} of {questions.length}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                <Clock size={14} />
                <span>{minutes < 10 ? `0${minutes}` : minutes}:{seconds < 10 ? `0${seconds}` : seconds}</span>
              </div>
            </div>

            {/* Thin Horizontal Progress Bar */}
            <div style={{ width: '100%', height: 4, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden', marginBottom: '1.2rem' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: '#0f172a', borderRadius: 9999, transition: 'width 0.3s ease' }} />
            </div>

            {/* Pill Badge */}
            <div style={{ marginBottom: '0.75rem' }}>
              <span className="badge badge-accent" style={{ fontSize: '0.68rem', padding: '0.2rem 0.6rem' }}>
                {diffLabel}
              </span>
            </div>

            {/* Question Text */}
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-bright)', lineHeight: '1.45', marginBottom: '1.25rem' }}>
              {currentQ.text}
            </h3>

            {/* Options in 2x2 Grid with Bold Letter Badges A, B, C, D */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {(currentQ.options || []).map((opt, oIdx) => {
                const letter = String.fromCharCode(65 + oIdx);
                const isSelected = selectedAnswers[currentQ.id] === oIdx;

                return (
                  <div
                    key={oIdx}
                    className={`option-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectOption(currentQ.id, oIdx)}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                    }}
                  >
                    <div className="option-indicator">
                      {letter}
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? '600' : '400', color: 'var(--text-main)' }}>
                      {opt}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Navigation Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)', marginTop: '0.85rem' }}>
            <button
              className="btn-secondary"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', opacity: currentIndex === 0 ? 0.4 : 1 }}
            >
              <ArrowLeft size={13} /> Previous
            </button>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {answeredCount} of {questions.length} answered
            </div>

            {currentIndex < questions.length - 1 ? (
              <button
                className="btn-primary"
                onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                style={{ padding: '0.45rem 1.25rem', fontSize: '0.8rem' }}
              >
                Next <ArrowRight size={13} />
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
                style={{ padding: '0.45rem 1.4rem', fontSize: '0.8rem', background: '#059669' }}
              >
                {submitting ? 'Scoring & Recomputing...' : 'Submit Diagnostic'} <Send size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
