import React, { useState, useEffect } from 'react';
import {
  Brain,
  Layers,
  Activity,
  GitFork,
  BookOpen,
  HelpCircle,
  TrendingUp,
  Users,
  Grid,
  AlertTriangle,
  Upload,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Cloud,
  Sliders,
  Settings,
  Sparkles,
  X,
  Check
} from 'lucide-react';

// Student App Views
import SubjectSelect from './student-app/SubjectSelect';
import DiagnosticTest from './student-app/DiagnosticTest';
import AnswerReveal from './student-app/AnswerReveal';
import GapMap from './student-app/GapMap';
import LearningPath from './student-app/LearningPath';
import AdaptiveQuiz from './student-app/AdaptiveQuiz';
import MyProgress from './student-app/MyProgress';

// Teacher App Views
import ClassRoster from './teacher-app/ClassRoster';
import StudentDrillDown from './teacher-app/StudentDrillDown';
import ClassHeatmap from './teacher-app/ClassHeatmap';
import CommonGapsReport from './teacher-app/CommonGapsReport';
import QuestionBankUpload from './teacher-app/QuestionBankUpload';
import GoogleDriveImport from './teacher-app/GoogleDriveImport';
import LandingPage from './LandingPage';

const DEMO_STUDENTS = [
  { id: 'student_1', name: 'Alex Rivera', initials: 'AR' },
  { id: 'student_2', name: 'Priya Patel', initials: 'PP' },
  { id: 'student_3', name: 'Marcus Chen', initials: 'MC' },
  { id: 'student_4', name: 'Elena Rostova', initials: 'ER' },
  { id: 'student_5', name: 'David Kim', initials: 'DK' },
  { id: 'student_6', name: 'Fatima Al-Mansoor', initials: 'FM' },
];

const SUBJECTS = [
  { id: 'maths3', name: 'Maths 3' },
  { id: 'automata_theory', name: 'Automata Theory' },
  { id: 'adsa', name: 'ADSA' },
  { id: 'java', name: 'Java' },
  { id: 'c_programming', name: 'C' },
  { id: 'python', name: 'Python' },
];

export default function App() {
  const [role, setRole] = useState('student'); // 'student' | 'teacher'
  const [studentId, setStudentId] = useState('student_1');
  const [subjectId, setSubjectId] = useState('maths3');

  const [showLanding, setShowLanding] = useState(true);

  // Student Navigation Steps:
  // 1: SubjectSelect, 2: DiagnosticTest, 3: AnswerReveal, 4: GapMap, 5: LearningPath, 6: AdaptiveQuiz, 7: MyProgress
  const [studentStep, setStudentStep] = useState(1);
  const [lastSubmitResult, setLastSubmitResult] = useState(null);
  const [targetConceptId, setTargetConceptId] = useState(null);

  // Student Learning Preferences
  const [preferences, setPreferences] = useState({
    explanation_style: 'Simple, step-by-step',
    analogy_domain: 'Everyday life',
    pace: 'Moderate / balanced',
  });
  const [showPrefModal, setShowPrefModal] = useState(false);
  const [isSavingPref, setIsSavingPref] = useState(false);
  const [prefSaveSuccess, setPrefSaveSuccess] = useState(false);

  // AI Service Live Status
  const [aiStatus, setAiStatus] = useState(null);

  // Teacher Navigation Tabs:
  // 'roster', 'drilldown', 'heatmap', 'gaps', 'upload'
  const [teacherTab, setTeacherTab] = useState('roster');
  const [drillDownStudentId, setDrillDownStudentId] = useState('student_1');

  // Fetch Student Preferences on load / change
  useEffect(() => {
    async function loadPreferences() {
      try {
        const res = await fetch(`/learning-preference/${studentId}`, {
          headers: {
            'X-User-Id': studentId,
            'X-User-Role': 'student',
          },
        });
        if (res.ok) {
          const data = await res.json();
          setPreferences({
            explanation_style: data.explanation_style || 'Simple, step-by-step',
            analogy_domain: data.analogy_domain || 'Everyday life',
            pace: data.pace || 'Moderate / balanced',
          });
        }
      } catch (err) {
        console.error('Failed to load learning preferences:', err);
      }
    }
    loadPreferences();
  }, [studentId]);

  // Fetch AI Status when in Teacher View
  useEffect(() => {
    async function checkAiStatus() {
      try {
        const res = await fetch('/admin/ai-status', {
          headers: {
            'X-User-Id': 'teacher_1',
            'X-User-Role': 'teacher',
          },
        });
        if (res.ok) {
          const data = await res.json();
          setAiStatus(data);
        }
      } catch (err) {
        console.error('Failed to check AI status:', err);
      }
    }
    if (role === 'teacher') {
      checkAiStatus();
    }
  }, [role]);

  const handleSavePreferences = async (newPrefs) => {
    setIsSavingPref(true);
    try {
      const res = await fetch('/learning-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': studentId,
          'X-User-Role': 'student',
        },
        body: JSON.stringify({
          student_id: studentId,
          explanation_style: newPrefs.explanation_style,
          analogy_domain: newPrefs.analogy_domain,
          pace: newPrefs.pace,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreferences(data);
        setPrefSaveSuccess(true);
        setTimeout(() => {
          setPrefSaveSuccess(false);
          setShowPrefModal(false);
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to save learning preferences:', err);
    } finally {
      setIsSavingPref(false);
    }
  };

  const studentSteps = [
    { id: 1, name: 'Subject Select', icon: Layers },
    { id: 2, name: 'Diagnostic', icon: Activity },
    { id: 3, name: 'Answer Reveal', icon: CheckCircle2 },
    { id: 4, name: 'Gap Map', icon: GitFork },
    { id: 5, name: 'Learning Path', icon: BookOpen },
    { id: 6, name: 'Adaptive Quiz', icon: HelpCircle },
    { id: 7, name: 'My Progress', icon: TrendingUp },
  ];

  const teacherTabs = [
    { id: 'roster', name: 'Class Roster', icon: Users },
    { id: 'drilldown', name: 'Student Drill-Down', icon: ShieldCheck },
    { id: 'heatmap', name: 'Class Heatmap', icon: Grid },
    { id: 'gaps', name: 'Common Gaps', icon: AlertTriangle },
    { id: 'drive', name: 'Drive Import', icon: Cloud },
    { id: 'upload', name: 'File Upload', icon: Upload },
  ];

  const activeStudent = DEMO_STUDENTS.find((s) => s.id === studentId) || DEMO_STUDENTS[0];
  const activeSubject = SUBJECTS.find((s) => s.id === subjectId) || SUBJECTS[0];

  /* ── Landing page gate ── */
  if (showLanding) {
    return <LandingPage onEnterApp={() => setShowLanding(false)} />;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Application Header */}
      <header className="app-header" style={{ padding: '0.4rem 1rem', flexShrink: 0 }}>
        {/* Left Logo & Role Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
          <div
            className="logo-badge"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              if (role === 'student') setStudentStep(1);
              else setTeacherTab('roster');
            }}
          >
            <div className="logo-icon">
              <Brain size={17} />
            </div>
            <span>EduAdapt AI</span>
          </div>

          {/* Role Switcher Pill */}
          <div style={{ display: 'flex', background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '0.15rem' }}>
            <button
              onClick={() => setRole('student')}
              style={{
                padding: '0.25rem 0.65rem',
                fontSize: '0.72rem',
                borderRadius: 20,
                background: role === 'student' ? 'var(--color-primary)' : 'transparent',
                color: role === 'student' ? '#ffffff' : 'var(--text-dim)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.15s ease',
              }}
            >
              Student View
            </button>
            <button
              onClick={() => setRole('teacher')}
              style={{
                padding: '0.25rem 0.65rem',
                fontSize: '0.72rem',
                borderRadius: 20,
                background: role === 'teacher' ? 'var(--color-primary)' : 'transparent',
                color: role === 'teacher' ? '#ffffff' : 'var(--text-dim)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.15s ease',
              }}
            >
              Teacher / Admin
            </button>
          </div>
        </div>

        {/* Center Navigation Bar */}
        <nav className="cycle-nav" style={{ flexShrink: 0 }}>
          {role === 'student' ? (
            studentSteps.map((s) => {
              const Icon = s.icon;
              const isActive = studentStep === s.id;
              return (
                <button
                  key={s.id}
                  className={`cycle-step-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setStudentStep(s.id)}
                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                >
                  <Icon size={12} />
                  <span>{s.name}</span>
                </button>
              );
            })
          ) : (
            teacherTabs.map((t) => {
              const Icon = t.icon;
              const isActive = teacherTab === t.id;
              return (
                <button
                  key={t.id}
                  className={`cycle-step-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setTeacherTab(t.id)}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
                >
                  <Icon size={12} />
                  <span>{t.name}</span>
                </button>
              );
            })
          )}
        </nav>

        {/* Right Header Metadata & Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {role === 'student' ? (
            <>
              {/* Subject Selector Pill */}
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: 8,
                  background: '#ffffff',
                  color: 'var(--text-bright)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {SUBJECTS.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>

              {/* Student Selector */}
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: 8,
                  background: '#ffffff',
                  color: 'var(--text-bright)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {DEMO_STUDENTS.map((st) => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>

              <div className="student-pill" style={{ padding: '0.2rem 0.5rem' }}>
                <div className="student-avatar" style={{ width: 18, height: 18, fontSize: '0.62rem' }}>
                  {activeStudent.initials}
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: '600' }}>
                  {activeStudent.name}
                </div>
              </div>

              {/* Learning Style Calibration Button */}
              <button
                onClick={() => setShowPrefModal(true)}
                title="Personalize AI Learning Style"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  background: '#ffffff',
                  color: 'var(--color-primary)',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Sliders size={12} />
                <span>Learning Style</span>
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="student-pill" style={{ padding: '0.2rem 0.6rem' }}>
                <div className="student-avatar" style={{ width: 18, height: 18, fontSize: '0.62rem', background: '#0f172a' }}>
                  PS
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: '600' }}>Prof. Sharma</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>Class CS-2026</div>
                </div>
              </div>

              {/* Teacher AI Service Health Status Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.22rem 0.55rem',
                  borderRadius: 20,
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontSize: '0.68rem',
                  color: '#059669',
                  fontWeight: '600',
                  cursor: 'default',
                }}
                title={`AI Provider: ${aiStatus?.provider || 'gemini'} | Model: ${aiStatus?.model || 'gemini-2.5-flash'} | Status: ${aiStatus?.status || 'ok'} | Latency: ${aiStatus?.latency_ms ? aiStatus.latency_ms + 'ms' : 'fast'}`}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
                <span>AI Live: Gemini</span>
              </div>
            </div>
          )}

          {/* Back to landing page */}
          <button
            onClick={() => setShowLanding(true)}
            title="Back to Home"
            style={{
              marginLeft: '0.25rem',
              padding: '0.25rem 0.55rem',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'transparent',
              color: 'var(--text-dim)',
              fontSize: '0.7rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              transition: 'color 0.15s ease',
            }}
          >
            ← Home
          </button>
        </div>
      </header>

      {/* Main Content Area strictly fitting 100vh */}
      <main className="main-container" style={{ flex: 1, padding: '0.65rem 1rem', minHeight: 0, overflow: 'hidden' }}>
        {role === 'student' ? (
          <>
            {studentStep === 1 && (
              <SubjectSelect
                studentId={studentId}
                onSelectSubject={(chosenSubjId, nextView) => {
                  setSubjectId(chosenSubjId);
                  if (nextView === 'diagnostic') setStudentStep(2);
                  else setStudentStep(4);
                }}
              />
            )}

            {studentStep === 2 && (
              <DiagnosticTest
                studentId={studentId}
                subjectId={subjectId}
                onCompleteWithReveal={(result) => {
                  setLastSubmitResult(result);
                  setStudentStep(3); // Jump to AnswerReveal
                }}
              />
            )}

            {studentStep === 3 && (
              <AnswerReveal
                submitResult={lastSubmitResult}
                onProceedToGapMap={() => setStudentStep(4)}
              />
            )}

            {studentStep === 4 && (
              <GapMap
                studentId={studentId}
                subjectId={subjectId}
                onProceedToLearningPath={(cid) => {
                  setTargetConceptId(cid);
                  setStudentStep(5);
                }}
                onSelectConcept={(cid) => setTargetConceptId(cid)}
              />
            )}

            {studentStep === 5 && (
              <LearningPath
                studentId={studentId}
                subjectId={subjectId}
                targetConceptId={targetConceptId}
                onLaunchQuiz={(cid) => {
                  setTargetConceptId(cid);
                  setStudentStep(6);
                }}
              />
            )}

            {studentStep === 6 && (
              <AdaptiveQuiz
                studentId={studentId}
                subjectId={subjectId}
                initialConceptId={targetConceptId}
                onFinishQuiz={() => setStudentStep(7)}
              />
            )}

            {studentStep === 7 && (
              <MyProgress
                studentId={studentId}
                currentSubjectId={subjectId}
                onSelectSubject={(sid) => {
                  setSubjectId(sid);
                  setStudentStep(4);
                }}
                onStartNextCycle={() => setStudentStep(1)}
              />
            )}
          </>
        ) : (
          /* Teacher / Admin Interface */
          <>
            {teacherTab === 'roster' && (
              <ClassRoster
                classId="CS-2026"
                onSelectStudent={(sId) => {
                  setDrillDownStudentId(sId);
                  setTeacherTab('drilldown');
                }}
              />
            )}

            {teacherTab === 'drilldown' && (
              <StudentDrillDown
                studentId={drillDownStudentId}
                onBack={() => setTeacherTab('roster')}
              />
            )}

            {teacherTab === 'heatmap' && (
              <ClassHeatmap
                classId="CS-2026"
                initialSubjectId={subjectId}
              />
            )}

            {teacherTab === 'gaps' && (
              <CommonGapsReport
                classId="CS-2026"
                initialSubjectId={subjectId}
              />
            )}

            {teacherTab === 'drive' && (
              <GoogleDriveImport
                onImportSuccess={() => setTeacherTab('upload')}
              />
            )}

            {teacherTab === 'upload' && (
              <QuestionBankUpload />
            )}
          </>
        )}
      </main>

      {/* Learning Preferences Calibration Modal */}
      {showPrefModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: 520,
            background: '#ffffff',
            borderRadius: 14,
            padding: '1.25rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            border: '1px solid var(--border-subtle)',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ color: 'var(--color-primary)' }}><Sparkles size={18} /></span>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-bright)' }}>
                    AI Learning Profile Calibration
                  </h2>
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                  Personalize how EduAdapt AI generates mental models, step-by-step breakdowns, and answers your doubts.
                </p>
              </div>
              <button
                onClick={() => setShowPrefModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSavePreferences(preferences);
            }} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {/* Style Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: 'var(--text-bright)', marginBottom: '0.35rem' }}>
                  1. Preferred Explanation Style
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
                  {[
                    "Simple, step-by-step",
                    "Show me the math/logic in depth",
                    "Real-world analogies",
                    "Show me code/examples first"
                  ].map((styleOpt) => (
                    <div
                      key={styleOpt}
                      onClick={() => setPreferences({ ...preferences, explanation_style: styleOpt })}
                      style={{
                        padding: '0.45rem 0.6rem',
                        borderRadius: 8,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        border: preferences.explanation_style === styleOpt ? '1.5px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                        background: preferences.explanation_style === styleOpt ? 'rgba(79, 70, 229, 0.06)' : '#ffffff',
                        color: preferences.explanation_style === styleOpt ? 'var(--color-primary)' : 'var(--text-bright)',
                        fontWeight: preferences.explanation_style === styleOpt ? '700' : '500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      <span>{styleOpt}</span>
                      {preferences.explanation_style === styleOpt && <Check size={13} />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Analogy Domain Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: 'var(--text-bright)', marginBottom: '0.35rem' }}>
                  2. Analogy Domain (Metaphors & Intuition)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.4rem' }}>
                  {["Everyday life", "Gaming", "Sports", "Cooking", "Music", "Software"].map((domainOpt) => (
                    <button
                      type="button"
                      key={domainOpt}
                      onClick={() => setPreferences({ ...preferences, analogy_domain: domainOpt })}
                      style={{
                        padding: '0.25rem 0.55rem',
                        borderRadius: 16,
                        fontSize: '0.7rem',
                        border: preferences.analogy_domain === domainOpt ? '1.5px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                        background: preferences.analogy_domain === domainOpt ? 'rgba(79, 70, 229, 0.08)' : '#ffffff',
                        color: preferences.analogy_domain === domainOpt ? 'var(--color-primary)' : 'var(--text-dim)',
                        fontWeight: preferences.analogy_domain === domainOpt ? '700' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      {domainOpt}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={preferences.analogy_domain}
                  onChange={(e) => setPreferences({ ...preferences, analogy_domain: e.target.value })}
                  placeholder="Or custom domain (e.g. Space, Automobiles, Architecture)..."
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem',
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.72rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Pace Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', color: 'var(--text-bright)', marginBottom: '0.35rem' }}>
                  3. Learning Pace & Granularity
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                  {[
                    "Fast-paced / concise",
                    "Moderate / balanced",
                    "Thorough with multiple examples"
                  ].map((paceOpt) => (
                    <div
                      key={paceOpt}
                      onClick={() => setPreferences({ ...preferences, pace: paceOpt })}
                      style={{
                        padding: '0.45rem 0.55rem',
                        borderRadius: 8,
                        fontSize: '0.7rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        border: preferences.pace === paceOpt ? '1.5px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                        background: preferences.pace === paceOpt ? 'rgba(79, 70, 229, 0.06)' : '#ffffff',
                        color: preferences.pace === paceOpt ? 'var(--color-primary)' : 'var(--text-bright)',
                        fontWeight: preferences.pace === paceOpt ? '700' : '500',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      {paceOpt}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowPrefModal(false)}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSavingPref}
                  style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  {prefSaveSuccess ? (
                    <>
                      <Check size={13} /> Saved!
                    </>
                  ) : isSavingPref ? (
                    'Saving...'
                  ) : (
                    'Save & Calibrate AI'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Support Help Circle Button as shown in Reference Images */}
      <button className="floating-help-btn" title="AI Learning Support" onClick={() => alert("LearnAI Tutor is online and calibrated to your current knowledge state.")}>
        ?
      </button>
    </div>
  );
}
