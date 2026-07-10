import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  FlaskConical, Camera, Download, Pencil, Check, X, Sparkles, Trash2, Upload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const TYPES = [
  { id: 'positive', label: 'Positive' },
  { id: 'negative', label: 'Negative' },
  { id: 'validation', label: 'Validation' },
  { id: 'boundary', label: 'Boundary' },
];

export default function TestCaseGenerator({ project }) {
  const { api } = useAuth();
  const [form, setForm] = useState({ module: '', feature: '', user_story: '' });
  const [selectedTypes, setSelectedTypes] = useState(['positive', 'negative', 'validation', 'boundary']);
  const [testCases, setTestCases] = useState([]); // persisted rows: { db_id, id, tc_number, title, type, steps, expected, priority, source }
  const [loadingList, setLoadingList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('generate');
  const [editingId, setEditingId] = useState(null);
  const [editBuf, setEditBuf] = useState({});
  const [continuePrompt, setContinuePrompt] = useState(null);
  const [askCustomStart, setAskCustomStart] = useState(false);
  const [customStartValue, setCustomStartValue] = useState('');

  // Screenshot module state (merged in here per product requirement)
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const toggleType = (t) => setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const loadExisting = useCallback(async () => {
    if (!project) { setTestCases([]); return; }
    setLoadingList(true);
    try {
      const res = await api.get(`/testcases/project/${project.id}`);
      setTestCases(res.data);
    } catch (e) {
      toast.error('Could not load existing test cases');
    } finally {
      setLoadingList(false);
    }
  }, [project, api]);

  // Whenever the user opens/switches a project, show whatever test cases
  // already exist for it, instead of starting from an empty table.
  useEffect(() => { loadExisting(); }, [loadExisting]);

  const runGenerate = async (customStartId) => {
    setLoading(true);
    try {
      const res = await api.post('/testcases/generate', {
        project_id: project.id,
        ...form,
        test_types: selectedTypes,
        custom_start_id: customStartId ?? null,
      });
      toast.success(`${res.data.count} test cases generated (TC-${String(res.data.starting_test_case_id).padStart(3, '0')} to TC-${String(res.data.ending_test_case_id).padStart(3, '0')})`);
      await loadExisting(); // appended rows show up right after the ones already in the table
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const generate = async () => {
    if (!project) { toast.error('Open a project first'); return; }
    if (!form.module || !form.feature) { toast.error('Module and Feature are required'); return; }
    if (!selectedTypes.length) { toast.error('Select at least one test type'); return; }

    try {
      const check = await api.get(`/testcases/continue-check/${project.id}`);
      if (check.data.current_counter > 0) {
        setContinuePrompt(check.data);
        return;
      }
      await runGenerate(null);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not check test case numbering');
    }
  };

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, etc.)');
      return;
    }
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const generateFromScreenshot = async () => {
    if (!project) { toast.error('Open a project first'); return; }
    if (!image) { toast.error('Please upload a screenshot first'); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', image);
      formData.append('project_id', project.id);
      const res = await api.post('/testcases/from-screenshot', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`${res.data.count} test cases generated from screenshot (TC-${String(res.data.starting_test_case_id).padStart(3, '0')} to TC-${String(res.data.ending_test_case_id).padStart(3, '0')})`);
      setImage(null);
      setPreview(null);
      await loadExisting();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const exportFile = async (format) => {
    if (!testCases.length) { toast.error('No test cases to export'); return; }
    try {
      const payload = testCases.map(tc => ({ id: tc.id, title: tc.title, type: tc.type, steps: tc.steps, expected: tc.expected, priority: tc.priority }));
      const res = await api.post(`/testcases/export/${format}`, payload, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `test_cases.${format === 'excel' ? 'xlsx' : 'csv'}`; a.click();
      toast.success('Downloaded!');
    } catch { toast.error('Export failed'); }
  };

  const startEdit = (tc) => { setEditingId(tc.db_id); setEditBuf({ ...tc }); };

  const saveEdit = async () => {
    try {
      const res = await api.put(`/testcases/${editingId}`, {
        title: editBuf.title,
        type: editBuf.type,
        steps: editBuf.steps,
        expected: editBuf.expected,
        priority: editBuf.priority,
      });
      setTestCases(prev => prev.map(tc => tc.db_id === editingId ? res.data : tc));
      setEditingId(null);
      toast.success('Test case updated');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not update test case');
    }
  };

  const deleteTestCase = async (tc) => {
    if (!window.confirm(`Delete ${tc.id}? This cannot be undone.`)) return;
    try {
      await api.delete(`/testcases/${tc.db_id}`);
      setTestCases(prev => prev.filter(t => t.db_id !== tc.db_id));
      toast.success('Test case deleted');
    } catch (e) {
      toast.error('Could not delete test case');
    }
  };

  const badgeClass = (v) => {
    const map = { positive: 'badge-positive', negative: 'badge-negative', validation: 'badge-validation', boundary: 'badge-boundary', High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
    return `badge ${map[v] || 'badge-low'}`;
  };

  return (
    <>
    {continuePrompt && (
      <div className="modal-overlay">
        <div className="modal-card">
          <h2>Continue test case numbering?</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            You have previously generated test cases up to TC-{String(continuePrompt.current_counter).padStart(3, '0')}.
            Would you like to continue from TC-{String(continuePrompt.next_id_if_yes).padStart(3, '0')}?
          </p>
          <div className="modal-actions">
            <button onClick={() => { setContinuePrompt(null); setAskCustomStart(true); }}>No, custom start</button>
            <button className="primary" onClick={() => { setContinuePrompt(null); runGenerate(null); }}>
              Yes, continue
            </button>
          </div>
        </div>
      </div>
    )}
    {askCustomStart && (
      <div className="modal-overlay">
        <div className="modal-card">
          <h2>Custom starting Test Case ID</h2>
          <label>Enter the Test Case number to start from</label>
          <input
            type="number"
            min="1"
            autoFocus
            value={customStartValue}
            onChange={(e) => setCustomStartValue(e.target.value)}
            placeholder="e.g. 25"
          />
          <div className="modal-actions">
            <button onClick={() => { setAskCustomStart(false); setCustomStartValue(''); }}>Cancel</button>
            <button
              className="primary"
              onClick={() => {
                const n = parseInt(customStartValue, 10);
                if (!n || n <= 0) { toast.error('Enter a valid number greater than zero'); return; }
                setAskCustomStart(false);
                setCustomStartValue('');
                runGenerate(n);
              }}
            >
              Start Generation
            </button>
          </div>
        </div>
      </div>
    )}
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <FlaskConical size={20} color="#1a56db" />
          <h1>Test Case Generator</h1>
        </div>
        <p className="page-subtitle">Generate test cases from a feature description or a UI screenshot — all in one place, numbered sequentially per project.</p>
      </div>

      <div className="tab-bar">
        {['generate', 'screenshot'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'generate' ? <><Sparkles size={13} style={{ marginRight: 5 }} />Generate from Text</> : <><Camera size={13} style={{ marginRight: 5 }} />Generate from Screenshot</>}
          </button>
        ))}
      </div>

      {tab === 'generate' && (
        <div className="card">
          <div className="form-row">
            <div className="form-group">
              <label>Module Name *</label>
              <input type="text" placeholder="e.g. User Authentication" value={form.module}
                onChange={e => setForm(p => ({ ...p, module: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Feature *</label>
              <input type="text" placeholder="e.g. Login with email & password" value={form.feature}
                onChange={e => setForm(p => ({ ...p, feature: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label>User Story (optional)</label>
            <textarea placeholder="As a user, I want to..." value={form.user_story}
              onChange={e => setForm(p => ({ ...p, user_story: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Test Types</label>
            <div className="checkbox-group">
              {TYPES.map(t => (
                <label key={t.id} className="checkbox-item">
                  <input type="checkbox" checked={selectedTypes.includes(t.id)} onChange={() => toggleType(t.id)} />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" onClick={generate} disabled={loading}>
            {loading ? <><div className="spinner" />Generating…</> : <><Sparkles size={15} />Generate Test Cases</>}
          </button>
        </div>
      )}

      {tab === 'screenshot' && (
        <div className="card">
          <h2 style={{ marginBottom: 12 }}>Upload UI Screenshot</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Upload any UI screen — login page, form, dashboard, etc. — and test cases will be generated
            and appended below with the next sequential Test Case IDs for this project.
          </p>
          {!preview ? (
            <div
              className={`upload-zone ${dragOver ? 'active' : ''}`}
              onClick={() => fileRef.current.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            >
              <Camera size={32} color="var(--primary)" style={{ opacity: 0.5 }} />
              <p><strong>Click to upload</strong> or drag & drop</p>
              <p>PNG, JPG, JPEG, WEBP supported</p>
            </div>
          ) : (
            <div className="screenshot-preview">
              <img src={preview} alt="UI Screenshot" />
              <span className="screenshot-badge">📸 Ready</span>
              <button onClick={() => { setImage(null); setPreview(null); }}
                style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} />
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

          {preview && (
            <div style={{ marginTop: 14 }}>
              <button className="btn btn-primary" onClick={generateFromScreenshot} disabled={loading}>
                {loading ? <><div className="spinner" />Analyzing screenshot…</> : <><Sparkles size={15} />Generate Test Cases</>}
              </button>
              <button className="btn btn-secondary" onClick={() => fileRef.current.click()} style={{ marginLeft: 10 }}>
                <Upload size={13} /> Change Image
              </button>
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="section-header" style={{ padding: '16px 20px', borderBottom: '1px solid #f0eff8', margin: 0 }}>
          <div>
            <h2 style={{ margin: 0 }}>Test Cases{project ? ` · ${project.name}` : ''}</h2>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              {loadingList ? 'Loading…' : `${testCases.length} test case${testCases.length === 1 ? '' : 's'} for this project`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => exportFile('csv')}><Download size={13} /> CSV</button>
            <button className="btn btn-secondary btn-sm" onClick={() => exportFile('excel')}><Download size={13} /> Excel</button>
          </div>
        </div>
        {!project ? (
          <div style={{ padding: 20, fontSize: 13, color: 'var(--text-muted)' }}>Open a project to see its test cases.</div>
        ) : testCases.length === 0 && !loadingList ? (
          <div style={{ padding: 20, fontSize: 13, color: 'var(--text-muted)' }}>No test cases yet — generate some from text or a screenshot above.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tc-table">
              <thead>
                <tr><th>#</th><th>ID</th><th>Title</th><th>Type</th><th>Steps</th><th>Expected</th><th>Priority</th><th>Source</th><th></th></tr>
              </thead>
              <tbody>
                {testCases.map(tc => (
                  <tr key={tc.db_id}>
                    {editingId === tc.db_id ? (
                      <>
                        <td>{tc.tc_number}</td>
                        <td><code style={{ fontSize: 11 }}>{tc.id}</code></td>
                        <td><input value={editBuf.title} onChange={e => setEditBuf(p => ({ ...p, title: e.target.value }))} style={{ width: '100%', padding: '4px 6px', fontSize: 12 }} /></td>
                        <td>
                          <select value={editBuf.type} onChange={e => setEditBuf(p => ({ ...p, type: e.target.value }))} style={{ fontSize: 12 }}>
                            {TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                          </select>
                        </td>
                        <td><textarea value={editBuf.steps} onChange={e => setEditBuf(p => ({ ...p, steps: e.target.value }))} style={{ width: '100%', fontSize: 11, minHeight: 60 }} /></td>
                        <td><input value={editBuf.expected} onChange={e => setEditBuf(p => ({ ...p, expected: e.target.value }))} style={{ width: '100%', padding: '4px 6px', fontSize: 12 }} /></td>
                        <td>
                          <select value={editBuf.priority} onChange={e => setEditBuf(p => ({ ...p, priority: e.target.value }))} style={{ fontSize: 12 }}>
                            <option>High</option><option>Medium</option><option>Low</option>
                          </select>
                        </td>
                        <td><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{tc.source}</span></td>
                        <td>
                          <button className="btn btn-sm" style={{ color: '#1D9E75', background: 'none', border: 'none' }} onClick={saveEdit}><Check size={14} /></button>
                          <button className="btn btn-sm" style={{ color: '#aaa', background: 'none', border: 'none' }} onClick={() => setEditingId(null)}><X size={14} /></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tc.tc_number}</td>
                        <td><code style={{ fontSize: 11, color: '#1a56db' }}>{tc.id}</code></td>
                        <td style={{ maxWidth: 220 }}>{tc.title}</td>
                        <td><span className={badgeClass(tc.type)}>{tc.type}</span></td>
                        <td style={{ maxWidth: 200, fontSize: 12, color: '#555', whiteSpace: 'pre-line' }}>{tc.steps}</td>
                        <td style={{ maxWidth: 180, fontSize: 12 }}>{tc.expected}</td>
                        <td><span className={badgeClass(tc.priority)}>{tc.priority}</span></td>
                        <td><span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{tc.source}</span></td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn btn-sm" style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }} onClick={() => startEdit(tc)}><Pencil size={13} /></button>
                          <button className="btn btn-sm" style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }} onClick={() => deleteTestCase(tc)}><Trash2 size={13} /></button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
