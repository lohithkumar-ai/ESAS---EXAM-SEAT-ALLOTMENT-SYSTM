import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examAPI, nrAPI } from '../services/api';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, ArrowRight, ArrowLeft, Plus, Trash2 } from 'lucide-react';

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
    } catch (err) { console.error(err); }
  };

  const loadCurricula = async () => {
    try {
      const res = await examAPI.getCurricula();
      setCurricula(res.data.results || res.data || []);
    } catch (err) { console.error(err); }
  };

  const loadYears = async (curriculumId) => {
    try {
      const res = await examAPI.getYears(curriculumId);
      setYears(res.data.results || res.data || []);
    } catch (err) { console.error(err); }
  };

  const loadSemesters = async (yearId) => {
    try {
      const res = await examAPI.getSemesters(yearId);
      setSemesters(res.data.results || res.data || []);
    } catch (err) { console.error(err); }
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
    } catch (err) { alert('Failed to delete'); }
  };

  const handleDeleteYear = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this year?')) return;
    try {
      await examAPI.deleteYear(id);
      loadYears(selectedScheme.id);
    } catch (err) { alert('Failed to delete'); }
  };

  const handleDeleteSemester = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this semester?')) return;
    try {
      await examAPI.deleteSemester(id);
      loadSemesters(selectedYear.id);
    } catch (err) { alert('Failed to delete'); }
  };

  const handleCreateCurriculum = async () => {
    if (!newCurriculumCode.trim()) return;
    try {
      await examAPI.createCurriculum({ code: newCurriculumCode, name: newCurriculumName || newCurriculumCode });
      setShowCreateCurriculum(false);
      setNewCurriculumCode('');
      setNewCurriculumName('');
      loadCurricula();
    } catch (err) { alert(err.response?.data?.code?.[0] || 'Failed to create'); }
  };

  const handleCreateYear = async () => {
    if (!newYearValue || !selectedScheme) return;
    try {
      await examAPI.createYear({ curriculum: selectedScheme.id, year: parseInt(newYearValue) });
      setShowCreateYear(false);
      setNewYearValue('');
      loadYears(selectedScheme.id);
    } catch (err) { alert(err.response?.data?.non_field_errors?.[0] || err.response?.data?.year?.[0] || 'Failed to create'); }
  };

  const handleCreateSemester = async () => {
    if (!newSemesterNumber || !selectedYear) return;
    try {
      await examAPI.createSemester({ academic_year: selectedYear.id, number: parseInt(newSemesterNumber) });
      setShowCreateSemester(false);
      setNewSemesterNumber('');
      loadSemesters(selectedYear.id);
    } catch (err) { alert(err.response?.data?.non_field_errors?.[0] || err.response?.data?.number?.[0] || 'Failed to create'); }
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
    } finally { setLoading(false); }
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
      loadConfigs(); // Reload configs to show green completion
    } catch (err) {
      alert(err.response?.data?.error || 'Import failed');
      setStep('results');
    } finally { setLoading(false); }
  };

  const yearLabels = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year' };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <button className="btn-ghost" onClick={() => navigate(`/examination/${sessionId}`)} style={{ padding: '0 0 8px 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', fontSize: 13 }}>
            <ArrowLeft size={14} style={{ marginRight: 4 }} /> Back to Session
          </button>
          <h1 className="page-title">Upload Nominal Roll</h1>
          <p className="page-subtitle">Upload the NR Excel file for this examination session</p>
        </div>
      </div>

      {/* Step 1: Select Curriculum */}
      {step === 'select_scheme' && (
        <div className="card fade-in" style={{ maxWidth: 800, padding: '40px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Select Curriculum</h2>
              <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: 14 }}>Choose the curriculum scheme for the NR upload</p>
            </div>
            <button className="btn btn-secondary" onClick={() => setShowCreateCurriculum(true)} style={{ fontSize: 13 }}>
              <Plus size={14} /> Add New
            </button>
          </div>

          {showCreateCurriculum && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <input className="form-input" placeholder="Code (e.g. C-23)" value={newCurriculumCode} onChange={e => setNewCurriculumCode(e.target.value)} style={{ flex: 1 }} />
              <input className="form-input" placeholder="Name (optional)" value={newCurriculumName} onChange={e => setNewCurriculumName(e.target.value)} style={{ flex: 2 }} />
              <button className="btn btn-success" onClick={handleCreateCurriculum}>Create</button>
              <button className="btn btn-secondary" onClick={() => setShowCreateCurriculum(false)}>Cancel</button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            {curricula.map(s => (
              <div key={s.id} className="session-card"
                   style={{ padding: '24px 16px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease', background: 'var(--surface-50)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', position: 'relative' }}
                   onClick={() => handleSelectScheme(s)}
                   onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                   onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'none'; }}>
                <button className="btn-ghost" style={{ position: 'absolute', top: 8, right: 8, padding: 4, color: 'var(--error)' }} onClick={(e) => handleDeleteCurriculum(e, s.id)}><Trash2 size={14}/></button>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{s.code}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{s.name || 'Curriculum'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Select Year */}
      {step === 'select_year' && selectedScheme && (
        <div className="card fade-in" style={{ maxWidth: 800, padding: '40px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button className="btn-ghost" onClick={() => setStep('select_scheme')} style={{ padding: '8px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={16} style={{ marginRight: 6 }} /> Back
            </button>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Select Academic Year</h2>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: 14 }}>Curriculum: <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{selectedScheme.code}</span></p>
            </div>
            <button className="btn btn-secondary" onClick={() => setShowCreateYear(true)} style={{ fontSize: 13 }}>
              <Plus size={14} /> Add Year
            </button>
          </div>

          {showCreateYear && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <select className="form-select" value={newYearValue} onChange={e => setNewYearValue(e.target.value)} style={{ flex: 1 }}>
                <option value="">Select Year</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
              </select>
              <button className="btn btn-success" onClick={handleCreateYear}>Create</button>
              <button className="btn btn-secondary" onClick={() => setShowCreateYear(false)}>Cancel</button>
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
            {years.map(y => (
              <div key={y.id} className="session-card"
                   style={{ padding: '20px 12px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease', background: 'var(--surface-50)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', position: 'relative' }}
                   onClick={() => handleSelectYear(y)}
                   onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                   onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-50)'; e.currentTarget.style.color = 'initial'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}>
                <button className="btn-ghost" style={{ position: 'absolute', top: 4, right: 4, padding: 4, color: 'var(--error)' }} onClick={(e) => handleDeleteYear(e, y.id)}><Trash2 size={14}/></button>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{yearLabels[y.year] || `Year ${y.year}`}</div>
              </div>
            ))}
            {years.length === 0 && !showCreateYear && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                No years yet. Click "Add Year" to create one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Select Semester */}
      {step === 'select_semester' && selectedYear && (
        <div className="card fade-in" style={{ maxWidth: 800, padding: '40px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button className="btn-ghost" onClick={() => setStep('select_year')} style={{ padding: '8px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={16} style={{ marginRight: 6 }} /> Back
            </button>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Select Semester</h2>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: 14 }}>
                {selectedScheme.code} → {yearLabels[selectedYear.year] || `Year ${selectedYear.year}`}
              </p>
            </div>
            <button className="btn btn-secondary" onClick={() => setShowCreateSemester(true)} style={{ fontSize: 13 }}>
              <Plus size={14} /> Add Semester
            </button>
          </div>

          {showCreateSemester && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <select className="form-select" value={newSemesterNumber} onChange={e => setNewSemesterNumber(e.target.value)} style={{ flex: 1 }}>
                <option value="">Select Semester</option>
                {selectedYear && [1, 2].map(offset => {
                  const semNum = (selectedYear.year - 1) * 2 + offset;
                  return <option key={semNum} value={semNum}>Semester {semNum}</option>;
                })}
              </select>
              <button className="btn btn-success" onClick={handleCreateSemester}>Create</button>
              <button className="btn btn-secondary" onClick={() => setShowCreateSemester(false)}>Cancel</button>
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
            {semesters.map(sem => {
              const isCompleted = completedSemesters.has(sem.id);
              return (
                <div key={sem.id} className="session-card"
                     style={{ 
                       padding: '20px 12px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease', 
                       background: isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface-50)', 
                       border: `1px solid ${isCompleted ? 'var(--success)' : 'var(--border-subtle)'}`, 
                       borderRadius: 'var(--radius-lg)', position: 'relative' 
                     }}
                     onClick={() => handleSelectSemester(sem)}
                     onMouseEnter={(e) => { e.currentTarget.style.background = isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'var(--primary)'; e.currentTarget.style.color = isCompleted ? 'initial' : 'white'; e.currentTarget.style.borderColor = isCompleted ? 'var(--success)' : 'var(--primary)'; }}
                     onMouseLeave={(e) => { e.currentTarget.style.background = isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface-50)'; e.currentTarget.style.color = 'initial'; e.currentTarget.style.borderColor = isCompleted ? 'var(--success)' : 'var(--border-subtle)'; }}>
                  
                  <button className="btn-ghost" style={{ position: 'absolute', top: 4, right: 4, padding: 4, color: 'var(--error)' }} onClick={(e) => handleDeleteSemester(e, sem.id)}><Trash2 size={14}/></button>
                  
                  {isCompleted && (
                    <div style={{ position: 'absolute', top: 8, left: 8, color: 'var(--success)' }}>
                      <CheckCircle size={16} />
                    </div>
                  )}

                  <div style={{ fontSize: 18, fontWeight: 700 }}>Semester {sem.number}</div>
                  {isCompleted && <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 4, fontWeight: 600 }}>Completed</div>}
                </div>
              );
            })}
            {semesters.length === 0 && !showCreateSemester && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                No semesters yet. Click "Add Semester" to create one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Upload */}
      {step === 'upload' && (
        <div className="card fade-in" style={{ maxWidth: 640 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button className="btn-ghost" onClick={() => setStep('select_semester')} style={{ padding: '8px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={16} style={{ marginRight: 6 }} /> Back
            </button>
            <div>
               <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Upload Excel File</h3>
               <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: 14 }}>
                 {selectedScheme?.code} → {yearLabels[selectedYear?.year] || `Year ${selectedYear?.year}`} → Semester {selectedSemester?.number}
               </p>
            </div>
          </div>
          
          {/* Category Selection */}
          <div style={{ marginBottom: 24 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Upload Category Type:</label>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              {['MIXED', 'REGULAR', 'SUPPLEMENTARY'].map(cat => (
                <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '8px 16px', border: `1px solid ${selectedCategory === cat ? 'var(--primary)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-md)', background: selectedCategory === cat ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface-50)' }}>
                  <input type="radio" name="category" value={cat} checked={selectedCategory === cat} onChange={() => setSelectedCategory(cat)} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{cat === 'MIXED' ? 'Mixed / Unknown' : cat === 'REGULAR' ? 'Regular Only' : 'Supply Only'}</span>
                </label>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>* Choose the category for this Nominal Roll (used if file doesn't specify it).</p>
          </div>

          <div
            className={`upload-zone ${dragOver ? 'dragover' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="upload-icon" />
            <div className="upload-text">
              {file ? file.name : 'Drop your Excel file here or click to browse'}
            </div>
            <div className="upload-hint">Supports .xlsx format (max 10MB)</div>
            <input type="file" ref={fileRef} accept=".xlsx,.xls" hidden onChange={handleFileChange} />
          </div>

          {file && (
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <FileSpreadsheet size={20} color="var(--success)" />
              <span style={{ flex: 1, fontSize: 14 }}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
              <button className="btn btn-primary" onClick={handleUpload} disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <><Upload size={16} /> Upload & Validate</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step: Validating */}
      {step === 'validating' && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ margin: '0 auto 20px', width: 40, height: 40 }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>Validating Nominal Roll...</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Detecting columns and checking data</div>
        </div>
      )}

      {/* Step: Results */}
      {step === 'results' && validationResult && (
        <div>
          {/* Multiple sheets selector */}
          {availableSheets && availableSheets.length > 1 && (
            <div className="card fade-in" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'var(--surface-50)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Excel Sheet: </span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Workbook has multiple sheets. Currently inspecting <strong style={{ color: 'var(--primary)' }}>{selectedSheet || validationResult.selected_sheet}</strong>.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Switch Sheet:</label>
                <select
                  className="form-select"
                  style={{ width: 260, fontWeight: 600 }}
                  value={selectedSheet || validationResult.selected_sheet}
                  onChange={e => handleSheetChange(e.target.value)}
                  disabled={loading}
                >
                  {availableSheets.map(s => (
                    <option key={s.name} value={s.name}>
                      {s.name} ({s.pin_count > 0 ? `${s.pin_count} candidates` : `${s.rows} rows`}) {s.is_active ? '★ Active' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Warnings banner */}
          {validationResult.warnings?.length > 0 && (
            <div className="card fade-in" style={{ marginBottom: 16, padding: '12px 18px', background: 'rgba(99, 102, 241, 0.08)', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {validationResult.warnings.map((w, idx) => (
                  <div key={idx}>ℹ {w}</div>
                ))}
              </div>
            </div>
          )}

          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
            <div className="card">
              <div className="card-title">Total Rows</div>
              <div className="card-value">{validationResult.total_rows}</div>
            </div>
            <div className="card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <div className="card-title" style={{ color: 'var(--success)' }}>Valid Rows</div>
              <div className="card-value" style={{ color: 'var(--success)' }}>{validationResult.valid_rows}</div>
            </div>
            <div className="card" style={{ borderColor: validationResult.error_rows > 0 ? 'rgba(239, 68, 68, 0.3)' : undefined }}>
              <div className="card-title" style={{ color: validationResult.error_rows > 0 ? 'var(--error)' : undefined }}>Errors</div>
              <div className="card-value" style={{ color: validationResult.error_rows > 0 ? 'var(--error)' : undefined }}>
                {validationResult.error_rows}
              </div>
            </div>
          </div>

          {validationResult.errors?.length > 0 && (
            <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  <AlertTriangle size={16} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--warning)' }} />
                  Validation Errors
                </span>
              </div>
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                <table className="data-table">
                  <thead><tr><th>Row</th><th>Type</th><th>Message</th></tr></thead>
                  <tbody>
                    {validationResult.errors.map((err, i) => (
                      <tr key={i}>
                        <td>{err.row}</td>
                        <td><span className="badge badge-error">{err.type}</span></td>
                        <td>{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-success btn-lg" onClick={handleImport} disabled={loading || validationResult.valid_rows === 0}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <CheckCircle size={18} />}
              Import {validationResult.valid_rows} Valid Records
            </button>
            <button className="btn btn-secondary" onClick={() => { setStep('select_semester'); setFile(null); setSelectedSemester(null); }}>
              Upload Different File
            </button>
          </div>
        </div>
      )}

      {/* Step: Import complete */}
      {importResult && (
        <div className="card fade-in" style={{ borderLeft: '3px solid var(--success)', marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle size={24} color="var(--success)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Import Successful!</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 2 }}>
                {importResult.candidates_created} candidates imported.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn btn-success"
              onClick={() => navigate(`/examination/${sessionId}`)}>
              <CheckCircle size={16} /> Completed (Finish & Go to Session)
            </button>
            <button className="btn btn-secondary"
              onClick={() => { 
                setImportResult(null); 
                setValidationResult(null); 
                setUploadResult(null); 
                setFile(null); 
                setSelectedSemester(null);
                setStep('select_semester');
              }}>
              <Upload size={16} /> Upload Another Semester
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
