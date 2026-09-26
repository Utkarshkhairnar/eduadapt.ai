import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  Code2,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Layers,
  Cpu,
  ThumbsUp,
  RefreshCw,
  Send,
  MessageSquareQuote,
  CornerDownRight
} from 'lucide-react';

export default function LearningPath({ studentId, subjectId, targetConceptId, onLaunchQuiz }) {
  const [pathData, setPathData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dynamic explanation override (for "Explain differently")
  const [currentExplanation, setCurrentExplanation] = useState('');
  const [currentAnalogy, setCurrentAnalogy] = useState('');
  const [feedbackState, setFeedbackState] = useState(null); // 'helped' | 'regenerating' | 'done_diff'
  const [isRegenerating, setIsRegenerating] = useState(false);

  // "Ask About This" Contextual Doubt State
  const [doubtText, setDoubtText] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [doubtHistory, setDoubtHistory] = useState([]); // array of { question, answer }
  const [followUpMode, setFollowUpMode] = useState(false);

  useEffect(() => {
    async function fetchLearningPath() {
      try {
        setLoading(true);
        const res = await fetch(`/learning-path/${studentId}/${subjectId}`, {
          headers: {
            'X-User-Id': studentId,
            'X-User-Role': 'student',
          },
        });
        const data = await res.json();
        setPathData(data);
        if (data?.genai_content) {
          setCurrentExplanation(data.genai_content.explanation || '');
          setCurrentAnalogy(data.genai_content.mental_model_analogy || '');
        }
      } catch (err) {
        console.error('Failed to load learning path:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLearningPath();
  }, [studentId, subjectId]);

  const targetGap = pathData?.target_gap_concept;
  const activeConceptId = targetGap?.concept_id || pathData?.curriculum?.[0]?.concept_id || `${subjectId}.C01`;
  const activeConceptName = targetGap?.concept_name || pathData?.curriculum?.[0]?.concept_name || 'Concept';

  // Handler for "This helped"
  const handleFeedbackHelped = async () => {
    setFeedbackState('helped');
    try {
      await fetch('/learning-support/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': studentId,
          'X-User-Role': 'student',
        },
        body: JSON.stringify({
          content_id: `lesson_${activeConceptId}`,
          student_id: studentId,
          helpful: true,
          concept_name: activeConceptName,
          concept_id: activeConceptId,
        }),
      });
    } catch (err) {
      console.error('Error logging feedback:', err);
    }
  };

  // Handler for "Explain differently"
  const handleExplainDifferently = async () => {
    setIsRegenerating(true);
    setFeedbackState('regenerating');
    try {
      const res = await fetch('/learning-support/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': studentId,
          'X-User-Role': 'student',
        },
        body: JSON.stringify({
          content_id: `lesson_${activeConceptId}`,
          student_id: studentId,
          helpful: false,
          concept_name: activeConceptName,
          concept_id: activeConceptId,
          previous_content: `${currentAnalogy} ${currentExplanation}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.alternative_explanation) {
          setCurrentExplanation(data.alternative_explanation);
          setCurrentAnalogy('Fresh perspective tailored to your pace and learning preferences.');
          setFeedbackState('done_diff');
        }
      }
    } catch (err) {
      console.error('Error regenerating alternative explanation:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Handler for "Ask about this" doubt submission
  const handleAskDoubt = async (e) => {
    e?.preventDefault();
    if (!doubtText.trim() || isAsking) return;

    const query = doubtText.trim();
    setDoubtText('');
    setIsAsking(true);

    try {
      // Build previous context if follow-up turn
      const prevContext = doubtHistory.length > 0
        ? `Q: ${doubtHistory[0].question}\nA: ${doubtHistory[0].answer}`
        : null;

      const res = await fetch('/learning-support/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': studentId,
          'X-User-Role': 'student',
        },
        body: JSON.stringify({
          student_id: studentId,
          subject_id: subjectId,
          concept_id: activeConceptId,
          question_text: query,
          previous_context: prevContext,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDoubtHistory((prev) => [...prev, { question: query, answer: data.ai_response }]);
        setFollowUpMode(false);
      }
    } catch (err) {
      console.error('Error asking doubt:', err);
    } finally {
      setIsAsking(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.75rem', color: 'var(--text-muted)' }}>
        <div className="spinner" /> Synthesizing Prerequisite Curriculum & Personalized AI Pedagogy...
      </div>
    );
  }

  const curriculum = pathData?.curriculum || [];
  const genai = pathData?.genai_content;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.65rem', overflow: 'hidden' }}>
      {/* Top Banner */}
      <div className="card" style={{ padding: '0.6rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '0.98rem', fontWeight: '800', color: 'var(--text-bright)' }}>
              Targeted Prerequisite Curriculum — {pathData?.subject_name}
            </h2>
            <span className="badge badge-accent">Topological Prerequisite Ordering</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
            {pathData?.learning_strategy}
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => onLaunchQuiz(targetGap?.concept_id || curriculum[0]?.concept_id)}
          style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}
        >
          Launch Adaptive Quiz <ArrowRight size={13} />
        </button>
      </div>

      {/* 3-Column Interface */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '0.95fr 1.25fr 1.25fr', gap: '0.65rem', minHeight: 0 }}>
        {/* Column 1: Curriculum Progression */}
        <div className="card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', flexShrink: 0 }}>
            <Layers size={15} color="var(--color-primary)" />
            <h3 style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-bright)' }}>
              Topological Progression
            </h3>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto', paddingRight: '0.2rem' }}>
            {curriculum.map((step) => {
              const isTarget = targetGap && (step.concept_id === targetGap.concept_id || step.raw_concept_id === targetGap.raw_concept_id);
              const isMastered = step.status === 'mastered';

              return (
                <div
                  key={step.concept_id}
                  style={{
                    padding: '0.45rem 0.6rem',
                    borderRadius: 6,
                    border: isTarget ? '1.5px solid var(--color-danger)' : '1px solid var(--border-subtle)',
                    background: isTarget ? '#fef2f2' : isMastered ? '#f0fdf4' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.4rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: '700', color: isTarget ? 'var(--color-danger)' : 'var(--text-muted)', width: 14 }}>
                      #{step.sequence_order}
                    </span>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-bright)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {step.concept_name}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        Diff: {step.difficulty_base}/7 • {Math.round(step.current_mastery * 100)}%
                      </div>
                    </div>
                  </div>

                  <span className={`badge ${isMastered ? 'badge-success' : isTarget ? 'badge-danger' : 'badge-accent'}`} style={{ fontSize: '0.6rem', padding: '0.15rem 0.35rem', flexShrink: 0 }}>
                    {isTarget ? 'FOCUS' : isMastered ? 'DONE' : 'PENDING'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: GenAI Pedagogical Framework + Feedback */}
        <div className="card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>
          <div style={{ overflowY: 'auto', paddingRight: '0.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={15} color="var(--color-accent)" />
                <h3 style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-bright)' }}>
                  AI Lesson: {activeConceptName}
                </h3>
              </div>
              <span className="badge badge-accent" style={{ fontSize: '0.6rem' }}>Tailored Style</span>
            </div>

            {/* Mental Model Analogy */}
            <div style={{ background: 'rgba(37, 99, 235, 0.05)', padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid rgba(37, 99, 235, 0.15)', marginBottom: '0.55rem' }}>
              <div style={{ fontSize: '0.67rem', fontWeight: '800', color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Sparkles size={11} /> Mental Model Analogy
              </div>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#1e293b', lineHeight: '1.4', fontStyle: 'italic' }}>
                "{currentAnalogy || genai?.mental_model_analogy}"
              </p>
            </div>

            {/* Core Explanation */}
            <div style={{ marginBottom: '0.55rem', background: '#ffffff', padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.67rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                Core Conceptual Principle
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#334155', lineHeight: '1.45' }}>
                {currentExplanation || genai?.explanation}
              </p>
            </div>

            {/* Section 3: "This helped" / "Explain differently" Feedback Affordance */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.4rem 0.6rem',
                background: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                marginBottom: '0.55rem',
              }}
            >
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                {feedbackState === 'helped' ? (
                  <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCircle2 size={13} /> Marked as helpful!
                  </span>
                ) : feedbackState === 'done_diff' ? (
                  <span style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Sparkles size={13} /> Fresh angle applied!
                  </span>
                ) : (
                  'Did this explanation click?'
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  onClick={handleFeedbackHelped}
                  disabled={feedbackState === 'helped' || isRegenerating}
                  style={{
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.68rem',
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                    background: feedbackState === 'helped' ? '#dcfce7' : '#ffffff',
                    color: feedbackState === 'helped' ? 'var(--color-success)' : 'var(--text-bright)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontWeight: 600,
                  }}
                >
                  <ThumbsUp size={11} /> This helped
                </button>

                <button
                  onClick={handleExplainDifferently}
                  disabled={isRegenerating}
                  style={{
                    padding: '0.2rem 0.55rem',
                    fontSize: '0.68rem',
                    borderRadius: 6,
                    border: '1px solid rgba(37,99,235,0.2)',
                    background: '#eff6ff',
                    color: 'var(--color-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontWeight: 600,
                  }}
                >
                  <RefreshCw size={11} className={isRegenerating ? 'spin' : ''} />
                  {isRegenerating ? 'Regenerating...' : 'Explain differently'}
                </button>
              </div>
            </div>

            {/* Pitfalls */}
            <div>
              <div style={{ fontSize: '0.67rem', fontWeight: '800', color: 'var(--color-warning)', textTransform: 'uppercase', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertCircle size={12} /> Common Cognitive Pitfalls
              </div>
              <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: '1.35' }}>
                {(genai?.common_pitfalls || []).map((p, idx) => (
                  <li key={idx}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Column 3: Worked Code Example & "Ask About This" Input Surface */}
        <div className="card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.2rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Code2 size={15} color="var(--color-success)" />
              <h3 style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-bright)' }}>
                Applied Practice & Doubt Resolver
              </h3>
            </div>

            {/* Code Block */}
            <div style={{ background: '#18191d', padding: '0.55rem', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: '#a5f3fc', lineHeight: '1.3', whiteSpace: 'pre-wrap' }}>
              {genai?.worked_example?.code}
            </div>

            {/* Section 2: "Ask About This" Contextual Doubt Box */}
            <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                <MessageSquareQuote size={13} color="var(--color-primary)" />
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-bright)' }}>
                  Confused about something specific? Ask here
                </span>
              </div>

              {/* Resolved Doubt Exchanges */}
              {doubtHistory.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.5rem' }}>
                  {doubtHistory.map((item, idx) => (
                    <div key={idx} style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '0.5rem' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '0.2rem' }}>
                        You asked: "{item.question}"
                      </div>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#334155', lineHeight: '1.4' }}>
                        {item.answer}
                      </p>
                    </div>
                  ))}

                  {doubtHistory.length === 1 && !followUpMode && (
                    <button
                      onClick={() => setFollowUpMode(true)}
                      style={{
                        alignSelf: 'flex-start',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-primary)',
                        fontSize: '0.68rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        padding: '0.1rem 0',
                      }}
                    >
                      <CornerDownRight size={12} /> Ask a follow-up (one turn)
                    </button>
                  )}
                </div>
              )}

              {/* Doubt Input Form (shown if 0 doubts or in follow-up mode) */}
              {(doubtHistory.length === 0 || followUpMode) && (
                <form onSubmit={handleAskDoubt} style={{ display: 'flex', gap: '0.35rem' }}>
                  <input
                    type="text"
                    value={doubtText}
                    onChange={(e) => setDoubtText(e.target.value)}
                    placeholder={
                      followUpMode
                        ? 'Type your follow-up doubt...'
                        : `Ask anything about ${activeConceptName}...`
                    }
                    disabled={isAsking}
                    style={{
                      flex: 1,
                      padding: '0.35rem 0.55rem',
                      fontSize: '0.72rem',
                      borderRadius: 6,
                      border: '1px solid var(--border-subtle)',
                      background: '#ffffff',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isAsking || !doubtText.trim()}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: 6,
                      background: doubtText.trim() ? 'var(--color-primary)' : '#e2e8f0',
                      color: '#ffffff',
                      border: 'none',
                      cursor: doubtText.trim() ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}
                  >
                    <Send size={11} /> {isAsking ? '...' : 'Ask'}
                  </button>
                </form>
              )}
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={() => onLaunchQuiz(activeConceptId)}
            style={{ width: '100%', padding: '0.45rem', fontSize: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.35rem', marginTop: '0.45rem', flexShrink: 0 }}
          >
            Practice In Adaptive Quiz <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
