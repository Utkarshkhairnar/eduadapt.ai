import React, { useState, useEffect } from 'react';
import { Layers, HelpCircle, Binary, Code2, Terminal, Cpu, Flame } from 'lucide-react';

const SUBJECT_OPTIONS = [
  { id: 'maths3', label: 'Maths 3' },
  { id: 'automata_theory', label: 'Automata Theory' },
  { id: 'adsa', label: 'ADSA' },
  { id: 'java', label: 'Java' },
  { id: 'c_programming', label: 'C' },
  { id: 'python', label: 'Python' },
];

export default function ClassHeatmap({ classId = 'CS-2026', initialSubjectId = 'maths3' }) {
  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [heatmapData, setHeatmapData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHeatmap() {
      try {
        setLoading(true);
        const res = await fetch(`/teacher/class/${classId}/subject/${subjectId}/heatmap`, {
          headers: {
            'X-User-Id': 'teacher_1',
            'X-User-Role': 'teacher',
          },
        });
        const data = await res.json();
        setHeatmapData(data);
      } catch (err) {
        console.error('Failed to load class heatmap:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHeatmap();
  }, [classId, subjectId]);

  const getHeatmapColor = (score) => {
    if (score >= 0.70) return 'rgba(16, 185, 129, 0.4)'; // green
    if (score >= 0.45) return 'rgba(245, 158, 11, 0.35)'; // amber
    return 'rgba(239, 68, 68, 0.45)'; // red
  };

  const getTextColor = (score) => {
    if (score >= 0.70) return '#34d399';
    if (score >= 0.45) return '#fbbf24';
    return '#f87171';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.65rem' }}>
      {/* Top Controls Banner */}
      <div className="card" style={{ padding: '0.65rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-bright)' }}>
              Class Concept Mastery Heatmap — {classId}
            </h2>
            <span className="badge badge-accent">
              Average: {Math.round((heatmapData?.class_average_mastery || 0.5) * 100)}%
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
            Interactive matrix crossing all students against the prerequisite graph concepts for this subject.
          </div>
        </div>

        {/* Subject Dropdown & Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(16, 185, 129, 0.5)' }} /> &ge; 70% (Mastered)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(245, 158, 11, 0.4)' }} /> 45-70% (Developing)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(239, 68, 68, 0.5)' }} /> &lt; 45% (Critical Gap)
            </span>
          </div>

          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            style={{
              padding: '0.35rem 0.6rem',
              borderRadius: 6,
              background: '#ffffff',
              color: 'var(--text-bright)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.75rem',
            }}
          >
            {SUBJECT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Heatmap Grid */}
      <div className="card" style={{ flex: 1, padding: '0.8rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.75rem', color: 'var(--text-muted)' }}>
            <div className="spinner" /> Calculating Class Mastery Matrix for {subjectId}...
          </div>
        ) : (
          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.72rem', borderCollapse: 'collapse', textAlign: 'center' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left', minWidth: 120 }}>Student</th>
                  {(heatmapData?.concepts || []).map((c) => (
                    <th key={c.id} style={{ padding: '0.4rem 0.5rem', minWidth: 90 }}>
                      <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>{c.raw_id}</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-bright)', maxWidth: 100, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.name}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Diff: {c.difficulty_base}/7</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(heatmapData?.students || []).map((s, sIdx) => {
                  const row = heatmapData?.matrix?.[sIdx] || [];
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.4rem 0.6rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-bright)' }}>
                        {s.name}
                      </td>
                      {row.map((score, cIdx) => {
                        const pct = Math.round(score * 100);
                        return (
                          <td
                            key={cIdx}
                            style={{
                              padding: '0.35rem 0.4rem',
                              background: getHeatmapColor(score),
                              color: getTextColor(score),
                              fontWeight: '700',
                              border: '1px solid #f1f5f9',
                            }}
                          >
                            {pct}%
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
