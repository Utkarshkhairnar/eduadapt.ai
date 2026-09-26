import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, ArrowRight, GitFork, RefreshCw, BarChart3, Layers } from 'lucide-react';
import ConceptGraphView from '../components/ConceptGraphView';

export default function DashboardView({ studentId = 'demo-student-1', onProceedToPath, onSelectTargetConcept }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchGaps = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/gaps/${studentId}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch knowledge gaps:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGaps();
  }, [studentId]);

  if (loading || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <RefreshCw size={32} className="spin" style={{ color: '#818CF8', margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)' }}>Traversing prerequisite knowledge graph and calculating gap metrics...</p>
      </div>
    );
  }

  const rb = data.root_bottleneck_concept;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', height: '100%', overflow: 'hidden' }}>
      {/* Top Banner & Narrative */}
      <div className="view-header">
        <div className="view-title-group">
          <h1>Knowledge Gap & Prerequisite Analysis</h1>
          <p>
            NetworkX Directed Acyclic Graph (DAG) traversal isolating the root prerequisite bottleneck.
          </p>
        </div>

        <button className="btn-primary" onClick={onProceedToPath} style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}>
          Personalized Learning Path <ArrowRight size={14} />
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="stats-grid">
        <div className="stat-card cyan glass-panel">
          <span className="stat-label">Total Concepts</span>
          <span className="stat-value">{data.total_concepts}</span>
          <span className="stat-sub">Across 4 curriculum tiers</span>
        </div>
        <div className="stat-card emerald glass-panel">
          <span className="stat-label">Mastered</span>
          <span className="stat-value">{data.mastered_count}</span>
          <span className="stat-sub">Threshold ≥ {Math.round(data.mastery_threshold * 100)}%</span>
        </div>
        <div className="stat-card amber glass-panel">
          <span className="stat-label">Detected Gaps</span>
          <span className="stat-value">{data.gap_count}</span>
          <span className="stat-sub">Requiring remediation</span>
        </div>
        <div className="stat-card rose glass-panel">
          <span className="stat-label">Root Bottleneck</span>
          <span className="stat-value" style={{ fontSize: '1.05rem' }}>
            {rb ? `${rb.concept_id}: ${rb.concept_name}` : 'None'}
          </span>
          <span className="stat-sub">{rb ? `Gates ${rb.blocking_for.length} downstream concepts` : 'All clear'}</span>
        </div>
      </div>

      {/* Root Bottleneck Mini Alert Banner */}
      {rb && (
        <div
          className="glass-panel pulse-bottleneck"
          style={{
            padding: '0.5rem 0.9rem',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(17, 24, 39, 0.7) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <ShieldAlert size={20} color="#F59E0B" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.8rem', lineHeight: '1.3' }}>
              <strong style={{ color: '#FBBF24' }}>Root Bottleneck: {rb.concept_name} ({rb.concept_id})</strong>
              <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                Mastery {Math.round(rb.mastery_score * 100)}% gates downstream learning. Repairing this unlocks compound transfer.
              </span>
            </div>
          </div>

          <button
            className="btn-primary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', flexShrink: 0, background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
            onClick={() => {
              if (onSelectTargetConcept) onSelectTargetConcept(rb.concept_id);
              onProceedToPath();
            }}
          >
            Remediate Gap <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* Main Grid: Left DAG Graph (58%), Right Compact Mastery List (42%) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '0.65rem', flex: 1, minHeight: 0 }}>
        {/* NetworkX Concept Graph SVG DAG */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <ConceptGraphView
            graphNodes={data.graph_nodes}
            graphEdges={data.graph_edges}
            rootBottleneck={rb}
            onSelectConcept={(cid) => {
              if (onSelectTargetConcept) onSelectTargetConcept(cid);
              onProceedToPath();
            }}
          />
        </div>

        {/* Live Mastery Index */}
        <div className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexShrink: 0 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BarChart3 size={15} color="#6366F1" />
              Live Concept Mastery Index (BKT)
            </h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>12 Concepts</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto', flex: 1, paddingRight: '0.25rem' }}>
            {data.graph_nodes.map((node) => {
              const isMastered = node.mastery_score >= data.mastery_threshold;
              const isRoot = rb && node.id === rb.concept_id;
              return (
                <div
                  key={node.id}
                  style={{
                    padding: '0.35rem 0.65rem',
                    background: 'rgba(30, 41, 59, 0.3)',
                    border: isRoot ? '1px solid #F59E0B' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.725rem', color: '#818CF8', fontWeight: '700' }}>
                      {node.id}
                    </span>
                    <span style={{ fontWeight: '600', fontSize: '0.775rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {node.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
                    <div style={{ width: 70 }}>
                      <div className="meter-track" style={{ height: 5 }}>
                        <div
                          className={`meter-fill ${isMastered ? 'emerald' : (isRoot ? 'amber' : 'rose')}`}
                          style={{ width: `${Math.round(node.mastery_score * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: '700', width: 32, textAlign: 'right' }}>
                      {Math.round(node.mastery_score * 100)}%
                    </span>
                    {isMastered ? (
                      <span className="badge badge-mastered" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>Done</span>
                    ) : isRoot ? (
                      <span className="badge badge-bottleneck" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>Root</span>
                    ) : (
                      <span className="badge badge-gap" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>Gap</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
