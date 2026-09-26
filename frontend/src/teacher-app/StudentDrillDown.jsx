import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Brain, Activity, CheckCircle2, XCircle, Clock, ShieldAlert, BookOpen, Layers } from 'lucide-react';

export default function StudentDrillDown({ studentId, onBack }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFullProfile() {
      try {
        setLoading(true);
        const res = await fetch(`/teacher/student/${studentId}/full-profile`, {
          headers: {
            'X-User-Id': 'teacher_1',
            'X-User-Role': 'teacher',
          },
        });
        const data = await res.json();
        setProfileData(data);
      } catch (err) {
        console.error('Failed to load student drill down profile:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchFullProfile();
  }, [studentId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.75rem', color: 'var(--text-muted)' }}>
        <div className="spinner" /> Loading Full Pedagogical Drill-Down for {studentId}...
      </div>
    );
  }

  const student = profileData?.student || {};
  const learningProfile = profileData?.learning_profile || {};
  const subjectSummaries = profileData?.subject_summaries || {};
  const attempts = profileData?.raw_attempts || [];
  const snapshots = profileData?.snapshots || [];
  const recentDoubts = profileData?.recent_doubts || [];
  const [rightTab, setRightTab] = useState('attempts'); // 'attempts' | 'doubts'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.65rem' }}>
      {/* Top Banner with Back Button */}
      <div className="card" style={{ padding: '0.65rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            className="btn-secondary"
            onClick={onBack}
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <ArrowLeft size={12} /> Back to Roster
          </button>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-bright)' }}>
              Student Pedagogical Drill-Down: {student.name}
            </h2>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              ID: {student.id} • Class: {student.class_id} • Difficulty: {learningProfile.adaptive_difficulty}/7 • Streak: {learningProfile.current_streak}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className="badge badge-accent">Teacher Inspection View</span>
        </div>
      </div>

      {/* Main Grid: Left (Multi-Subject Breakdown) | Right (Attempts / Doubts) */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.15fr 1.35fr', gap: '0.65rem', minHeight: 0 }}>
        {/* Left: 6 Subjects Breakdown */}
        <div className="card" style={{ padding: '0.8rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-bright)', marginBottom: '0.5rem', flexShrink: 0 }}>
            Subject Mastery & Prerequisite Gaps
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.45rem', overflowY: 'auto', paddingRight: '0.2rem' }}>
            {Object.entries(subjectSummaries).map(([sid, sdata]) => {
              const rb = sdata.root_bottleneck;
              return (
                <div
                  key={sid}
                  style={{
                    padding: '0.55rem 0.75rem',
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                    background: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-bright)' }}>
                      {sdata.subject_name}
                    </div>
                    <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>
                      {sdata.mastered_count} Mastered
                    </span>
                  </div>

                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    {rb ? (
                      <span style={{ color: 'var(--color-warning)' }}>
                        Root Prerequisite Bottleneck: <strong>{rb.concept_name}</strong>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-success)' }}>
                        All prerequisite foundations verified.
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Tabbed View (Attempts vs Doubts) */}
        <div className="card" style={{ padding: '0.8rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Sub-Tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                onClick={() => setRightTab('attempts')}
                style={{
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  borderRadius: 6,
                  border: rightTab === 'attempts' ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                  background: rightTab === 'attempts' ? 'var(--color-primary)' : '#ffffff',
                  color: rightTab === 'attempts' ? '#ffffff' : 'var(--text-dim)',
                  cursor: 'pointer',
                }}
              >
                Exam Attempts ({attempts.length})
              </button>
              <button
                onClick={() => setRightTab('doubts')}
                style={{
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  borderRadius: 6,
                  border: rightTab === 'doubts' ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                  background: rightTab === 'doubts' ? 'var(--color-primary)' : '#ffffff',
                  color: rightTab === 'doubts' ? '#ffffff' : 'var(--text-dim)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <span>AI Doubts & Questions ({recentDoubts.length})</span>
                {recentDoubts.length > 0 && (
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: rightTab === 'doubts' ? '#ffffff' : 'var(--color-accent)',
                  }} />
                )}
              </button>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              Live Telemetry
            </span>
          </div>

          {/* Tab 1: Attempts Stream */}
          {rightTab === 'attempts' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.7rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                    <th style={{ padding: '0.3rem 0.4rem' }}>Subject</th>
                    <th style={{ padding: '0.3rem 0.4rem' }}>Question ID</th>
                    <th style={{ padding: '0.3rem 0.4rem' }}>Answer</th>
                    <th style={{ padding: '0.3rem 0.4rem' }}>Result</th>
                    <th style={{ padding: '0.3rem 0.4rem' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((att) => (
                    <tr key={att.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.35rem 0.4rem', color: 'var(--text-dim)' }}>{att.subject_id}</td>
                      <td style={{ padding: '0.35rem 0.4rem', fontFamily: 'var(--font-mono)', color: 'var(--text-bright)' }}>{att.question_id}</td>
                      <td style={{ padding: '0.35rem 0.4rem', color: 'var(--text-dim)' }}>{att.student_answer}</td>
                      <td style={{ padding: '0.35rem 0.4rem' }}>
                        <span
                          style={{
                            color: att.correct ? 'var(--color-success)' : 'var(--color-danger)',
                            fontWeight: '700',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                        >
                          {att.correct ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                          {att.correct ? 'Correct' : 'Incorrect'}
                        </span>
                      </td>
                      <td style={{ padding: '0.35rem 0.4rem', color: 'var(--text-muted)' }}>
                        {att.timestamp?.split('T')[0]} {att.timestamp?.split('T')[1]?.slice(0, 5)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: Recent Doubts Asked */}
          {rightTab === 'doubts' && (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.2rem' }}>
              {recentDoubts.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  No contextual doubts asked by this student yet. When they use "Ask About This" in Learning Path or Gap Map, inquiries will appear here in real-time.
                </div>
              ) : (
                recentDoubts.map((doubt) => (
                  <div
                    key={doubt.id}
                    style={{
                      padding: '0.65rem 0.8rem',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      background: '#ffffff',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-accent" style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>
                        {doubt.concept_id}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {doubt.created_at ? doubt.created_at.split('T')[0] + ' ' + doubt.created_at.split('T')[1]?.slice(0, 5) : 'Recent'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.74rem', fontWeight: '600', color: 'var(--text-bright)' }}>
                      <span style={{ color: 'var(--color-primary)' }}>Q: </span> {doubt.question_text}
                    </div>

                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', background: '#f8fafc', padding: '0.45rem 0.6rem', borderRadius: 6, border: '1px solid var(--border-subtle)', lineHeight: '1.4' }}>
                      <span style={{ fontWeight: '600', color: 'var(--color-accent)' }}>AI Response: </span>
                      {doubt.ai_response}
                    </div>

                    {doubt.follow_up_question && (
                      <div style={{ marginTop: '0.2rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--color-primary)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-bright)' }}>
                          <span style={{ color: 'var(--color-primary)' }}>Follow-up: </span> {doubt.follow_up_question}
                        </div>
                        {doubt.follow_up_response && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                            {doubt.follow_up_response}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
