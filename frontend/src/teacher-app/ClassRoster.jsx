import React, { useState, useEffect } from 'react';
import { Users, CheckCircle2, AlertCircle, ArrowRight, UserCheck, Search, Activity, Flame } from 'lucide-react';

export default function ClassRoster({ classId = 'CS-2026', onSelectStudent }) {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    async function fetchRoster() {
      try {
        setLoading(true);
        const res = await fetch(`/teacher/class/${classId}/roster`, {
          headers: {
            'X-User-Id': 'teacher_1',
            'X-User-Role': 'teacher',
          },
        });
        const data = await res.json();
        setRoster(data.students || []);
      } catch (err) {
        console.error('Failed to load roster:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRoster();
  }, [classId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.75rem', color: 'var(--text-muted)' }}>
        <div className="spinner" /> Loading Class {classId} Roster...
      </div>
    );
  }

  const filtered = roster.filter((s) =>
    s.name.toLowerCase().includes(filterText.toLowerCase()) ||
    s.id.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.65rem' }}>
      {/* Top Banner */}
      <div className="card" style={{ padding: '0.65rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-bright)' }}>
              Class Roster & Cohort Performance — {classId}
            </h2>
            <span className="badge badge-accent">{roster.length} Enrolled Students</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
            Real-time status of diagnostic assessments, cross-subject mastery baselines, and learning activity.
          </p>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#ffffff', padding: '0.25rem 0.6rem', borderRadius: 8, border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <Search size={13} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Filter students..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-bright)', fontSize: '0.75rem', outline: 'none', width: 140 }}
          />
        </div>
      </div>

      {/* Roster Table (Strictly fits without scrollbars) */}
      <div className="card" style={{ flex: 1, padding: '0.8rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '0.4rem 0.6rem' }}>Student Name</th>
                <th style={{ padding: '0.4rem 0.6rem' }}>Identifier</th>
                <th style={{ padding: '0.4rem 0.6rem' }}>Diagnostic Status</th>
                <th style={{ padding: '0.4rem 0.6rem' }}>Average Mastery</th>
                <th style={{ padding: '0.4rem 0.6rem' }}>Active Streak</th>
                <th style={{ padding: '0.4rem 0.6rem' }}>Recent Activity</th>
                <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const masteryPct = Math.round(s.average_mastery * 100);
                const isHigh = masteryPct >= 70;
                const isLow = masteryPct < 45;

                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem 0.6rem', fontWeight: '600', color: 'var(--text-bright)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: 22, height: 22, borderRadius: 11, background: '#0f172a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '800' }}>
                          {s.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <span>{s.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {s.id}
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem' }}>
                      <span className={`badge ${s.diagnostic_completed ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                        {s.diagnostic_completed ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: 50, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${masteryPct}%`, height: '100%', background: isHigh ? 'var(--color-success)' : isLow ? 'var(--color-danger)' : 'var(--color-primary)' }} />
                        </div>
                        <span style={{ fontWeight: '700', color: isHigh ? 'var(--color-success)' : isLow ? 'var(--color-danger)' : 'var(--text-bright)' }}>
                          {masteryPct}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: s.current_streak > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                        <Flame size={12} /> {s.current_streak}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', color: 'var(--text-dim)' }}>
                      {s.recent_activity}
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>
                      <button
                        className="btn-primary"
                        onClick={() => onSelectStudent(s.id)}
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        Drill Down <ArrowRight size={11} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
