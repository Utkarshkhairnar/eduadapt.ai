import React, { useState, useEffect } from 'react';
import { GitFork, AlertTriangle, CheckCircle2, ArrowRight, ShieldAlert, Sparkles, Layers, BookOpen } from 'lucide-react';

export default function GapMap({ studentId, subjectId, onProceedToLearningPath, onSelectConcept }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Doubt state
  const [doubtText, setDoubtText] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [doubtHistory, setDoubtHistory] = useState([]);

  // Reset doubt history when selected concept changes
  useEffect(() => {
    setDoubtHistory([]);
    setDoubtText('');
  }, [selectedNodeId]);

  const handleAskDoubt = async (e) => {
    e?.preventDefault();
    if (!doubtText.trim() || isAsking) return;

    const query = doubtText.trim();
    setDoubtText('');
    setIsAsking(true);

    try {
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
          concept_id: selectedNodeId,
          question_text: query,
          previous_context: prevContext,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDoubtHistory((prev) => [
          ...prev,
          { question: query, answer: data.ai_response }
        ]);
      }
    } catch (err) {
      console.error('Error asking doubt in GapMap:', err);
    } finally {
      setIsAsking(false);
    }
  };

  useEffect(() => {
    async function fetchGaps() {
      try {
        setLoading(true);
        const res = await fetch(`/gaps/${studentId}/${subjectId}`, {
          headers: {
            'X-User-Id': studentId,
            'X-User-Role': 'student',
          },
        });
        const json = await res.json();
        setData(json);
        if (json.root_bottleneck_concept) {
          setSelectedNodeId(json.root_bottleneck_concept.concept_id);
        } else if (json.graph_nodes?.length > 0) {
          setSelectedNodeId(json.graph_nodes[0].id);
        }
      } catch (err) {
        console.error('Failed to load gaps:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchGaps();
  }, [studentId, subjectId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.75rem', color: 'var(--text-muted)' }}>
        <div className="spinner" /> Traversing Directed Prerequisite Graph for {subjectId}...
      </div>
    );
  }

  const nodes = data?.graph_nodes || [];
  const edges = data?.graph_edges || [];
  const rootBottleneck = data?.root_bottleneck_concept;
  const gaps = data?.gaps || [];

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];
  const selectedGap = gaps.find((g) => g.concept_id === selectedNodeId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.65rem' }}>
      {/* Top Banner */}
      <div className="card" style={{ padding: '0.65rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-bright)' }}>
              Prerequisite Gap Map — {data?.subject_name}
            </h2>
            <span className="badge badge-accent">
              {data?.mastered_count} / {data?.total_concepts} Mastered
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
            Backward graph traversal identified root prerequisite bottlenecks gating downstream progress.
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={() => onProceedToLearningPath(rootBottleneck?.concept_id || selectedNodeId)}
          style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          Generate Targeted Learning Path <ArrowRight size={13} />
        </button>
      </div>

      {/* Main Split View: Left (Graph Grid) | Right (Selected Node & Root Bottleneck) */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '0.65rem', minHeight: 0 }}>
        {/* Left: Prerequisite DAG Layout */}
        <div className="card" style={{ padding: '0.8rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-bright)' }}>
                Directed Concept Topology
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--color-success)' }} /> Mastered
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--color-danger)' }} /> Root Bottleneck
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--color-accent)' }} /> Dependent
                </span>
              </div>
            </div>

            {/* Concept Nodes Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {nodes.map((node) => {
                const isSelected = node.id === selectedNodeId;
                const isRoot = rootBottleneck && (node.id === rootBottleneck.concept_id || node.raw_id === rootBottleneck.raw_concept_id);
                const isMastered = node.mastery_score >= (data?.mastery_threshold || 0.70);

                let borderColor = 'var(--border-subtle)';
                let bgGradient = '#ffffff';
                if (isRoot) {
                  borderColor = 'var(--color-danger)';
                  bgGradient = '#fef2f2';
                } else if (isMastered) {
                  borderColor = 'var(--color-success)';
                  bgGradient = '#f0fdf4';
                } else if (isSelected) {
                  borderColor = '#0f172a';
                  bgGradient = '#f8fafc';
                }

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    style={{
                      padding: '0.6rem 0.8rem',
                      borderRadius: 8,
                      border: `1.5px solid ${borderColor}`,
                      background: bgGradient,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                      <div>
                        <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {node.raw_id || node.id}
                        </span>
                        <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-bright)', lineHeight: '1.2' }}>
                          {node.name}
                        </div>
                      </div>
                      <span className={`badge ${isMastered ? 'badge-success' : isRoot ? 'badge-danger' : 'badge-accent'}`} style={{ fontSize: '0.65rem' }}>
                        {Math.round(node.mastery_score * 100)}%
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                      <span>Diff: {node.difficulty_base || 3}/7</span>
                      {isRoot ? (
                        <span style={{ color: 'var(--color-danger)', fontWeight: '700' }}>ROOT GAP</span>
                      ) : isMastered ? (
                        <span style={{ color: 'var(--color-success)' }}>Mastered</span>
                      ) : (
                        <span>Needs Practice</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Narrative Bar */}
          <div style={{ background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid var(--border-subtle)', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-accent)', fontSize: '0.72rem', fontWeight: '700', marginBottom: '0.2rem' }}>
              <Sparkles size={13} /> Traversal Insight
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: '1.4' }}>
              {data?.analysis_narrative}
            </p>
          </div>
        </div>

        {/* Right: Selected Concept Drill-Down & Bottleneck Detail */}
        <div className="card" style={{ padding: '0.8rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
              <div>
                <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>Concept Inspector</span>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-bright)', marginTop: '0.15rem' }}>
                  {selectedNode?.name}
                </h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--color-primary)' }}>
                  {Math.round((selectedNode?.mastery_score || 0.25) * 100)}%
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Latent Mastery P(L)</div>
              </div>
            </div>

            {selectedGap ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '0.5rem', borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-danger)', fontSize: '0.72rem', fontWeight: '700', marginBottom: '0.2rem' }}>
                    <AlertTriangle size={13} />
                    {selectedGap.is_root_bottleneck ? 'Primary Root Prerequisite Bottleneck' : 'Dependent Gap'}
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: '1.35' }}>
                    {selectedGap.recommendation}
                  </p>
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  <div style={{ marginBottom: '0.35rem' }}>
                    <strong>Unmet Prerequisites:</strong> {selectedGap.unmet_prerequisites?.length > 0 ? selectedGap.unmet_prerequisites.join(', ') : 'None (Root Foundation)'}
                  </div>
                  <div>
                    <strong>Downstream Topics Blocked:</strong> {selectedGap.blocking_for?.length > 0 ? selectedGap.blocking_for.join(', ') : 'None (Leaf topic)'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '0.8rem', background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 6, color: '#059669', fontSize: '0.75rem', lineHeight: '1.4' }}>
                <CheckCircle2 size={16} style={{ marginBottom: '0.2rem' }} />
                <div>This concept satisfies prerequisite requirements (Mastery &ge; 70%). Downstream algorithms are unlocked.</div>
              </div>
            )}

            {/* Contextual "Ask About This Concept" Doubt Box */}
            <div style={{ marginTop: '0.8rem', paddingTop: '0.65rem', borderTop: '1px dashed var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Sparkles size={12} style={{ color: 'var(--color-accent)' }} />
                  Ask AI Tutor about {selectedNode?.name || 'this concept'}
                </span>
                {doubtHistory.length > 0 && (
                  <button
                    onClick={() => { setDoubtHistory([]); setDoubtText(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.65rem', cursor: 'pointer' }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Doubt Conversation Display */}
              {doubtHistory.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem', maxHeight: 150, overflowY: 'auto' }}>
                  {doubtHistory.map((item, idx) => (
                    <div key={idx} style={{ fontSize: '0.68rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ alignSelf: 'flex-end', background: '#eff6ff', color: '#1e3a8a', padding: '0.3rem 0.5rem', borderRadius: '6px 6px 0 6px', maxWidth: '85%' }}>
                        <strong>You:</strong> {item.question}
                      </div>
                      <div style={{ alignSelf: 'flex-start', background: '#f8fafc', border: '1px solid var(--border-subtle)', color: 'var(--text-bright)', padding: '0.35rem 0.55rem', borderRadius: '6px 6px 6px 0', maxWidth: '95%', lineHeight: '1.35' }}>
                        <strong style={{ color: 'var(--color-primary)' }}>AI Tutor:</strong> {item.answer}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Input Form (supports 1 follow-up turn) */}
              {doubtHistory.length < 2 ? (
                <form
                  onSubmit={handleAskDoubt}
                  style={{ display: 'flex', gap: '0.3rem' }}
                >
                  <input
                    type="text"
                    value={doubtText}
                    onChange={(e) => setDoubtText(e.target.value)}
                    placeholder={doubtHistory.length === 1 ? "Ask 1 follow-up question..." : "Confused about this concept? Ask here..."}
                    disabled={isAsking}
                    style={{
                      flex: 1,
                      padding: '0.35rem 0.55rem',
                      borderRadius: 6,
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.7rem',
                      background: '#ffffff',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!doubtText.trim() || isAsking}
                    className="btn-primary"
                    style={{
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      opacity: (!doubtText.trim() || isAsking) ? 0.6 : 1,
                    }}
                  >
                    {isAsking ? 'Thinking...' : 'Ask'}
                  </button>
                </form>
              ) : (
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Follow-up limit reached for this session. Study lesson or click Clear to start fresh.
                </div>
              )}
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={() => onProceedToLearningPath(selectedNodeId)}
            style={{ width: '100%', padding: '0.45rem', fontSize: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.35rem', marginTop: '0.6rem' }}
          >
            Study '{selectedNode?.name}' in Learning Path <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
