import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Flame, Snowflake, CheckCircle2, XCircle, ArrowRight, RefreshCw, Calculator, HelpCircle, Award, Target } from 'lucide-react';

export default function AdaptiveQuizView({ studentId = 'demo-student-1', initialConceptId = null, onFinishQuiz }) {
  const [loading, setLoading] = useState(true);
  const [questionData, setQuestionData] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);

  const fetchNextQuestion = async (cid = null) => {
    setLoading(true);
    setSelectedOption(null);
    setSubmitResult(null);
    try {
      const res = await fetch('/quiz/next-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          concept_id: cid || (questionData ? questionData.target_concept_id : initialConceptId),
        }),
      });
      const data = await res.json();
      setQuestionData(data);
    } catch (err) {
      console.error('Failed to load next adaptive question:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNextQuestion(initialConceptId);
  }, [studentId, initialConceptId]);

  const handleSubmitAnswer = async () => {
    if (selectedOption === null || !questionData) return;
    setSubmitting(true);
    try {
      const payload = {
        student_id: studentId,
        question_id: questionData.question.id,
        concept_id: questionData.target_concept_id,
        selected_option: selectedOption,
        difficulty: questionData.current_difficulty,
        response_time_seconds: 5.0,
      };

      const res = await fetch('/quiz/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setSubmitResult(data);
      setSessionCount((prev) => prev + 1);

      if (data.is_correct) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#10B981', '#6366F1', '#34D399', '#FBBF24'],
        });
      }
    } catch (err) {
      console.error('Failed to submit quiz answer:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !questionData) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <RefreshCw size={32} className="spin" style={{ color: '#818CF8', margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)' }}>Calibrating IRT adaptive item selection for current mastery...</p>
      </div>
    );
  }

  const q = questionData?.question;
  const diffPct = Math.round(questionData.current_difficulty * 100);
  const streak = questionData.current_streak;

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.65rem', height: '100%', justifyContent: 'center' }}>
      {/* Header & Adaptive Status Bar */}
      <div className="view-header">
        <div className="view-title-group">
          <h1>Real-Time Adaptive Quiz Engine</h1>
          <p>
            Dynamically scales item difficulty based on rolling streak and recalculates Bayesian Knowledge Tracing.
          </p>
        </div>

        <button className="btn-secondary" onClick={() => onFinishQuiz && onFinishQuiz()} style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
          Finish & View Profile <ArrowRight size={13} />
        </button>
      </div>

      {/* Adaptive Dashboard Meters: Difficulty, Streak, BKT Mastery */}
      <div className="stats-grid">
        {/* Adaptive Difficulty Card */}
        <div className="stat-card cyan glass-panel" style={{ padding: '0.5rem 0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Adaptive IRT</span>
            <span style={{ fontSize: '0.7rem', color: '#06B6D4', fontWeight: '700' }}>Item Step</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span className="stat-value" style={{ fontSize: '1.25rem' }}>{questionData.current_difficulty.toFixed(2)}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 1.00</span>
          </div>
          <div className="meter-track" style={{ height: 4 }}>
            <div className="meter-fill" style={{ width: `${diffPct}%`, background: 'linear-gradient(90deg, #06B6D4, #3B82F6)' }} />
          </div>
        </div>

        {/* Rolling Streak Card */}
        <div className={`stat-card glass-panel ${streak > 0 ? 'emerald' : (streak < 0 ? 'rose' : '')}`} style={{ padding: '0.5rem 0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Rolling Streak</span>
            {streak >= 2 ? (
              <span className="badge badge-bottleneck" style={{ padding: '0.05rem 0.35rem', fontSize: '0.65rem' }}>
                <Flame size={10} /> Hot
              </span>
            ) : streak <= -2 ? (
              <span className="badge badge-gap" style={{ padding: '0.05rem 0.35rem', fontSize: '0.65rem' }}>
                <Snowflake size={10} /> Damp
              </span>
            ) : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="stat-value" style={{ fontSize: '1.25rem', color: streak > 0 ? '#10B981' : (streak < 0 ? '#EF4444' : '#F8FAFC') }}>
              {streak > 0 ? `+${streak}` : streak}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {streak > 0 ? 'Consecutive' : 'Error Streak'}
            </span>
          </div>
        </div>

        {/* BKT Latent Mastery Card */}
        <div className="stat-card amber glass-panel" style={{ padding: '0.5rem 0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Concept P(L)</span>
            <span style={{ fontSize: '0.7rem', color: '#FBBF24', fontFamily: 'var(--font-mono)' }}>{questionData.target_concept_id}</span>
          </div>
          <span className="stat-value" style={{ fontSize: '1.25rem' }}>
            {Math.round(questionData.student_current_mastery * 100)}%
          </span>
          <div className="meter-track" style={{ height: 4 }}>
            <div
              className={`meter-fill ${questionData.student_current_mastery >= 0.7 ? 'emerald' : 'amber'}`}
              style={{ width: `${Math.round(questionData.student_current_mastery * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question Presentation Card */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-ready" style={{ fontSize: '0.7rem' }}>{questionData.target_concept_name}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              {q.id}
            </span>
          </div>
          <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
            Difficulty: <strong style={{ color: '#06B6D4' }}>{q.difficulty.toFixed(2)}</strong>
          </span>
        </div>

        <h3 style={{ fontSize: '0.95rem', fontWeight: '700', lineHeight: '1.4', marginBottom: '0.4rem' }}>
          {q.prompt}
        </h3>

        {q.code_snippet && (
          <pre className="code-block" style={{ margin: '0.35rem 0' }}>
            <code>{q.code_snippet}</code>
          </pre>
        )}

        {/* Option Selection Cards */}
        <div className="options-list">
          {q.options.map((optionText, optIdx) => {
            const isSelected = selectedOption === optIdx;
            let statusClass = '';

            if (submitResult) {
              if (optIdx === submitResult.correct_option) {
                statusClass = 'correct';
              } else if (isSelected && !submitResult.is_correct) {
                statusClass = 'wrong';
              }
            } else if (isSelected) {
              statusClass = 'selected';
            }

            const letters = ['A', 'B', 'C', 'D'];
            return (
              <div
                key={optIdx}
                className={`option-card ${statusClass}`}
                onClick={() => !submitResult && setSelectedOption(optIdx)}
              >
                <div className="option-indicator">{letters[optIdx]}</div>
                <div style={{ fontSize: '0.85rem', color: isSelected || (submitResult && optIdx === submitResult.correct_option) ? '#FFFFFF' : 'var(--text-main)' }}>
                  {optionText}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button: Submit or Proceed */}
        {!submitResult ? (
          <div style={{ textAlign: 'right', marginTop: '0.75rem' }}>
            <button
              className="btn-primary"
              onClick={handleSubmitAnswer}
              disabled={selectedOption === null || submitting}
              style={{ padding: '0.45rem 1.5rem', fontSize: '0.85rem' }}
            >
              {submitting ? 'Updating BKT Tracing...' : 'Submit Answer'}
            </button>
          </div>
        ) : (
          /* Answer Feedback & Real-Time Math Breakdown */
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Feedback Banner */}
            <div
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: submitResult.is_correct
                  ? 'rgba(16, 185, 129, 0.12)'
                  : 'rgba(239, 68, 68, 0.12)',
                border: submitResult.is_correct
                  ? '1px solid rgba(16, 185, 129, 0.35)'
                  : '1px solid rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {submitResult.is_correct ? (
                <CheckCircle2 size={18} color="#10B981" style={{ flexShrink: 0 }} />
              ) : (
                <XCircle size={18} color="#EF4444" style={{ flexShrink: 0 }} />
              )}
              <div style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                <strong style={{ color: submitResult.is_correct ? '#34D399' : '#F87171' }}>
                  {submitResult.is_correct ? 'Correct! ' : 'Incorrect. '}
                </strong>
                <span>{submitResult.explanation}</span>
              </div>
            </div>

            {/* BKT Math & IRT Difficulty Adjustment Box */}
            <div
              className="glass-panel"
              style={{
                padding: '0.65rem 0.85rem',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid var(--border-accent)',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', fontSize: '0.775rem' }}>
                {/* BKT Column */}
                <div style={{ padding: '0.45rem', background: 'rgba(30, 41, 59, 0.4)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontWeight: '700', color: '#818CF8', marginBottom: '0.2rem' }}>
                    Corbett & Anderson BKT Update
                  </div>
                  <div>Prior P(L): <span style={{ fontFamily: 'var(--font-mono)' }}>{submitResult.bkt_update.prior_mastery}</span> → New P(L): <span style={{ color: submitResult.bkt_update.delta >= 0 ? '#10B981' : '#EF4444', fontFamily: 'var(--font-mono)', fontWeight: '700' }}>{submitResult.bkt_update.new_mastery} ({submitResult.bkt_update.delta >= 0 ? '+' : ''}{submitResult.bkt_update.delta})</span></div>
                  <div>Transit Gain: +{submitResult.bkt_update.transit_addition}</div>
                </div>

                {/* IRT Difficulty Column */}
                <div style={{ padding: '0.45rem', background: 'rgba(30, 41, 59, 0.4)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontWeight: '700', color: '#06B6D4', marginBottom: '0.2rem' }}>
                    Adaptive IRT Step
                  </div>
                  <div>Diff: {submitResult.previous_difficulty} → <strong style={{ color: '#06B6D4' }}>{submitResult.new_difficulty}</strong> ({submitResult.difficulty_adjustment_reason})</div>
                </div>
              </div>
            </div>

            {/* Next Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button
                className="btn-primary"
                onClick={() => fetchNextQuestion(questionData.target_concept_id)}
                style={{ padding: '0.45rem 1.25rem', fontSize: '0.8rem' }}
              >
                Next Adaptive Question <ArrowRight size={14} />
              </button>
              <button
                className="btn-secondary"
                onClick={() => onFinishQuiz && onFinishQuiz()}
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
              >
                View Profile Deltas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
