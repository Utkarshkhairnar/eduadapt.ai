import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight, Database, Download } from 'lucide-react';

const SUBJECT_OPTIONS = [
  { id: 'maths3', label: 'Maths 3' },
  { id: 'automata_theory', label: 'Automata Theory' },
  { id: 'adsa', label: 'ADSA' },
  { id: 'java', label: 'Java' },
  { id: 'c_programming', label: 'C' },
  { id: 'python', label: 'Python' },
];

export default function QuestionBankUpload() {
  const [subjectId, setSubjectId] = useState('maths3');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMsg(null);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMsg('Please select a CSV, PDF, or DOCX question bank file.');
      return;
    }

    try {
      setUploading(true);
      setErrorMsg(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('subject_id', subjectId);

      const res = await fetch('/admin/question-bank/upload', {
        method: 'POST',
        headers: {
          'X-User-Id': 'teacher_1',
          'X-User-Role': 'teacher',
        },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || 'Upload failed');
      }

      setUploadResult(json);
    } catch (err) {
      console.error('Upload error:', err);
      setErrorMsg(err.message || 'Failed to upload question bank');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.65rem' }}>
      {/* Top Banner */}
      <div className="card" style={{ padding: '0.65rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-bright)' }}>
              Curriculum Question Bank Ingestion Pipeline
            </h2>
            <span className="badge badge-accent">CSV • PDF • DOCX Multi-Format</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
            Automated concept graph keyword matching with manual-override mapping into <code>backend/data/question_banks/&lt;subject_id&gt;.json</code>.
          </p>
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

      {/* Main Grid: Left (Upload Zone & Format Specs) | Right (Preview & Ingestion Results) */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.1fr 1.3fr', gap: '0.65rem', minHeight: 0 }}>
        {/* Left: Upload Zone */}
        <div className="card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-bright)', marginBottom: '0.6rem' }}>
              Upload Question Bank File for {SUBJECT_OPTIONS.find((s) => s.id === subjectId)?.label}
            </div>

            {/* Drag & Drop Area */}
            <label
              style={{
                border: '2px dashed var(--border-subtle)',
                borderRadius: 8,
                padding: '1.2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                background: '#f8fafc',
                transition: 'border-color 0.15s ease',
              }}
            >
              <Upload size={24} color="var(--color-primary)" />
              <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-bright)' }}>
                {selectedFile ? selectedFile.name : 'Click to select CSV, PDF, or DOCX'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Supports CSV (question, options, answer), formatted PDF, or Word DOCX
              </div>
              <input
                type="file"
                accept=".csv,.pdf,.docx,.doc"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>

            {errorMsg && (
              <div style={{ marginTop: '0.6rem', padding: '0.5rem', borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertTriangle size={13} flexShrink={0} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Ingestion Specification Hints */}
            <div style={{ marginTop: '0.8rem', background: '#f8fafc', padding: '0.6rem', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: '1.4' }}>
              <div style={{ fontWeight: '700', color: 'var(--text-bright)', marginBottom: '0.2rem' }}>
                Pipeline Parsing Rules:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                <li>Auto-detects concept IDs from keyword matches against concept graph nodes.</li>
                <li>Normalizes difficulty to bounded [1.0, 7.0] scale.</li>
                <li>Appends questions idempotently to avoid duplicate prompts.</li>
              </ul>
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            style={{ width: '100%', padding: '0.45rem', fontSize: '0.78rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.35rem', marginTop: '0.6rem' }}
          >
            {uploading ? 'Parsing & Mapping Concepts...' : `Ingest into ${subjectId} Bank`}
          </button>
        </div>

        {/* Right: Ingestion Status & Preview */}
        <div className="card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-bright)', marginBottom: '0.5rem', flexShrink: 0 }}>
            Ingestion Pipeline Output & Mapped Concepts
          </div>

          {uploadResult ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 0 }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', padding: '0.6rem', borderRadius: 6, color: '#059669', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} flexShrink={0} />
                <div>
                  <strong>{uploadResult.message}</strong>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    Saved to {uploadResult.saved_path}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-bright)', marginTop: '0.2rem' }}>
                Sample Ingested Questions & Graph Mappings:
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {(uploadResult.sample_questions || []).map((q, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', padding: '0.5rem 0.6rem', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.7rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span className="badge badge-accent" style={{ fontSize: '0.62rem' }}>
                        Mapped Concept: {q.concept_id}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>Diff: {q.difficulty}/7</span>
                    </div>
                    <div style={{ color: 'var(--text-bright)', fontWeight: '600', marginBottom: '0.25rem' }}>
                      {q.text}
                    </div>
                    <div style={{ color: 'var(--color-success)', fontSize: '0.68rem' }}>
                      Answer: {q.correct_answer}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>
              <Database size={28} color="var(--color-primary)" opacity={0.6} />
              <div>Ready for assessment file upload.</div>
              <div style={{ fontSize: '0.68rem', maxWidth: 260 }}>
                Select a CSV, PDF, or DOCX question file to preview parsed concepts and add to the live question bank.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
