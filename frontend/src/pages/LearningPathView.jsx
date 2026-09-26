import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, Lightbulb, Code2, AlertOctagon, HelpCircle, ArrowRight, RefreshCw, CheckCircle, Target } from 'lucide-react';

export default function LearningPathView({ studentId = 'demo-student-1', onLaunchQuiz }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [showHint, setShowHint] = useState(false);

  const fetchPath = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/learning-path/${studentId}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch learning path:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPath();
  }, [studentId]);

  if (loading || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <RefreshCw size={32} className="spin" style={{ color: '#818CF8', margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)' }}>Generating personalized prerequisite path and streaming GenAI educational content...</p>
      </div>
    );
  }

  const { target_gap_concept, curriculum, genai_content, learning_strategy } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100%', overflow: 'hidden' }}>
      {/* View Header */}
      <div className="view-header" style={{ marginBottom: 0 }}>
        <div className="view-title-group">
          <h1>Personalized Learning Path & GenAI Pedagogy</h1>
          <p>
            Prerequisite-first curriculum sequenced by DAG depth with targeted GenAI conceptual breakdown for your weakest bottleneck.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => onLaunchQuiz(target_gap_concept.concept_id)}
          style={{ padding: '0.4rem 1.1rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
        >
          Take Adaptive Quiz on {target_gap_concept.concept_id} <ArrowRight size={14} />
        </button>
      </div>

      {/* Perfectly Aligned 3-Column Dashboard Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '230px 1.15fr 1.15fr', gap: '0.65rem', flex: 1, minHeight: 0 }}>
        
        {/* Column 1: Curriculum Sequence (230px) */}
        <div className="glass-panel" style={{ padding: '0.65rem 0.75rem', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem', flexShrink: 0 }}>
            <BookOpen size={15} color="#818CF8" />
            <h3 style={{ fontSize: '0.85rem', fontWeight: '700' }}>Curriculum Path</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', overflowY: 'auto', flex: 1, paddingRight: '0.2rem' }}>
            {curriculum.map((step) => {
              const isTarget = step.status === 'target_focus';
              const isMastered = step.status === 'mastered';
              const isPending = step.status === 'pending_prereq';

              return (
                <div
                  key={step.concept_id}
                  style={{
                    padding: '0.35rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isTarget
                      ? 'rgba(99, 102, 241, 0.15)'
                      : isMastered
                      ? 'rgba(16, 185, 129, 0.08)'
                      : 'rgba(30, 41, 59, 0.3)',
                    border: isTarget
                      ? '1px solid #6366F1'
                      : isMastered
                      ? '1px solid rgba(16, 185, 129, 0.25)'
                      : '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.3rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: isTarget ? '#6366F1' : isMastered ? '#10B981' : 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.625rem',
                        fontWeight: '700',
                        color: 'white',
                        flexShrink: 0,
                      }}
                    >
                      {step.sequence_order}
                    </span>
                    <span style={{ fontWeight: '600', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {step.concept_name}
                    </span>
                  </div>

                  {isTarget ? (
                    <span className="badge badge-bottleneck" style={{ fontSize: '0.6rem', padding: '0.05rem 0.3rem', flexShrink: 0 }}>
                      Target
                    </span>
                  ) : isMastered ? (
                    <span className="badge badge-mastered" style={{ fontSize: '0.6rem', padding: '0.05rem 0.3rem', flexShrink: 0 }}>
                      Done
                    </span>
                  ) : isPending ? (
                    <span className="badge badge-gap" style={{ fontSize: '0.6rem', padding: '0.05rem 0.3rem', flexShrink: 0 }}>
                      Blocked
                    </span>
                  ) : (
                    <span className="badge badge-ready" style={{ fontSize: '0.6rem', padding: '0.05rem 0.3rem', flexShrink: 0 }}>
                      Ready
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: GenAI Conceptual Pedagogy & Pitfalls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', minHeight: 0 }}>
          {/* Top: Mental Model & Concept Explanation */}
          <div
            className="glass-panel"
            style={{
              padding: '0.85rem 1rem',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', flexShrink: 0 }}>
              <span className="badge badge-ready" style={{ fontSize: '0.65rem' }}>
                <Sparkles size={11} color="#818CF8" /> GENAI PEDAGOGY: {genai_content.concept_name} ({genai_content.concept_id})
              </span>
            </div>

            {/* Mental Model Analogy Box */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                padding: '0.55rem 0.75rem',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '0.5rem',
                flexShrink: 0,
              }}
            >
              <Lightbulb size={18} color="#F59E0B" style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.75rem', color: '#FBBF24' }}>
                  Intuitive Mental Model
                </div>
                <div style={{ fontSize: '0.775rem', color: '#F1F5F9', lineHeight: '1.4' }}>
                  {genai_content.mental_model_analogy}
                </div>
              </div>
            </div>

            {/* Explanation */}
            <div style={{ fontSize: '0.8rem', lineHeight: '1.5', color: '#E2E8F0', overflowY: 'auto', flex: 1, paddingRight: '0.2rem' }}>
              {genai_content.explanation}
            </div>
          </div>

          {/* Bottom: Common Pitfalls Box */}
          <div className="glass-panel" style={{ padding: '0.75rem 1rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <AlertOctagon size={14} color="#EF4444" />
              <h4 style={{ fontSize: '0.8rem', fontWeight: '700' }}>Common Pitfalls to Avoid</h4>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {genai_content.common_pitfalls.slice(0, 3).map((pitfall, idx) => (
                <li
                  key={idx}
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    lineHeight: '1.35',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.4rem',
                  }}
                >
                  <span style={{ color: '#EF4444', fontWeight: '700' }}>✕</span>
                  <span>{pitfall}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Column 3: Worked Code Example, Mini Challenge, and Quiz CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', minHeight: 0 }}>
          {/* Worked Code Example */}
          <div className="glass-panel" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem', flexShrink: 0 }}>
              <Code2 size={15} color="#06B6D4" />
              <h3 style={{ fontSize: '0.85rem', fontWeight: '700' }}>Worked Example & Logic Trace</h3>
            </div>

            <pre className="code-block" style={{ margin: '0 0 0.45rem 0', flex: 1, minHeight: '80px', maxHeight: '140px', overflowY: 'auto' }}>
              <code>{genai_content.worked_example.code}</code>
            </pre>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '0.45rem', flexShrink: 0 }}>
              <div style={{ padding: '0.45rem', background: 'rgba(30, 41, 59, 0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.725rem' }}>
                <span style={{ color: 'var(--text-dim)', fontWeight: '700' }}>EXECUTION TRACE:</span>
                <div style={{ marginTop: '0.15rem', color: '#CBD5E1' }}>{genai_content.worked_example.walkthrough[0]}</div>
              </div>
              <div style={{ padding: '0.45rem', background: '#080B12', borderRadius: 'var(--radius-sm)', fontSize: '0.725rem' }}>
                <span style={{ color: 'var(--text-dim)', fontWeight: '700' }}>EXPECTED OUTPUT:</span>
                <div style={{ color: '#10B981', marginTop: '0.15rem', fontFamily: 'var(--font-mono)' }}>{genai_content.worked_example.expected_output}</div>
              </div>
            </div>
          </div>

          {/* Hands-On Mini Challenge */}
          <div className="glass-panel" style={{ padding: '0.75rem 1rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <HelpCircle size={14} color="#F59E0B" />
                <h4 style={{ fontSize: '0.8rem', fontWeight: '700' }}>Mini Challenge</h4>
              </div>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}
                onClick={() => setShowHint(!showHint)}
              >
                {showHint ? 'Hide Hint' : 'Show Solution Hint'}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-main)', lineHeight: '1.35', marginBottom: '0.3rem' }}>
              {genai_content.practice_challenge.prompt}
            </p>
            {showHint && (
              <div style={{ padding: '0.35rem 0.5rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', color: '#FBBF24' }}>
                {genai_content.practice_challenge.solution_hint}
              </div>
            )}
          </div>

          {/* Prominent CTA Button to proceed directly to Adaptive Quiz */}
          <div style={{ flexShrink: 0 }}>
            <button
              className="btn-primary"
              onClick={() => onLaunchQuiz(target_gap_concept.concept_id)}
              style={{ width: '100%', padding: '0.6rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              Take Adaptive Quiz on {target_gap_concept.concept_name} <ArrowRight size={15} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
