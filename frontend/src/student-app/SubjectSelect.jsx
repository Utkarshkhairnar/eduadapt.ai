import React, { useEffect, useState } from 'react';
import { BookOpen, Cpu, Binary, Code2, Terminal, Flame, ArrowRight, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

const SUBJECT_ICONS = {
  maths3: Binary,
  automata_theory: Cpu,
  adsa: Layers,
  java: Code2,
  c_programming: Terminal,
  python: Flame,
};

const SUBJECT_COLORS = {
  maths3: '#38bdf8',
  automata_theory: '#a855f7',
  adsa: '#10b981',
  java: '#f59e0b',
  c_programming: '#ec4899',
  python: '#6366f1',
};

export default function SubjectSelect({ studentId, onSelectSubject }) {
  const [subjects, setSubjects] = useState([]);
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [subjRes, histRes] = await Promise.all([
          fetch('/admin/subjects'),
          fetch(`/profile/${studentId}/history`, {
            headers: {
              'X-User-Id': studentId,
              'X-User-Role': 'student',
            },
          })
        ]);
        const subjJson = await subjRes.json();
        const histJson = await histRes.json();
        setSubjects(subjJson.subjects || []);
        setHistoryData(histJson);
      } catch (err) {
        console.error('Failed to load subject metadata:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [studentId]);

  const overviewMap = {};
  if (historyData?.subject_overviews) {
    historyData.subject_overviews.forEach((o) => {
      overviewMap[o.subject_id] = o;
    });
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.75rem', color: 'var(--text-muted)' }}>
        <div className="spinner" /> Loading 6 Subject Concept Graphs...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.75rem', padding: '0.2rem 0' }}>
      {/* Subject Header Banner */}
      <div className="card" style={{ padding: '0.8rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-bright)' }}>Select Curriculum Subject</h2>
            <span className="badge badge-accent">6 Prerequisite Graphs Active</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
            Each subject maintains independent Bayesian Knowledge Tracing, prerequisite graphs, and adaptive calibration.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Progress</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-primary)' }}>
              {Math.round((historyData?.overall_progress || 0.25) * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* 6 Subjects Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', flex: 1, minHeight: 0 }}>
        {subjects.map((sub) => {
          const Icon = SUBJECT_ICONS[sub.id] || BookOpen;
          const color = SUBJECT_COLORS[sub.id] || '#6366f1';
          const overview = overviewMap[sub.id] || { average_mastery: 0.25, mastered_count: 0, total_concepts: 7 };
          const masteryPct = Math.round(overview.average_mastery * 100);

          return (
            <div
              key={sub.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1rem',
                borderLeft: `4px solid ${color}`,
                cursor: 'pointer',
                transition: 'transform 0.15s ease, border-color 0.15s ease',
              }}
              onClick={() => onSelectSubject(sub.id, 'diagnostic')}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ background: `${color}20`, color: color, padding: '0.4rem', borderRadius: 8 }}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-bright)' }}>{sub.display_name}</h3>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {sub.id}
                      </span>
                    </div>
                  </div>
                  <span className={`badge ${masteryPct >= 70 ? 'badge-success' : masteryPct < 45 ? 'badge-warning' : 'badge-accent'}`}>
                    {masteryPct}% Mastery
                  </span>
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.35', marginBottom: '0.6rem' }}>
                  {sub.description}
                </p>

                {/* Mastery Bar */}
                <div style={{ marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                    <span>{overview.mastered_count} of {overview.total_concepts || 7} Concepts Mastered</span>
                    <span>{masteryPct}%</span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${masteryPct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s ease' }} />
                  </div>
                </div>

                {overview.root_bottleneck && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '0.3rem 0.5rem', borderRadius: 6 }}>
                    <AlertTriangle size={12} flexShrink={0} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Root Gap: <strong>{overview.root_bottleneck}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.72rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.3rem' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSubject(sub.id, 'diagnostic');
                  }}
                >
                  Diagnostic <ArrowRight size={11} />
                </button>
                <button
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.72rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.3rem' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSubject(sub.id, 'gaps');
                  }}
                >
                  Gap Map
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
