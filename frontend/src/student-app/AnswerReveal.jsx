import React, { useState } from 'react';
import { CheckCircle2, XCircle, ArrowRight, Sparkles, Brain, Cpu, Database, GitBranch, ShieldCheck } from 'lucide-react';

export default function AnswerReveal({ submitResult, onProceedToGapMap }) {
  const [activeTab, setActiveTab] = useState('reveal'); // 'reveal' | 'cascade'

  const reveals = submitResult?.reveal_payload || [];
  const masteries = submitResult?.concept_masteries || [];
  const scorePct = Math.round((submitResult?.score || 0) * 100);
  const cascade = submitResult?.cascade_status || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.65rem' }}>
      {/* Top Score Banner */}
      <div className="card" style={{ padding: '0.75rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-bright)' }}>
              Diagnostic Results & Answer Reveal
            </h2>
            <span className="badge badge-success">{scorePct}% Baseline Score</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
            {submitResult?.correct_count} of {submitResult?.total_questions} questions correct • 5-Step Recompute Cascade Completed
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '0.15rem' }}>
            <button
              onClick={() => setActiveTab('reveal')}
              style={{
                padding: '0.3rem 0.6rem',
                fontSize: '0.72rem',
                borderRadius: 5,
                background: activeTab === 'reveal' ? 'var(--color-primary)' : 'transparent',
                color: activeTab === 'reveal' ? '#fff' : 'var(--text-dim)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              Item-by-Item Reveal
            </button>
            <button
              onClick={() => setActiveTab('cascade')}
              style={{
                padding: '0.3rem 0.6rem',
                fontSize: '0.72rem',
                borderRadius: 5,
                background: activeTab === 'cascade' ? 'var(--color-primary)' : 'transparent',
                color: activeTab === 'cascade' ? '#fff' : 'var(--text-dim)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              Recompute Cascade (5 Steps)
            </button>
          </div>

          <button
            className="btn-primary"
            onClick={onProceedToGapMap}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            Explore Detected Gap Map <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Main Content Area (Tabbed) */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: '0.65rem' }}>
        {activeTab === 'reveal' ? (
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem', overflowY: 'auto', paddingRight: '0.2rem' }}>
            {reveals.map((r, idx) => {
              const isCorrect = r.is_correct;
              return (
                <div
                  key={idx}
                  className="card"
                  style={{
                    padding: '0.75rem',
                    borderLeft: `4px solid ${isCorrect ? 'var(--color-success)' : 'var(--color-danger)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        Question {idx + 1} • {r.concept_id}
                      </span>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          color: isCorrect ? 'var(--color-success)' : 'var(--color-danger)',
                        }}
                      >
                        {isCorrect ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        {isCorrect ? 'CORRECT' : 'INCORRECT'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.75rem', marginBottom: '0.4rem', color: 'var(--text-dim)' }}>
                      <div>Your Answer: <strong style={{ color: isCorrect ? 'var(--color-success)' : 'var(--color-danger)' }}>{r.student_answer}</strong></div>
                      {!isCorrect && (
                        <div>Correct Answer: <strong style={{ color: 'var(--color-success)' }}>{r.correct_answer}</strong></div>
                      )}
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', background: '#f8fafc', border: '1px solid var(--border-subtle)', padding: '0.45rem', borderRadius: 6, lineHeight: '1.35' }}>
                      <strong style={{ color: 'var(--text-bright)' }}>Explanation:</strong> {r.explanation}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Cascade Tab */
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
            <div className="card" style={{ padding: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: 'var(--color-primary)' }}>
                <Brain size={16} />
                <h3 style={{ fontSize: '0.85rem', fontWeight: '700' }}>1. BKT Mastery Update</h3>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.6rem' }}>
                Bayesian posterior updates applied across {masteries.length} concept nodes based on response correctness.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {masteries.slice(0, 5).map((m, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', background: '#f8fafc', padding: '0.25rem 0.4rem', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                    <span>{m.concept_id}</span>
                    <span style={{ color: m.delta >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {Math.round(m.prior_score * 100)}% → {Math.round(m.mastery_score * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: 'var(--color-accent)' }}>
                <GitBranch size={16} />
                <h3 style={{ fontSize: '0.85rem', fontWeight: '700' }}>2 & 3. Gap & Path Traversal</h3>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.6rem' }}>
                DAG traversal walked backward from low-mastery nodes to isolate earliest unmastered prerequisite.
              </p>
              <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', padding: '0.5rem', borderRadius: 6, fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: '1.4' }}>
                {cascade.gap_analyzer || 'Root bottleneck prerequisite successfully resolved.'}
              </div>
            </div>

            <div className="card" style={{ padding: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: 'var(--color-success)' }}>
                <Database size={16} />
                <h3 style={{ fontSize: '0.85rem', fontWeight: '700' }}>4 & 5. Recalibrate & Snapshot</h3>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.6rem' }}>
                Adaptive difficulty recalibrated to [1, 7] scale and immutable snapshot committed.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.72rem' }}>
                <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', padding: '0.4rem', borderRadius: 6 }}>
                  <strong>Quiz Recalibration:</strong> {cascade.quiz_engine || 'Calibrated based on baseline'}
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', padding: '0.4rem', borderRadius: 6 }}>
                  <strong>Profile Store:</strong> Append-only snapshot written for longitudinal tracking.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
