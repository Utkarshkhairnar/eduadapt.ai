import React, { useState, useEffect } from 'react';
import { AlertTriangle, TrendingDown, Layers, CheckCircle2, ArrowRight } from 'lucide-react';

const SUBJECT_OPTIONS = [
  { id: 'maths3', label: 'Maths 3' },
  { id: 'automata_theory', label: 'Automata Theory' },
  { id: 'adsa', label: 'ADSA' },
  { id: 'java', label: 'Java' },
  { id: 'c_programming', label: 'C' },
  { id: 'python', label: 'Python' },
];

export default function CommonGapsReport({ classId = 'CS-2026', initialSubjectId = 'maths3' }) {
  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCommonGaps() {
      try {
        setLoading(true);
        const res = await fetch(`/teacher/class/${classId}/subject/${subjectId}/common-gaps`, {
          headers: {
            'X-User-Id': 'teacher_1',
            'X-User-Role': 'teacher',
          },
        });
        const data = await res.json();
        setReportData(data);
      } catch (err) {
        console.error('Failed to load common gaps report:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCommonGaps();
  }, [classId, subjectId]);

  const ranked = reportData?.ranked_gaps || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.65rem' }}>
      {/* Top Banner */}
      <div className="card" style={{ padding: '0.65rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-bright)' }}>
              Cohort Common Knowledge Gaps — {reportData?.subject_name}
            </h2>
            <span className="badge badge-accent">Ranked Descending</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
            Identifies widespread prerequisite stumbling blocks across Class {classId} to guide group interventions.
          </div>
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

      {/* Main Report Table (Strictly fits without scrollbars) */}
      <div className="card" style={{ flex: 1, padding: '0.8rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.75rem', color: 'var(--text-muted)' }}>
            <div className="spinner" /> Analyzing Prerequisite Bottlenecks for {subjectId}...
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Rank</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Concept Identifier</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Concept Name</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Base Difficulty</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Weak Student Count</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Cohort Weakness %</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Intervention Category</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((g, idx) => {
                  const isSevere = g.weak_percentage >= 50;
                  return (
                    <tr key={g.concept_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.5rem 0.6rem', fontWeight: '700', color: isSevere ? 'var(--color-danger)' : 'var(--text-dim)' }}>
                        #{idx + 1}
                      </td>
                      <td style={{ padding: '0.5rem 0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-bright)' }}>
                        {g.raw_concept_id}
                      </td>
                      <td style={{ padding: '0.5rem 0.6rem', fontWeight: '600', color: 'var(--text-bright)' }}>
                        {g.concept_name}
                      </td>
                      <td style={{ padding: '0.5rem 0.6rem', color: 'var(--text-dim)' }}>
                        {g.difficulty_base}/7
                      </td>
                      <td style={{ padding: '0.5rem 0.6rem', color: 'var(--text-bright)' }}>
                        <strong>{g.weak_student_count}</strong> of {g.total_students} students
                      </td>
                      <td style={{ padding: '0.5rem 0.6rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ width: 60, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${g.weak_percentage}%`, height: '100%', background: isSevere ? 'var(--color-danger)' : 'var(--color-warning)' }} />
                          </div>
                          <span style={{ fontWeight: '700', color: isSevere ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                            {g.weak_percentage}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.5rem 0.6rem' }}>
                        {g.is_root_bottleneck_for_many ? (
                          <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>
                            Critical Prerequisite Bottleneck
                          </span>
                        ) : isSevere ? (
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                            High Priority Review
                          </span>
                        ) : (
                          <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>
                            Targeted Reinforcement
                          </span>
                        )}
                      </td>
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
