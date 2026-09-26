import React, { useState, useEffect } from 'react';
import { User, TrendingUp, Award, RotateCcw, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCw, Sparkles, ArrowRight } from 'lucide-react';

export default function ProfileView({ studentId = 'demo-student-1', onStartNextCycle, onResetDemo }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/profile/${studentId}`);
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [studentId]);

  if (loading || !profile) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <RefreshCw size={32} className="spin" style={{ color: '#818CF8', margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)' }}>Calculating longitudinal before/after mastery deltas...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="view-header">
        <div className="view-title-group">
          <h1>Student Learning Profile & Before/After Mastery Deltas</h1>
          <p>
            Longitudinal knowledge tracing deltas comparing diagnostic baseline to current adaptive mastery.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={onResetDemo} style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}>
            <RotateCcw size={12} /> Reset Demo
          </button>
          <button className="btn-primary" onClick={onStartNextCycle} style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
            Start Next Cycle <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Top Profile Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card cyan glass-panel">
          <span className="stat-label">Student</span>
          <span className="stat-value" style={{ fontSize: '1.15rem' }}>{profile.name}</span>
          <span className="stat-sub">ID: {profile.student_id}</span>
        </div>

        <div className="stat-card emerald glass-panel">
          <span className="stat-label">Mastery Avg</span>
          <span className="stat-value">{Math.round(profile.overall_mastery_average * 100)}%</span>
          <span className="stat-sub">
            {profile.mastered_concepts_count} of {profile.total_concepts_count} concepts mastered
          </span>
        </div>

        <div className="stat-card amber glass-panel">
          <span className="stat-label">Readiness</span>
          <span className="stat-value" style={{ fontSize: '1.15rem', color: '#FBBF24' }}>
            {profile.readiness_level}
          </span>
          <span className="stat-sub">Curriculum stage</span>
        </div>

        <div className="stat-card rose glass-panel">
          <span className="stat-label">Adaptive IRT</span>
          <span className="stat-value">{profile.adaptive_difficulty.toFixed(2)}</span>
          <span className="stat-sub">Streak: {profile.current_streak > 0 ? `+${profile.current_streak}` : profile.current_streak} (Max: {profile.max_streak})</span>
        </div>
      </div>

      {/* Main Grid: Left Deltas Table (65%), Right Recent Activity & Closed-Loop (35%) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '0.65rem', flex: 1, minHeight: 0 }}>
        {/* Before vs After Mastery Comparison Table */}
        <div className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexShrink: 0 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <TrendingUp size={15} color="#10B981" />
              Longitudinal Mastery Deltas (Diagnostic Baseline vs Current Adaptive)
            </h3>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.2rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-dim)' }}>
                  <th style={{ padding: '0.35rem 0.5rem' }}>Concept</th>
                  <th style={{ padding: '0.35rem 0.5rem' }}>Base</th>
                  <th style={{ padding: '0.35rem 0.5rem' }}>Curr</th>
                  <th style={{ padding: '0.35rem 0.5rem' }}>Delta (Δ)</th>
                  <th style={{ padding: '0.35rem 0.5rem' }}>Meter</th>
                  <th style={{ padding: '0.35rem 0.5rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {profile.mastery_deltas.map((item) => {
                  const isPositive = item.delta > 0;
                  const isZero = item.delta === 0;

                  return (
                    <tr
                      key={item.concept_id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      }}
                    >
                      <td style={{ padding: '0.4rem 0.5rem', fontWeight: '600' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', color: '#818CF8', marginRight: '0.35rem' }}>
                          {item.concept_id}
                        </span>
                        {item.concept_name}
                      </td>

                      <td style={{ padding: '0.4rem 0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {Math.round(item.baseline_mastery * 100)}%
                      </td>

                      <td style={{ padding: '0.4rem 0.5rem', fontFamily: 'var(--font-mono)', fontWeight: '700' }}>
                        {Math.round(item.current_mastery * 100)}%
                      </td>

                      <td style={{ padding: '0.4rem 0.5rem', fontFamily: 'var(--font-mono)' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.15rem',
                            color: isPositive ? '#10B981' : isZero ? 'var(--text-dim)' : '#EF4444',
                            fontWeight: '700',
                          }}
                        >
                          {isPositive ? `+${(item.delta * 100).toFixed(0)}%` : `${(item.delta * 100).toFixed(0)}%`}
                        </span>
                      </td>

                      <td style={{ padding: '0.4rem 0.5rem', minWidth: '90px' }}>
                        <div className="meter-track" style={{ height: 4 }}>
                          <div
                            className={`meter-fill ${item.current_mastery >= 0.70 ? 'emerald' : item.current_mastery < 0.45 ? 'rose' : 'amber'}`}
                            style={{ width: `${Math.round(item.current_mastery * 100)}%` }}
                          />
                        </div>
                      </td>

                      <td style={{ padding: '0.4rem 0.5rem' }}>
                        {item.status === 'Mastered' ? (
                          <span className="badge badge-mastered" style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem' }}>Mastered</span>
                        ) : item.status === 'Critical Gap' ? (
                          <span className="badge badge-gap" style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem' }}>Critical</span>
                        ) : (
                          <span className="badge badge-bottleneck" style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem' }}>Developing</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Recent Attempts & Closed-Loop Re-entry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', minHeight: 0 }}>
          {/* Recent Responses List */}
          <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', flexShrink: 0 }}>
              Recent Quiz Responses
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto', flex: 1, paddingRight: '0.2rem' }}>
              {profile.recent_responses && profile.recent_responses.length > 0 ? (
                profile.recent_responses.map((resp, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.4rem 0.6rem',
                      background: 'rgba(30, 41, 59, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {resp.is_correct ? (
                        <CheckCircle2 size={14} color="#10B981" />
                      ) : (
                        <AlertTriangle size={14} color="#EF4444" />
                      )}
                      <span style={{ fontWeight: '600' }}>{resp.concept_id}</span>
                      <span style={{ color: 'var(--text-dim)' }}>Diff {resp.difficulty.toFixed(2)}</span>
                    </div>

                    <div style={{ fontFamily: 'var(--font-mono)' }}>
                      P(L): {resp.mastery_before.toFixed(2)} → {resp.mastery_after.toFixed(2)}{' '}
                      <span style={{ color: resp.delta >= 0 ? '#10B981' : '#EF4444', fontWeight: '700' }}>
                        ({resp.delta >= 0 ? '+' : ''}{resp.delta.toFixed(2)})
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', padding: '0.5rem' }}>
                  No quiz attempts recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Closed-Loop Demonstration Banner */}
          <div
            className="glass-panel"
            style={{
              padding: '0.85rem 1rem',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexShrink: 0,
            }}
          >
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '800', marginBottom: '0.15rem' }}>
                Closed-Loop Cycle Complete!
              </h4>
              <p style={{ fontSize: '0.725rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                Mastery updates feed directly back into the Knowledge Gap graph for Cycle 2.
              </p>
            </div>

            <button className="btn-primary" onClick={onStartNextCycle} style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', flexShrink: 0 }}>
              Cycle 2 <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
