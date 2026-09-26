import React, { useState, useEffect } from 'react';
import { HelpCircle, Sparkles, CheckCircle2, XCircle, ArrowRight, TrendingUp, TrendingDown, Flame, Brain, ShieldAlert } from 'lucide-react';

export default function AdaptiveQuiz({ studentId, subjectId, initialConceptId, onFinishQuiz }) {
  const [currentQuestionData, setCurrentQuestionData] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);

  const fetchNextQuestion = async () => {
    try {
      setLoading(true);
      setSelectedOption(null);
      setLastResult(null);

      const res = await fetch('/quiz/next-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': studentId,
          'X-User-Role': 'student',
        },
        body: JSON.stringify({
          student_id: studentId,
          subject_id: subjectId,
          concept_id: initialConceptId || null,
        }),
      });
      const data = await res.json();
      setCurrentQuestionData(data);
    } catch (err) {
      console.error('Failed to get next quiz question:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNextQuestion();
  }, [studentId, subjectId]);

  const handleSubmitAnswer = async () => {
    if (selectedOption === null || !currentQuestionData || submitting) return;
    setSubmitting(true);

    try {
      const q = currentQuestionData.question;
      const res = await fetch('/quiz/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': studentId,
          'X-User-Role': 'student',
        },
        body: JSON.stringify({
          student_id: studentId,
          subject_id: subjectId,
          question_id: q.id,
          concept_id: currentQuestionData.target_concept_id,
          student_answer: selectedOption,
          current_difficulty: currentQuestionData.current_difficulty,
        }),
      });
      const result = await res.json();
      setLastResult(result);
      setQuestionsAnswered((n) => n + 1);
    } catch (err) {
      console.error('Failed to submit quiz answer:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !currentQuestionData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.75rem', color: 'var(--text-muted)' }}>
        <div className="spinner" /> Calibrating Adaptive Item for {subjectId}...
      </div>
    );
  }

  const q = currentQuestionData?.question || {};
  const currentDiff = lastResult ? lastResult.new_difficulty : (currentQuestionData?.current_difficulty || 3.0);
  const streak = lastResult ? lastResult.streak : (currentQuestionData?.current_streak || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.65rem' }}>
      {/* Top Adaptive Status Bar */}
      <div className="card" style={{ padding: '0.65rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ background: '#f1f5f9', color: '#0f172a', padding: '0.35rem', borderRadius: 8 }}>
            <HelpCircle size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '0.98rem', fontWeight: '700', color: 'var(--text-bright)' }}>
              Adaptive Real-Time Item Engine
            </h2>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Biasing toward: <strong>{currentQuestionData?.target_concept_name || currentQuestionData?.target_concept_id}</strong>
            </div>
          </div>
        </div>

        {/* Difficulty Scale [1, 7] & Streak */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          {/* Difficulty Gauge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Difficulty:</span>
            <div style={{ display: 'flex', gap: '0.2rem' }}>
              {[1, 2, 3, 4, 5, 6, 7].map((lvl) => {
                const isActive = lvl <= Math.round(currentDiff);
                return (
                  <div
                    key={lvl}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      fontSize: '0.6rem',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isActive ? (lvl <= 2 ? '#0ea5e9' : lvl <= 5 ? '#f59e0b' : '#ef4444') : '#f1f5f9',
                      color: isActive ? '#ffffff' : 'var(--text-muted)',
                    }}
                  >
                    {lvl}
                  </div>
                );
              })}
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-bright)', marginLeft: '0.2rem' }}>
              {currentDiff}/7
            </span>
          </div>

          {/* Streak Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: '700', color: streak > 0 ? '#f59e0b' : 'var(--text-dim)' }}>
            <Flame size={14} />
            <span>Streak: {streak}</span>
          </div>

          <button
            className="btn-secondary"
            onClick={onFinishQuiz}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem' }}
          >
            Finish & Review Progress
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left (Question) | Right (Real-time BKT & Difficulty Feedback) */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.65rem', minHeight: 0 }}>
        {/* Left Question Card */}
        <div className="card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="badge badge-accent" style={{ fontSize: '0.68rem' }}>
                Item {questionsAnswered + 1} • {currentQuestionData?.target_concept_id}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Target Difficulty: <strong>{q.difficulty || currentDiff}/7</strong>
              </span>
            </div>

            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-bright)', lineHeight: '1.4', marginBottom: '0.8rem' }}>
              {q.text}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {(q.options || []).map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isRevealed = lastResult !== null;
                const isCorrect = isRevealed && (lastResult.correct_answer === String(idx) || opt.trim().toLowerCase() === String(lastResult.correct_answer).toLowerCase());

                let optBorder = '1.5px solid var(--border-subtle)';
                let optBg = '#ffffff';
                if (isRevealed) {
                  if (isCorrect) {
                    optBorder = '2px solid var(--color-success)';
                    optBg = '#f0fdf4';
                  } else if (isSelected) {
                    optBorder = '2px solid var(--color-danger)';
                    optBg = '#fef2f2';
                  }
                } else if (isSelected) {
                  optBorder = '2px solid #0f172a';
                  optBg = '#f8fafc';
                }

                return (
                  <div
                    key={idx}
                    onClick={() => !isRevealed && setSelectedOption(idx)}
                    style={{
                      padding: '0.65rem 0.8rem',
                      borderRadius: 6,
                      border: optBorder,
                      background: optBg,
                      cursor: isRevealed ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    <div style={{ width: 22, height: 22, borderRadius: 6, border: isSelected ? 'none' : '1.5px solid #cbd5e1', background: isSelected ? '#0f172a' : '#ffffff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.72rem', color: isSelected ? '#ffffff' : '#0f172a' }}>{['A','B','C','D'][idx] || idx+1}</div>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: isSelected ? '600' : '400' }}>
                      {opt}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Row */}
          <div style={{ paddingTop: '0.6rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            {!lastResult ? (
              <button
                className="btn-primary"
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null || submitting}
                style={{ padding: '0.4rem 1rem', fontSize: '0.78rem' }}
              >
                {submitting ? 'Evaluating...' : 'Confirm Answer'}
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={fetchNextQuestion}
                style={{ padding: '0.4rem 1rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                Next Adaptive Item <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Right Real-time Feedback Card */}
        <div className="card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-bright)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Brain size={16} color="var(--color-primary)" /> BKT & Difficulty Feedback
            </h3>

            {lastResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* Result Pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem', borderRadius: 6, background: lastResult.is_correct ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', border: `1px solid ${lastResult.is_correct ? 'var(--color-success)' : 'var(--color-danger)'}` }}>
                  {lastResult.is_correct ? <CheckCircle2 size={16} color="var(--color-success)" /> : <XCircle size={16} color="var(--color-danger)" />}
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: '700', color: lastResult.is_correct ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {lastResult.is_correct ? 'CORRECT! Difficulty Stepped Up' : 'INCORRECT. Difficulty Dampened'}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                      {lastResult.difficulty_adjustment_reason}
                    </div>
                  </div>
                </div>

                {/* Explanation */}
                <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: '1.35' }}>
                  <strong>Explanation:</strong> {lastResult.explanation}
                </div>

                {/* BKT Bayes Breakdown */}
                <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#334155', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    Bayesian Knowledge Trace Update
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                    <span>Prior Latent Mastery:</span>
                    <strong>{Math.round(lastResult.bkt_update.prior_mastery * 100)}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                    <span>Observation Evidence:</span>
                    <strong>{lastResult.bkt_update.formula_used}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                    <span>Posterior + Transition Gain:</span>
                    <strong style={{ color: lastResult.bkt_update.delta >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {Math.round(lastResult.bkt_update.new_mastery * 100)}% ({lastResult.bkt_update.delta >= 0 ? '+' : ''}{Math.round(lastResult.bkt_update.delta * 100)}%)
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                <p>
                  As you answer items, this panel executes the Bayesian Knowledge Tracing rule:
                </p>
                <div style={{ background: '#18191d', padding: '0.5rem', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#a5f3fc' }}>
                  next_diff = curr_diff + 1.0 * (is_correct ? +1 : -1)
                  <br />
                  clamped to [1.0, 7.0]
                </div>
                <p>
                  Current student mastery for <strong>{currentQuestionData?.target_concept_id}</strong> is <strong>{Math.round((currentQuestionData?.student_current_mastery || 0.25) * 100)}%</strong>.
                </p>
              </div>
            )}
          </div>

          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center', paddingTop: '0.4rem', borderTop: '1px solid var(--border-subtle)' }}>
            Bounded Step Rule Clamped to [1.0, 7.0] • Append-Only DB Snapshot
          </div>
        </div>
      </div>
    </div>
  );
}
