import React, { useState } from 'react';
import { Cloud, Search, CheckCircle2, AlertTriangle, ArrowRight, Database, FileText, Check, Edit2, Sparkles, Folder } from 'lucide-react';

const DEFAULT_DRIVE_URL = 'https://drive.google.com/drive/folders/1hGhtwrpMxWxtwi4NAnkreCz-_B5dy_Eo';

const SUBJECTS_LIST = [
  { id: 'maths3', name: 'Maths 3' },
  { id: 'automata_theory', name: 'Automata Theory' },
  { id: 'adsa', name: 'ADSA' },
  { id: 'java', name: 'Java' },
  { id: 'c_programming', name: 'C' },
  { id: 'python', name: 'Python' },
];

export default function GoogleDriveImport({ onImportSuccess }) {
  const [folderUrl, setFolderUrl] = useState(DEFAULT_DRIVE_URL);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(null);

  const handleScan = async () => {
    try {
      setScanning(true);
      setErrorMsg(null);
      setScanResult(null);
      setConfirmSuccess(null);

      const res = await fetch('/admin/drive-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'teacher_1',
          'X-User-Role': 'teacher',
        },
        body: JSON.stringify({ folder_url_or_id: folderUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to scan Google Drive folder');
      }

      setScanResult(data);
      setQuestions(data.questions_preview || []);
    } catch (err) {
      console.error('Scan error:', err);
      setErrorMsg(err.message || 'Error communicating with Google Drive');
    } finally {
      setScanning(false);
    }
  };

  const handleUpdateQuestion = (qId, field, value) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === qId) {
          const updated = { ...q, [field]: value };
          if (field === 'concept_id' && value) {
            updated.needs_manual_review = false;
            updated.concept_confidence = 1.0;
          }
          if (field === 'subject_id' && value) {
            updated.detected_subject_id = value;
          }
          return updated;
        }
        return q;
      })
    );
  };

  const handleConfirmImport = async () => {
    if (questions.length === 0 || confirming) return;
    try {
      setConfirming(true);
      setErrorMsg(null);

      const res = await fetch('/admin/drive-import/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'teacher_1',
          'X-User-Role': 'teacher',
        },
        body: JSON.stringify({ confirmed_questions: questions }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to confirm import');
      }

      setConfirmSuccess(data);
      if (onImportSuccess) {
        onImportSuccess(data);
      }
    } catch (err) {
      console.error('Confirm import error:', err);
      setErrorMsg(err.message || 'Error merging into question banks');
    } finally {
      setConfirming(false);
    }
  };

  const flaggedCount = questions.filter((q) => q.needs_manual_review).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.65rem' }}>
      {/* Top Banner */}
      <div className="card" style={{ padding: '0.65rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-bright)' }}>
              Google Drive Ingestion Pipeline
            </h2>
            <span className="badge badge-accent">Google Drive API v3 • Direct Sync</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
            Pulls student assessment files (PDF, DOCX, CSV, Google Docs) directly from the shared Drive folder and feeds into the adaptive pipeline.
          </p>
        </div>

        {scanResult && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
              {questions.length} Questions Extracted
            </span>
            {flaggedCount > 0 ? (
              <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                {flaggedCount} Need Review
              </span>
            ) : (
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                All Concepts Mapped
              </span>
            )}
          </div>
        )}
      </div>

      {/* URL Input & Trigger Bar */}
      <div className="card" style={{ padding: '0.6rem 0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-primary)', fontSize: '0.78rem', fontWeight: '600', flexShrink: 0 }}>
          <Folder size={15} /> Source Folder:
        </div>
        <input
          type="text"
          value={folderUrl}
          onChange={(e) => setFolderUrl(e.target.value)}
          placeholder="https://drive.google.com/drive/folders/..."
          style={{
            flex: 1,
            background: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            padding: '0.35rem 0.6rem',
            color: 'var(--text-bright)',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            outline: 'none',
          }}
        />
        <button
          className="btn-primary"
          onClick={handleScan}
          disabled={scanning}
          style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}
        >
          {scanning ? <div className="spinner" /> : <Search size={13} />}
          {scanning ? 'Scanning Folder...' : 'Scan Folder'}
        </button>
      </div>

      {errorMsg && (
        <div style={{ padding: '0.55rem 0.8rem', borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <AlertTriangle size={14} flexShrink={0} />
          <div>{errorMsg}</div>
        </div>
      )}

      {confirmSuccess && (
        <div style={{ padding: '0.55rem 0.8rem', borderRadius: 6, background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={16} />
            <strong>{confirmSuccess.message}</strong>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-bright)' }}>
            Available in Diagnostic, Gap Map & Adaptive Quiz!
          </span>
        </div>
      )}

      {/* Main Content: Split View (Per-Subject Summary | Question Preview & Inline Editor) */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 2.3fr', gap: '0.65rem', minHeight: 0 }}>
        {/* Left: Summary & Files Ingested */}
        <div className="card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-bright)', marginBottom: '0.5rem' }}>
              Drive Folder Inspection
            </div>

            {scanResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '0.5rem', borderRadius: 6, border: '1px solid rgba(99, 102, 241, 0.2)', fontSize: '0.72rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span>Files Scanned:</span>
                    <strong>{scanResult.total_files_scanned} files</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span>Questions Extracted:</span>
                    <strong style={{ color: 'var(--color-success)' }}>{scanResult.total_questions_parsed}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Flagged for Review:</span>
                    <strong style={{ color: flaggedCount > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                      {flaggedCount}
                    </strong>
                  </div>
                </div>

                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-bright)' }}>
                  Questions per Subject:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {Object.entries(scanResult.per_subject_summary || {}).map(([sid, count]) => {
                    const sname = SUBJECTS_LIST.find((s) => s.id === sid)?.name || sid;
                    return (
                      <div key={sid} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', padding: '0.25rem 0.45rem', borderRadius: 4, background: '#f8fafc', border: '1px solid var(--border-subtle)' }}>
                        <span style={{ color: 'var(--text-bright)' }}>{sname}</span>
                        <span className="badge badge-accent" style={{ fontSize: '0.62rem' }}>{count} items</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-bright)', marginTop: '0.3rem' }}>
                  Extracted Files:
                </div>
                <div style={{ maxHeight: 110, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {(scanResult.files_summary || []).map((f, fIdx) => (
                    <div key={fIdx} style={{ fontSize: '0.65rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <FileText size={11} flexShrink={0} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>
                <Cloud size={30} color="var(--color-primary)" opacity={0.6} />
                <div>Click "Scan Folder" to enumerate assessment files.</div>
              </div>
            )}
          </div>

          <button
            className="btn-primary"
            onClick={handleConfirmImport}
            disabled={questions.length === 0 || confirming}
            style={{ width: '100%', padding: '0.45rem', fontSize: '0.78rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem', background: 'var(--color-success)' }}
          >
            {confirming ? 'Merging Questions...' : `Confirm Import (${questions.length} Questions)`} <ArrowRight size={13} />
          </button>
        </div>

        {/* Right: Question Table with Inline Concept & Subject Editor */}
        <div className="card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexShrink: 0 }}>
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-bright)' }}>
                Extracted Questions Preview & Concept Tagging
              </span>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Review keyword-mapped concepts. Edit any concept_id or subject before confirming.
              </div>
            </div>
            {flaggedCount > 0 && (
              <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                {flaggedCount} Low-Confidence Items Flagged
              </span>
            )}
          </div>

          {questions.length > 0 ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.72rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                    <th style={{ padding: '0.35rem 0.4rem', width: '38%' }}>Question Text</th>
                    <th style={{ padding: '0.35rem 0.4rem', width: '22%' }}>Subject</th>
                    <th style={{ padding: '0.35rem 0.4rem', width: '25%' }}>Mapped Concept</th>
                    <th style={{ padding: '0.35rem 0.4rem', width: '15%' }}>Answer</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => {
                    const isFlagged = q.needs_manual_review;
                    return (
                      <tr
                        key={q.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isFlagged ? '#fef2f2' : '#ffffff',
                        }}
                      >
                        <td style={{ padding: '0.4rem 0.4rem', color: 'var(--text-bright)', lineHeight: '1.3' }}>
                          <div style={{ fontWeight: '500', marginBottom: '0.15rem' }}>{q.text}</div>
                          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                            Source: {q.source_file || 'Google Drive'}
                          </div>
                        </td>

                        {/* Editable Subject */}
                        <td style={{ padding: '0.4rem 0.4rem' }}>
                          <select
                            value={q.subject_id}
                            onChange={(e) => handleUpdateQuestion(q.id, 'subject_id', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.2rem 0.4rem',
                              borderRadius: 4,
                              background: '#ffffff',
                              color: 'var(--text-bright)',
                              border: isFlagged ? '1px solid var(--color-warning)' : '1px solid var(--border-subtle)',
                              fontSize: '0.68rem',
                            }}
                          >
                            {SUBJECTS_LIST.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </td>

                        {/* Editable Concept */}
                        <td style={{ padding: '0.4rem 0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <input
                              type="text"
                              value={q.concept_id}
                              onChange={(e) => handleUpdateQuestion(q.id, 'concept_id', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '0.2rem 0.4rem',
                                borderRadius: 4,
                                background: '#ffffff',
                                color: isFlagged ? 'var(--color-warning)' : 'var(--text-bright)',
                                border: isFlagged ? '1.5px solid var(--color-danger)' : '1px solid var(--border-subtle)',
                                fontSize: '0.68rem',
                                fontFamily: 'var(--font-mono)',
                              }}
                            />
                            {isFlagged && (
                              <span title="Low confidence mapping: Click to correct concept" style={{ color: 'var(--color-danger)' }}>
                                <AlertTriangle size={12} />
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: '0.4rem 0.4rem', color: 'var(--color-success)', fontWeight: '600' }}>
                          {q.correct_answer}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              <Database size={24} color="var(--color-primary)" opacity={0.5} />
              <div>No Drive questions loaded yet.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
