import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examAPI, nrAPI } from '../services/api';
import {
  Upload, FileSpreadsheet, CheckCircle, AlertTriangle, ArrowRight,
  ArrowLeft, Plus, Trash2, Calendar, BookOpen, Layers, CheckCircle2
} from 'lucide-react';
import Modal from '../components/common/Modal';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import SelectDropdown from '../components/common/SelectDropdown';

export default function NRUpload() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const [step, setStep] = useState('select_scheme');

  const [curricula, setCurricula] = useState([]);
  const [years, setYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [completedSemesters, setCompletedSemesters] = useState(new Set());

  const [selectedScheme, setSelectedScheme] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('MIXED'); // Regular, Supply, Mixed

  const [uploadResult, setUploadResult] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [loading, setLoading] = useState(false);

  // Create modals
  const [showCreateCurriculum, setShowCreateCurriculum] = useState(false);
  const [showCreateYear, setShowCreateYear] = useState(false);
  const [showCreateSemester, setShowCreateSemester] = useState(false);
  const [newCurriculumCode, setNewCurriculumCode] = useState('');
  const [newCurriculumName, setNewCurriculumName] = useState('');
  const [newYearValue, setNewYearValue] = useState('');
  const [newSemesterNumber, setNewSemesterNumber] = useState('');

  useEffect(() => {
    loadCurricula();
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const res = await examAPI.getSessionConfigs(sessionId);
      const configs = res.data.results || res.data || [];
      setCompletedSemesters(new Set(configs.map(c => c.semester)));
    } catch (err) {
      console.error(err);
    }
  };

  const loadCurricula = async () => {
    try {
      const res = await examAPI.getCurricula();
      setCurricula(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadYears = async (curriculumId) => {
    try {
      const res = await examAPI.getYears(curriculumId);
      setYears(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadSemesters = async (yearId) => {
    try {
      const res = await examAPI.getSemesters(yearId);
      setSemesters(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectScheme = (scheme) => {
    setSelectedScheme(scheme);
    loadYears(scheme.id);
    setStep('select_year');
  };

  const handleSelectYear = (year) => {
    setSelectedYear(year);
    loadSemesters(year.id);
    setStep('select_semester');
  };

  const handleSelectSemester = (sem) => {
    setSelectedSemester(sem);
    setStep('upload');
  };

  const handleDeleteCurriculum = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this curriculum?')) return;
    try {
      await examAPI.deleteCurriculum(id);
      loadCurricula();
    } catch (err) {
      alert('Failed to delete curriculum');
    }
  };

  const handleDeleteYear = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this year?')) return;
    try {
      await examAPI.deleteYear(id);
      loadYears(selectedScheme.id);
    } catch (err) {
      alert('Failed to delete year');
    }
  };

  const handleDeleteSemester = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this semester?')) return;
    try {
      await examAPI.deleteSemester(id);
      loadSemesters(selectedYear.id);
    } catch (err) {
      alert('Failed to delete semester');
    }
  };

  const handleCreateCurriculum = async (e) => {
    e?.preventDefault();
    if (!newCurriculumCode.trim()) return;
    try {
      await examAPI.createCurriculum({
        code: newCurriculumCode,
        name: newCurriculumName || newCurriculumCode,
      });
      setShowCreateCurriculum(false);
      setNewCurriculumCode('');
      setNewCurriculumName('');
      loadCurricula();
    } catch (err) {
      alert(err.response?.data?.code?.[0] || 'Failed to create curriculum');
    }
  };

  const handleCreateYear = async (e) => {
    e?.preventDefault();
    if (!newYearValue || !selectedScheme) return;
    try {
      await examAPI.createYear({
        curriculum: selectedScheme.id,
        year: parseInt(newYearValue),
      });
      setShowCreateYear(false);
      setNewYearValue('');
      loadYears(selectedScheme.id);
    } catch (err) {
      alert(err.response?.data?.non_field_errors?.[0] || err.response?.data?.year?.[0] || 'Failed to create academic year');
    }
  };

  const handleCreateSemester = async (e) => {
    e?.preventDefault();
    if (!newSemesterNumber || !selectedYear) return;
    try {
      await examAPI.createSemester({
        academic_year: selectedYear.id,
        number: parseInt(newSemesterNumber),
      });
      setShowCreateSemester(false);
      setNewSemesterNumber('');
      loadSemesters(selectedYear.id);
    } catch (err) {
      alert(err.response?.data?.non_field_errors?.[0] || err.response?.data?.number?.[0] || 'Failed to create semester');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
      setFile(f);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await nrAPI.upload(sessionId, file);
      setUploadResult(res.data);
      const recSheet = res.data.recommended_sheet || '';
      const sheets = res.data.sheets || [];
      setAvailableSheets(sheets);
      setSelectedSheet(recSheet);

      setStep('validating');
      const valRes = await nrAPI.validate(res.data.upload_id, recSheet);
      setValidationResult(valRes.data);
      if (valRes.data.selected_sheet) {
        setSelectedSheet(valRes.data.selected_sheet);
      }
      if (valRes.data.sheets) {
        setAvailableSheets(valRes.data.sheets);
      }
      setStep('results');
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const handleSheetChange = async (sheetName) => {
    setSelectedSheet(sheetName);
    setLoading(true);
    setStep('validating');
    try {
      const valRes = await nrAPI.validate(uploadResult.upload_id, sheetName);
      setValidationResult(valRes.data);
      if (valRes.data.selected_sheet) {
        setSelectedSheet(valRes.data.selected_sheet);
      }
      setStep('results');
    } catch (err) {
      alert(err.response?.data?.error || 'Validation failed for selected sheet');
      setStep('results');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setStep('importing');
    try {
      const res = await nrAPI.importData(uploadResult.upload_id, {
        curriculum: selectedScheme?.code,
        year: selectedYear?.year,
        semester: selectedSemester?.number,
        category: selectedCategory,
        sheet_name: selectedSheet,
      });
      setImportResult(res.data);
      loadConfigs();
    } catch (err) {
      alert(err.response?.data?.error || 'Import failed');
      setStep('results');
    } finally {
      setLoading(false);
    }
  };

  const yearLabels = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year' };

  // Stepper steps
  const stepsList = [
    { key: 'select_scheme', label: '1. Curriculum' },
    { key: 'select_year', label: '2. Academic Year' },
    { key: 'select_semester', label: '3. Semester' },
    { key: 'upload', label: '4. Excel File' },
  ];

  const getStepIndex = (s) => {
    if (s === 'select_scheme') return 0;
    if (s === 'select_year') return 1;
    if (s === 'select_semester') return 2;
    return 3;
  };

  const currentStepIdx = getStepIndex(step);

  return (
    <div className="fade-in">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(`/examination/${sessionId}`)}
            style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={14} />
            <span>Back to Session</span>
          </button>
          <h1 className="page-title">Nominal Roll Import Wizard</h1>
          <p className="page-subtitle">
            Configure curriculum parameters and upload candidate enrollment rosters
          </p>
        </div>
      </div>

      {/* ── Stepper Navigation ── */}
      <div
        className="card"
        style={{
          marginBottom: 24,
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {stepsList.map((item, idx) => {
            const isActive = idx === currentStepIdx;
            const isDone = idx < currentStepIdx;
            return (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--primary)' : isDone ? 'var(--success)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  {isDone ? <CheckCircle size={14} /> : null}
                  {item.label}
                </span>
                {idx < stepsList.length - 1 && (
                  <ArrowRight size={13} color="var(--border-strong)" style={{ margin: '0 4px' }} />
                )}
              </div>
            );
          })}
        </div>

        {selectedScheme && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="badge badge-primary">{selectedScheme.code}</span>
            {selectedYear && (
              <span className="badge badge-accent">
                {yearLabels[selectedYear.year] || `Year ${selectedYear.year}`}
              </span>
            )}
            {selectedSemester && (
              <span className="badge badge-success">
                Semester {selectedSemester.number}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Modal: Add Curriculum ── */}
      <Modal
        isOpen={showCreateCurriculum}
        onClose={() => setShowCreateCurriculum(false)}
        title="Add New Curriculum Scheme"
        subtitle="e.g. C-20, C-23, or Autonomous 2026"
      >
        <form onSubmit={handleCreateCurriculum}>
          <div className="form-group">
            <label className="form-label">Curriculum Code</label>
            <input
              className="form-input"
              placeholder="e.g. C-23"
              value={newCurriculumCode}
              onChange={(e) => setNewCurriculumCode(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Full Name (Optional)</label>
            <input
              className="form-input"
              placeholder="e.g. Curriculum 2023 Regulations"
              value={newCurriculumName}
              onChange={(e) => setNewCurriculumName(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowCreateCurriculum(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Scheme
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Add Year ── */}
      <Modal
        isOpen={showCreateYear}
        onClose={() => setShowCreateYear(false)}
        title="Add Academic Year"
        subtitle={`Adding year under curriculum ${selectedScheme?.code}`}
      >
        <form onSubmit={handleCreateYear}>
          <div className="form-group">
            <label className="form-label">Academic Year</label>
            <SelectDropdown
              value={newYearValue}
              onChange={(val) => setNewYearValue(val)}
              placeholder="Select Year"
              minWidth="100%"
              options={[
                { value: '1', label: '1st Year' },
                { value: '2', label: '2nd Year' },
                { value: '3', label: '3rd Year' }
              ]}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowCreateYear(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!newYearValue}>
              Create Year
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Add Semester ── */}
      <Modal
        isOpen={showCreateSemester}
        onClose={() => setShowCreateSemester(false)}
        title="Add Academic Semester"
        subtitle={`Adding term for ${yearLabels[selectedYear?.year] || 'Year'}`}
      >
        <form onSubmit={handleCreateSemester}>
          <div className="form-group">
            <label className="form-label">Semester Term</label>
            <SelectDropdown
              value={newSemesterNumber}
              onChange={(val) => setNewSemesterNumber(val)}
              placeholder="Select Semester"
              minWidth="100%"
              options={
                selectedYear
                  ? [1, 2].map((offset) => {
                    const semNum = (selectedYear.year - 1) * 2 + offset;
                    return { value: String(semNum), label: `Semester ${semNum}` };
                  })
                  : []
              }
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowCreateSemester(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!newSemesterNumber}>
              Create Semester
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Step 1: Select Scheme ── */}
      {step === 'select_scheme' && (
        <div className="card fade-in" style={{ maxWidth: 840, padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                Select Curriculum Scheme
              </h2>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: 13 }}>
                Choose the regulation scheme for candidate roll ingestion
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateCurriculum(true)}>
              <Plus size={14} /> Add Scheme
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {curricula.map((s) => (
              <div
                key={s.id}
                className="session-card"
                onClick={() => handleSelectScheme(s)}
                style={{ textAlign: 'center', padding: '24px 16px' }}
              >
                <button
                  className="btn-ghost"
                  style={{ position: 'absolute', top: 8, right: 8, padding: 4, color: 'var(--error)' }}
                  onClick={(e) => handleDeleteCurriculum(e, s.id)}
                  title="Delete Curriculum"
                >
                  <Trash2 size={14} />
                </button>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>
                  {s.code}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  {s.name || 'Regulation'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: Select Year ── */}
      {step === 'select_year' && selectedScheme && (
        <div className="card fade-in" style={{ maxWidth: 840, padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setStep('select_scheme')}>
              <ArrowLeft size={14} /> Back
            </button>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                Select Academic Year
              </h2>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: 13 }}>
                Curriculum Scheme: <strong style={{ color: 'var(--primary)' }}>{selectedScheme.code}</strong>
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateYear(true)}>
              <Plus size={14} /> Add Year
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
            {years.map((y) => (
              <div
                key={y.id}
                className="session-card"
                onClick={() => handleSelectYear(y)}
                style={{ textAlign: 'center', padding: '22px 14px' }}
              >
                <button
                  className="btn-ghost"
                  style={{ position: 'absolute', top: 6, right: 6, padding: 4, color: 'var(--error)' }}
                  onClick={(e) => handleDeleteYear(e, y.id)}
                  title="Delete Year"
                >
                  <Trash2 size={14} />
                </button>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {yearLabels[y.year] || `Year ${y.year}`}
                </div>
              </div>
            ))}
            {years.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 36, color: 'var(--text-muted)', fontSize: 13 }}>
                No years configured yet. Click "Add Year" to initialize one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Step 3: Select Semester ── */}
      {step === 'select_semester' && selectedYear && (
        <div className="card fade-in" style={{ maxWidth: 840, padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setStep('select_year')}>
              <ArrowLeft size={14} /> Back
            </button>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                Select Semester Term
              </h2>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: 13 }}>
                {selectedScheme.code} &bull; {yearLabels[selectedYear.year] || `Year ${selectedYear.year}`}
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateSemester(true)}>
              <Plus size={14} /> Add Semester
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
            {semesters.map((sem) => {
              const isCompleted = completedSemesters.has(sem.id);
              return (
                <div
                  key={sem.id}
                  className="session-card"
                  onClick={() => handleSelectSemester(sem)}
                  style={{
                    textAlign: 'center',
                    padding: '24px 14px',
                    borderColor: isCompleted ? 'var(--success)' : 'var(--border-color)',
                    background: isCompleted ? 'var(--success-subtle)' : 'var(--bg-card)',
                  }}
                >
                  <button
                    className="btn-ghost"
                    style={{ position: 'absolute', top: 6, right: 6, padding: 4, color: 'var(--error)' }}
                    onClick={(e) => handleDeleteSemester(e, sem.id)}
                    title="Delete Semester"
                  >
                    <Trash2 size={14} />
                  </button>

                  {isCompleted && (
                    <div style={{ position: 'absolute', top: 8, left: 8, color: 'var(--success)' }}>
                      <CheckCircle2 size={16} />
                    </div>
                  )}

                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Semester {sem.number}
                  </div>
                  {isCompleted && (
                    <div style={{ fontSize: 11.5, color: 'var(--success)', marginTop: 4, fontWeight: 600 }}>
                      Ingested
                    </div>
                  )}
                </div>
              );
            })}
            {semesters.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 36, color: 'var(--text-muted)', fontSize: 13 }}>
                No semesters registered. Click "Add Semester" to create one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Step 4: Upload File ── */}
      {step === 'upload' && (
        <div className="card fade-in" style={{ maxWidth: 680, padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setStep('select_semester')}>
              <ArrowLeft size={14} /> Back
            </button>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                Upload Nominal Roll Workbook
              </h3>
              <p style={{ color: 'var(--text-muted)', margin: '3px 0 0', fontSize: 13 }}>
                {selectedScheme?.code} &bull; {yearLabels[selectedYear?.year] || `Year ${selectedYear?.year}`} &bull; Semester {selectedSemester?.number}
              </p>
            </div>
          </div>

          {/* Category Selection */}
          <div style={{ marginBottom: 20 }}>
            <label className="form-label">Candidate Category Mode</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { id: 'MIXED', label: 'Mixed / Auto-detect' },
                { id: 'REGULAR', label: 'Regular Only' },
                { id: 'SUPPLEMENTARY', label: 'Supplementary Only' },
              ].map((cat) => (
                <label
                  key={cat.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    padding: '8px 14px',
                    border: `1px solid ${selectedCategory === cat.id ? 'var(--primary)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-md)',
                    background: selectedCategory === cat.id ? 'var(--primary-subtle)' : 'var(--bg-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="category"
                    value={cat.id}
                    checked={selectedCategory === cat.id}
                    onChange={() => setSelectedCategory(cat.id)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {cat.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Dropzone */}
          <div
            className={`upload-zone ${dragOver ? 'dragover' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="upload-icon" />
            <div className="upload-text">
              {file ? file.name : 'Select or drag your Nominal Roll (.xlsx)'}
            </div>
            <div className="upload-hint">Excel spreadsheets up to 10MB supported</div>
            <input
              type="file"
              ref={fileRef}
              accept=".xlsx,.xls"
              hidden
              onChange={handleFileChange}
            />
          </div>

          {file && (
            <div
              style={{
                marginTop: 18,
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <FileSpreadsheet size={22} color="var(--primary)" />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={loading}
              >
                {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Upload size={14} />}
                <span>Validate & Parse</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step: Validating ── */}
      {step === 'validating' && (
        <div className="card" style={{ textAlign: 'center', padding: '54px 20px', maxWidth: 600, margin: '0 auto' }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: 36, height: 36 }} />
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            Validating Nominal Roll...
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Analyzing candidate PINs, departments, and course codes
          </p>
        </div>
      )}

      {/* ── Step: Results ── */}
      {step === 'results' && validationResult && (
        <div style={{ maxWidth: 900 }}>
          {/* Multiple sheets selector */}
          {availableSheets && availableSheets.length > 1 && (
            <div
              className="card fade-in"
              style={{
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>
                  Active Sheet:
                </span>{' '}
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Inspecting <strong style={{ color: 'var(--primary)' }}>{selectedSheet || validationResult.selected_sheet}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Switch Sheet:
                </label>
                <SelectDropdown
                  value={selectedSheet || validationResult.selected_sheet}
                  onChange={(val) => handleSheetChange(val)}
                  minWidth={240}
                  disabled={loading}
                  options={availableSheets.map((s) => ({
                    value: s.name,
                    label: s.name,
                    badge: s.pin_count > 0 ? `${s.pin_count} candidates` : `${s.rows} rows`
                  }))}
                />
              </div>
            </div>
          )}

          {/* Validation Metrics */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
            <StatCard
              title="Total Rows Read"
              value={validationResult.total_rows || 0}
              icon={FileSpreadsheet}
              variant="primary"
            />
            <StatCard
              title="Valid Candidate Rows"
              value={validationResult.valid_rows || 0}
              icon={CheckCircle}
              variant="success"
            />
            <StatCard
              title="Rows with Errors"
              value={validationResult.error_rows || 0}
              icon={AlertTriangle}
              variant={validationResult.error_rows > 0 ? 'error' : 'accent'}
            />
          </div>

          {/* Validation Warnings Banner */}
          {validationResult.warnings?.length > 0 && (
            <div
              className="card fade-in"
              style={{
                marginBottom: 20,
                padding: '14px 18px',
                background: 'var(--primary-subtle)',
                borderLeft: '4px solid var(--primary)',
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                {validationResult.warnings.map((w, idx) => (
                  <div key={idx} style={{ marginBottom: idx < validationResult.warnings.length - 1 ? 4 : 0 }}>
                    &bull; {w}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation Errors Table */}
          {validationResult.errors?.length > 0 && (
            <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} color="var(--error)" />
                <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>
                  Validation Issues ({validationResult.errors.length})
                </span>
              </div>
              <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>Row</th>
                      <th style={{ width: 140 }}>Error Type</th>
                      <th>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResult.errors.map((err, i) => (
                      <tr key={i}>
                        <td>{err.row}</td>
                        <td>
                          <StatusBadge status="error" text={err.type} />
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Controls */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleImport}
              disabled={loading || validationResult.valid_rows === 0}
            >
              {loading ? (
                <span className="spinner" style={{ width: 16, height: 16 }} />
              ) : (
                <CheckCircle size={18} />
              )}
              <span>Ingest {validationResult.valid_rows} Valid Candidates</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setStep('select_semester');
                setFile(null);
                setSelectedSemester(null);
              }}
            >
              Choose Different File
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Import Complete ── */}
      {importResult && (
        <div
          className="card fade-in"
          style={{
            borderLeft: '4px solid var(--success)',
            maxWidth: 680,
            padding: '24px',
            marginTop: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'var(--success-subtle)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                Candidates Ingested Successfully!
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: '4px 0 0' }}>
                <strong>{importResult.candidates_created}</strong> student records registered to this examination session.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/examination/${sessionId}`)}
            >
              Finish & Return to Session
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setImportResult(null);
                setValidationResult(null);
                setUploadResult(null);
                setFile(null);
                setSelectedSemester(null);
                setStep('select_semester');
              }}
            >
              Upload Another Semester
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
