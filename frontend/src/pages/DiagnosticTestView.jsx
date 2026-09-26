import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, ChevronRight, AlertCircle, Clock, Zap, Sparkles } from 'lucide-react';

export default function DiagnosticTestView({ onComplete, studentId = 'demo-student-1' }) {
  const [loading, setLoading] = useState(false);
  const [assessmentData, setAssessmentData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer
  useEffect(() => {
    if (!assessmentData || result) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [assessmentData, result]);

  const startDiagnostic = async () => {
    setLoading(true);
    try {
      const res = await fetch('/assessment/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, student_name: 'Alex Rivera' }),
      });
      const data = await res.json();
      setAssessmentData(data);
      setCurrentIndex(0);
      setAnswers({});
      setResult(null);
      setElapsedSeconds(0);
    } catch (err) {
      console.error('Failed to start diagnostic:', err);
      alert('Error connecting to backend API');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (optionIndex) => {
    if (result) return;
    const q = assessmentData.questions[currentIndex];
    setAnswers((prev) => ({
      ...prev,
      [q.id]: {
        question_id: q.id,
        concept_id: q.concept_id,
        selected_option: optionIndex,
        response_time_seconds: 5.0,
      },
    }));
  };

  // Quick fill for judging demo: simulates student who knows basics (C01-C03) but fails C04-C12
  const quickFillRealisticDemo = () => {
    if (!assessmentData) return;
    const simulated = {};
    assessmentData.questions.forEach((q, idx) => {
      // Questions 0, 1, 2 get answer 1 (often correct in seed bank), others get 0
      const chosen = idx < 3 ? 1 : (idx % 2 === 0 ? 0 : 3);
      simulated[q.id] = {
        question_id: q.id,
        concept_id: q.concept_id,
        selected_option: chosen,
        response_time_seconds: 4.5,
      };
    });
    setAnswers(simulated);
  };

  const submitAssessment = async () => {
    if (!assessmentData) return;
    setSubmitting(true);
    try {
      const payload = {
        attempt_id: assessmentData.attempt_id,
        student_id: studentId,
        answers: Object.values(answers),
      };
      const res = await fetch('/assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Submit failed:', err);
      alert('Failed to submit diagnostic assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!assessmentData) {
    return (
      <div className="glass-panel" style={{ padding: '2rem 1.5rem', textAlign: 'center', maxWidth: '680px', margin: 'auto' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#818CF8' }}>
          <Play size={24} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.4rem' }}>
          Initial Diagnostic Assessment
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5', maxWidth: '540px', margin: '0 auto 1.25rem' }}>
          Maps your baseline latent mastery across all 12 curriculum concepts, allowing our Bayesian Knowledge Tracer and Concept Graph Analyzer to identify prerequisite bottlenecks.
        </p>
        <button className="btn-primary" onClick={startDiagnostic} disabled={loading} style={{ padding: '0.65rem 1.75rem', fontSize: '0.9rem' }}>
          <Zap size={16} /> {loading ? 'Initializing Diagnostic...' : 'Start Diagnostic Assessment'}
        </button>
      </div>
    );
  }

  // Result view (Fit-to-screen side-by-side)
  if (result) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0.75rem', height: '100%', overflow: 'hidden' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
            <CheckCircle2 size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.25rem' }}>
            Diagnostic Complete!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>{result.summary_message}</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <div className="stat-card cyan glass-panel" style={{ padding: '0.5rem' }}>
              <span className="stat-label">Baseline Score</span>
              <span className="stat-value" style={{ fontSize: '1.2rem' }}>{result.score}%</span>
              <span className="stat-sub">{result.correct_count} of {result.total_questions} correct</span>
            </div>
            <div className="stat-card emerald glass-panel" style={{ padding: '0.5rem' }}>
              <span className="stat-label">BKT Tracer</span>
              <span className="stat-value" style={{ fontSize: '1.2rem' }}>Calibrated</span>
              <span className="stat-sub">12 concept priors updated</span>
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={() => onComplete && onComplete()}
            style={{ padding: '0.65rem 1.5rem', fontSize: '0.875rem' }}
          >
            Knowledge Gap Analysis <ChevronRight size={16} />
          </button>
        </div>

        {/* Detailed Concept Breakdown Table */}
        <div className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem', flexShrink: 0 }}>
            Calibrated Concept Masteries
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto', flex: 1 }}>
            {result.concept_masteries.map((cm) => (
              <div
                key={cm.concept_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.35rem 0.65rem',
                  background: 'rgba(30, 41, 59, 0.4)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#818CF8', fontWeight: '700' }}>
                    {cm.concept_id}
                  </span>
                  <span style={{ fontWeight: '600', fontSize: '0.8rem' }}>{cm.concept_name}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: 80 }}>
                    <div className="meter-track" style={{ height: 5 }}>
                      <div
                        className={`meter-fill ${cm.is_mastered ? 'emerald' : (cm.is_weak_gap ? 'rose' : 'amber')}`}
                        style={{ width: `${Math.round(cm.mastery_score * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: '700', width: '32px', textAlign: 'right' }}>
                    {Math.round(cm.mastery_score * 100)}%
                  </span>
                  {cm.is_mastered ? (
                    <span className="badge badge-mastered" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>Mastered</span>
                  ) : cm.is_weak_gap ? (
                    <span className="badge badge-gap" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>Gap</span>
                  ) : (
                    <span className="badge badge-bottleneck" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>In Progress</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentQ = assessmentData.questions[currentIndex];
  const selectedAns = answers[currentQ.id]?.selected_option;
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = assessmentData.questions.length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.65rem', height: '100%', justifyContent: 'center' }}>
      {/* Top Header & Progress */}
      <div className="glass-panel" style={{ padding: '0.65rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: '700', fontSize: '0.875rem' }}>
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <span className="badge badge-ready" style={{ fontSize: '0.7rem' }}>{currentQ.concept_name}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <Clock size={14} />
            <span style={{ fontFamily: 'var(--font-mono)' }}>{formatTime(elapsedSeconds)}</span>
          </div>
          <button
            className="btn-secondary"
            onClick={quickFillRealisticDemo}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
            title="Auto-fill sample answers to quickly preview the rest of the demo cycle"
          >
            <Sparkles size={13} color="#818CF8" /> Quick-Fill Demo
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="meter-track" style={{ height: 4 }}>
        <div className="meter-fill emerald" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Question Card */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', lineHeight: '1.4', marginBottom: '0.5rem' }}>
          {currentQ.prompt}
        </h3>

        {currentQ.code_snippet && (
          <pre className="code-block">
            <code>{currentQ.code_snippet}</code>
          </pre>
        )}

        {/* Options */}
        <div className="options-list">
          {currentQ.options.map((optionText, optIdx) => {
            const isSelected = selectedAns === optIdx;
            const letters = ['A', 'B', 'C', 'D'];
            return (
              <div
                key={optIdx}
                className={`option-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelectOption(optIdx)}
              >
                <div className="option-indicator">{letters[optIdx]}</div>
                <div style={{ fontSize: '0.85rem', color: isSelected ? '#FFFFFF' : 'var(--text-main)' }}>
                  {optionText}
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
          <button
            className="btn-secondary"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
          >
            Previous
          </button>

          {currentIndex < totalQuestions - 1 ? (
            <button
              className="btn-primary"
              onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
              disabled={selectedAns === undefined}
              style={{ fontSize: '0.8rem', padding: '0.4rem 1.1rem' }}
            >
              Next Question <ChevronRight size={14} />
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={submitAssessment}
              disabled={answeredCount < totalQuestions || submitting}
              style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', fontSize: '0.85rem', padding: '0.45rem 1.25rem' }}
            >
              {submitting ? 'Submitting...' : 'Submit Diagnostic'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
