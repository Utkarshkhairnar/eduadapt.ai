import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  UserCheck,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  Layers,
  BarChart3,
  Binary,
  Flame,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Target
} from 'lucide-react';

export default function MyProgress({ studentId, currentSubjectId, onSelectSubject, onStartNextCycle }) {
  const [historyData, setHistoryData] = useState(null);
  const [selectedSubj, setSelectedSubj] = useState(currentSubjectId || '');
  const [loading, setLoading] = useState(true);

  // Attempt Reports State (Feature 3)
  const [reports, setReports] = useState([]);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [reportDetails, setReportDetails] = useState({});
  const [loadingDetailId, setLoadingDetailId] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const headers = {
          'X-User-Id': studentId,
          'X-User-Role': 'student',
        };

        const histUrl = selectedSubj ? `/profile/${studentId}/history?subject_id=${selectedSubj}` : `/profile/${studentId}/history`;
        const repsUrl = selectedSubj ? `/profile/${studentId}/reports?subject_id=${selectedSubj}` : `/profile/${studentId}/reports`;

        const [histRes, repsRes] = await Promise.all([
          fetch(histUrl, { headers }),
          fetch(repsUrl, { headers })
        ]);

        if (histRes.ok) {
          const hData = await histRes.json();
          setHistoryData(hData);
        }
        if (repsRes.ok) {
          const rData = await repsRes.json();
          setReports(rData.reports || []);
        }
      } catch (err) {
        console.error('Failed to load profile history or reports:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [studentId, selectedSubj]);

  const toggleExpandReport = async (attemptId) => {
    if (expandedReportId === attemptId) {
      setExpandedReportId(null);
      return;
    }
    setExpandedReportId(attemptId);

    // If report details not cached, fetch them
    if (!reportDetails[attemptId]) {
      try {
        setLoadingDetailId(attemptId);
        const res = await fetch(`/profile/${studentId}/report/${attemptId}`, {
          headers: {
            'X-User-Id': studentId,
            'X-User-Role': 'student',
          },
        });
        if (res.ok) {
          const data = await res.json();
          setReportDetails((prev) => ({ ...prev, [attemptId]: data }));
        }
      } catch (err) {
        console.error(`Failed to fetch report detail for ${attemptId}:`, err);
      } finally {
        setLoadingDetailId(null);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.75rem', color: 'var(--text-muted)' }}>
        <div className="spinner" /> Loading Longitudinal Profile, Snapshots & Post-Attempt Reports...
      </div>
    );
  }

  const overviews = historyData?.subject_overviews || [];
  const snapshots = historyData?.snapshots || [];
  const overallPct = Math.round((historyData?.overall_progress || 0.25) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.75rem', overflowY: 'auto', paddingRight: '0.2rem' }}>
      {/* Top Banner */}
      <div className="card" style={{ padding: '0.75rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-bright)' }}>
              Longitudinal Learning Profile & Progress History
            </h2>
            <span className="badge badge-accent">6 Subjects Aggregated</span>
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
            Powered by append-only Bayesian mastery snapshots and live AI post-attempt diagnostic reports.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          {/* Subject Filter Dropdown */}
          <select
            value={selectedSubj}
            onChange={(e) => setSelectedSubj(e.target.value)}
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: 6,
              background: '#ffffff',
              color: 'var(--text-bright)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.75rem',
              fontWeight: '600',
            }}
          >
            <option value="">All 6 Subjects (Curriculum Overview)</option>
            <option value="maths3">Maths 3</option>
            <option value="automata_theory">Automata Theory</option>
            <option value="adsa">ADSA</option>
            <option value="java">Java</option>
            <option value="c_programming">C</option>
            <option value="python">Python</option>
          </select>

          <button
            className="btn-primary"
            onClick={onStartNextCycle}
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            Start Next Cycle <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* UPPER SECTION: Mastery-Over-Time Chart & Subject Overviews */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr', gap: '0.75rem', minHeight: 280, flexShrink: 0 }}>
        {/* Left: 6 Subjects Performance Grid */}
        <div className="card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexShrink: 0 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-bright)' }}>
              Curriculum Mastery Overview
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-primary)' }}>
              Total Average: {overallPct}%
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', overflowY: 'auto', maxHeight: 220, paddingRight: '0.2rem' }}>
            {overviews.map((ov) => {
              const mPct = Math.round(ov.average_mastery * 100);
              const isSelected = selectedSubj === ov.subject_id;

              return (
                <div
                  key={ov.subject_id}
                  onClick={() => setSelectedSubj(ov.subject_id)}
                  style={{
                    padding: '0.55rem 0.75rem',
                    borderRadius: 6,
                    border: isSelected ? '1.5px solid #0f172a' : '1px solid var(--border-subtle)',
                    background: isSelected ? '#f8fafc' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-bright)' }}>
                      {ov.subject_name}
                    </div>
                    <span className={`badge ${mPct >= 70 ? 'badge-success' : mPct < 45 ? 'badge-warning' : 'badge-accent'}`} style={{ fontSize: '0.65rem' }}>
                      {mPct}%
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    <span>{ov.mastered_count} of {ov.total_concepts} Concepts Mastered</span>
                    {ov.root_bottleneck ? (
                      <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>Gap: {ov.root_bottleneck}</span>
                    ) : (
                      <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Foundations Solid</span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div style={{ width: '100%', height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${mPct}%`, height: '100%', background: mPct >= 70 ? 'var(--color-success)' : 'var(--color-primary)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Append-Only Mastery Snapshots Log & Curve */}
        <div className="card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexShrink: 0 }}>
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-bright)' }}>
                Mastery Snapshots Over Time
              </span>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {snapshots.length} historical observations recorded (append-only)
              </div>
            </div>
            <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>
              {selectedSubj || 'All Subjects'}
            </span>
          </div>

          {/* Sparkline */}
          <div style={{ background: '#f1f5f9', border: '1px solid var(--border-subtle)', padding: '0.6rem', borderRadius: 8, marginBottom: '0.5rem', flexShrink: 0 }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 600 }}>
              Recent Calibration Trajectory
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', height: 45, gap: '0.3rem', padding: '0 0.2rem' }}>
              {snapshots.slice(-18).map((s, idx) => {
                const heightPct = Math.max(10, Math.round(s.mastery_score * 100));
                const isHigh = s.mastery_score >= 0.70;
                return (
                  <div
                    key={s.id || idx}
                    title={`${s.concept_id}: ${Math.round(s.mastery_score * 100)}%`}
                    style={{
                      flex: 1,
                      height: `${heightPct}%`,
                      background: isHigh ? 'var(--color-success)' : 'var(--color-primary)',
                      borderRadius: '2px 2px 0 0',
                      transition: 'height 0.2s ease',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Snapshot Table */}
          <div style={{ overflowY: 'auto', maxHeight: 150, paddingRight: '0.2rem' }}>
            <table style={{ width: '100%', fontSize: '0.7rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '0.25rem 0.35rem' }}>Subject</th>
                  <th style={{ padding: '0.25rem 0.35rem' }}>Concept</th>
                  <th style={{ padding: '0.25rem 0.35rem' }}>Mastery</th>
                  <th style={{ padding: '0.25rem 0.35rem' }}>Recorded</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.slice().reverse().slice(0, 10).map((snap) => (
                  <tr key={snap.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.25rem 0.35rem', color: 'var(--text-dim)' }}>{snap.subject_id}</td>
                    <td style={{ padding: '0.25rem 0.35rem', fontFamily: 'var(--font-mono)', color: 'var(--text-bright)' }}>{snap.concept_id}</td>
                    <td style={{ padding: '0.25rem 0.35rem', fontWeight: '700', color: snap.mastery_score >= 0.70 ? 'var(--color-success)' : 'var(--color-accent)' }}>
                      {Math.round(snap.mastery_score * 100)}%
                    </td>
                    <td style={{ padding: '0.25rem 0.35rem', color: 'var(--text-muted)' }}>
                      {snap.timestamp?.split('T')[0] || 'Recent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* LOWER SECTION: Post-Attempt Reports History (Feature 3) */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} color="var(--color-primary)" />
            <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-bright)' }}>
              Post-Attempt Reports & Root-Gap History
            </h3>
            <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>
              {reports.length} Reports
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Generated after each diagnostic assessment and adaptive quiz session
          </span>
        </div>

        {reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            No past attempt reports yet. Complete a diagnostic assessment or adaptive quiz to see your first report.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {reports.slice(0, 12).map((rep) => {
              const isExpanded = expandedReportId === rep.attempt_id;
              const detail = reportDetails[rep.attempt_id];
              const isLoadingThis = loadingDetailId === rep.attempt_id;

              return (
                <div
                  key={rep.attempt_id}
                  style={{
                    border: isExpanded ? '1.5px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    background: isExpanded ? '#fafafa' : '#ffffff',
                    transition: 'all 0.2s ease',
                    overflow: 'hidden',
                  }}
                >
                  {/* Collapsed Header Summary */}
                  <div
                    onClick={() => toggleExpandReport(rep.attempt_id)}
                    style={{
                      padding: '0.65rem 0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: rep.score_pct >= 70 ? 'rgba(16,185,129,0.1)' : 'rgba(37,99,235,0.08)',
                          color: rep.score_pct >= 70 ? 'var(--color-success)' : 'var(--color-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <FileText size={15} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-bright)' }}>
                            {rep.subject_name}
                          </span>
                          <span
                            className="badge"
                            style={{
                              fontSize: '0.62rem',
                              textTransform: 'uppercase',
                              background: rep.assessment_type === 'diagnostic' ? '#eff6ff' : '#f1f5f9',
                              color: rep.assessment_type === 'diagnostic' ? 'var(--color-primary)' : 'var(--text-dim)',
                            }}
                          >
                            {rep.assessment_type}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={11} /> {rep.date}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: '800',
                          color: rep.score_pct >= 70 ? 'var(--color-success)' : 'var(--color-primary)',
                        }}
                      >
                        {rep.score_display} ({Math.round(rep.score_pct)}%)
                      </span>

                      <button
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-dim)',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Report Breakdown Drawer */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '0.9rem', background: '#ffffff' }}>
                      {isLoadingThis ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '0.5rem 0' }}>
                          <div className="spinner" style={{ width: 14, height: 14 }} /> Loading AI report breakdown...
                        </div>
                      ) : detail ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {/* GenAI Plain-Language Summary Callout */}
                          <div
                            style={{
                              background: 'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(16,185,129,0.06))',
                              border: '1px solid rgba(37,99,235,0.18)',
                              borderRadius: 8,
                              padding: '0.75rem 0.9rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-primary)', marginBottom: '0.3rem' }}>
                              <Sparkles size={14} />
                              <span style={{ fontSize: '0.75rem', fontWeight: '800' }}>AI Tutor Summary</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: '1.45', color: '#1e293b' }}>
                              {detail.ai_summary}
                            </p>
                          </div>

                          {/* Stat Grid: Root Gap + Previous Attempt Delta */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                            {/* Root Gap Identified */}
                            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 8, padding: '0.6rem 0.8rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#b45309', fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                                <AlertTriangle size={13} />
                                <span>Identified Root Prerequisite Gap</span>
                              </div>
                              <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#78350f' }}>
                                {detail.root_gap?.concept_name || 'No critical bottleneck detected'}
                              </div>
                              <div style={{ fontSize: '0.67rem', color: '#92400e', marginTop: '0.15rem' }}>
                                Earliest unmastered node in DAG blocking downstream comprehension
                              </div>
                            </div>

                            {/* Delta vs Previous Attempt */}
                            <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '0.6rem 0.8rem' }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.2rem' }}>
                                Trajectory vs Previous Attempt
                              </div>
                              {detail.previous_attempt_delta ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <span
                                    style={{
                                      fontSize: '0.85rem',
                                      fontWeight: '800',
                                      color: detail.previous_attempt_delta.score_delta >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                  >
                                    {detail.previous_attempt_delta.score_delta >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                                    {detail.previous_attempt_delta.score_delta > 0 ? `+${detail.previous_attempt_delta.score_delta}%` : `${detail.previous_attempt_delta.score_delta}%`}
                                  </span>
                                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                    (Prior: {detail.previous_attempt_delta.previous_score_pct}% on {detail.previous_attempt_delta.previous_date})
                                  </span>
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-dim)' }}>
                                  Initial Baseline Attempt (first session calibrated)
                                </div>
                              )}
                              <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                BKT Posterior Tracking Delta
                              </div>
                            </div>
                          </div>

                          {/* Per-Concept Breakdown Table */}
                          <div>
                            <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-bright)', marginBottom: '0.35rem' }}>
                              Per-Concept Performance & Mastery Shifts
                            </div>
                            <table style={{ width: '100%', fontSize: '0.7rem', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                                  <th style={{ padding: '0.3rem 0.4rem' }}>Concept</th>
                                  <th style={{ padding: '0.3rem 0.4rem' }}>Tested</th>
                                  <th style={{ padding: '0.3rem 0.4rem' }}>Result</th>
                                  <th style={{ padding: '0.3rem 0.4rem' }}>Mastery Shift</th>
                                  <th style={{ padding: '0.3rem 0.4rem' }}>Delta</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detail.concept_breakdown?.map((c) => (
                                  <tr key={c.concept_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                    <td style={{ padding: '0.35rem 0.4rem', fontWeight: '600', color: 'var(--text-bright)' }}>
                                      {c.concept_name}
                                    </td>
                                    <td style={{ padding: '0.35rem 0.4rem', color: 'var(--text-dim)' }}>
                                      {c.tested_count} {c.tested_count === 1 ? 'question' : 'questions'}
                                    </td>
                                    <td style={{ padding: '0.35rem 0.4rem' }}>
                                      <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>{c.correct_count}✓</span>
                                      {c.incorrect_count > 0 && (
                                        <span style={{ color: 'var(--color-danger)', fontWeight: 700, marginLeft: '0.3rem' }}>{c.incorrect_count}✗</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '0.35rem 0.4rem', fontFamily: 'var(--font-mono)' }}>
                                      {Math.round(c.mastery_before * 100)}% → {Math.round(c.mastery_after * 100)}%
                                    </td>
                                    <td style={{ padding: '0.35rem 0.4rem' }}>
                                      <span
                                        className={`badge ${c.delta > 0 ? 'badge-success' : c.delta < 0 ? 'badge-warning' : 'badge-accent'}`}
                                        style={{ fontSize: '0.62rem' }}
                                      >
                                        {c.delta > 0 ? `+${Math.round(c.delta * 100)}%` : `${Math.round(c.delta * 100)}%`}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>Failed to load report detail.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
