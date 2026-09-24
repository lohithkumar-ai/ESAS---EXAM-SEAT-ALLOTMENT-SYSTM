import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examAPI, allotmentAPI } from '../services/api';
import {
  Upload, Play, RefreshCw, Lock, Unlock, Download,
  CheckCircle, AlertCircle, Users, BookOpen, Trash2
} from 'lucide-react';

export default function ExamSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const [showBranchModal, setShowBranchModal] = useState(false);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);

  useEffect(() => { loadSession(); }, [sessionId]);

  const loadSession = async () => {
    try {
      const res = await examAPI.getSession(sessionId);
      setSession(res.data);
      // Fetch available branches from dashboard stats
      const { dashboardAPI } = await import('../services/api');
      const statsRes = await dashboardAPI.getStats(sessionId);
      const rawBranches = statsRes.data.branch_distribution || [];
      const bogus = ['SNO', 'SINO', 'UNNAMED', 'SLNO', 'SERIAL', 'NAN'];
      const validBranches = rawBranches.filter(b => !bogus.includes(b.branch__code?.toUpperCase()));
      setAvailableBranches(validBranches);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openBranchModal = () => {
    // Select all available branches by default so all candidates get allocated
    setSelectedBranches(availableBranches.map(b => b.branch__code));
    setShowBranchModal(true);
  };

  const toggleBranch = (code) => {
    if (selectedBranches.includes(code)) {
      setSelectedBranches(selectedBranches.filter(b => b !== code));
    } else {
      setSelectedBranches([...selectedBranches, code]);
    }
  };

  const handleSelectAllBranches = () => {
    if (selectedBranches.length === availableBranches.length) {
      setSelectedBranches([]);
    } else {
      setSelectedBranches(availableBranches.map(b => b.branch__code));
    }
  };

  const handleGenerate = async () => {
    if (selectedBranches.length === 0) {
      alert('Please select at least 1 branch.');
      return;
    }
    
    setShowBranchModal(false);
    setGenerating(true);
    try {
      // Pass selected branches to API
      const res = await allotmentAPI.generate(sessionId, null, selectedBranches);
      setResult(res.data);
      loadSession();
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.message || err.response?.data?.error || 'Generation failed' });
    } finally { setGenerating(false); }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to delete the current seat allocation? This cannot be undone.')) return;
    try {
      await allotmentAPI.reset(sessionId);
      setResult({ success: true, message: 'Allocation has been reset.' });
      loadSession();
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.error || 'Reset failed' });
    }
  };

  const handleLock = async () => {
    try {
      await examAPI.lockSession(sessionId);
      loadSession();
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 100 }}><div className="spinner" /></div>;
  }

  if (!session) {
    return <div className="card empty-state"><div className="empty-state-title">Session not found</div></div>;
  }

  const statusColors = {
    DRAFT: 'badge-primary', NR_UPLOADED: 'badge-accent',
    VALIDATED: 'badge-warning', ALLOCATION_GENERATED: 'badge-success',
    LOCKED: 'badge-error', REVIEWED: 'badge-success',
  };

  return (
    <div className="fade-in">
      {/* Branch Selection Modal */}
      {showBranchModal && (
        <div className="modal-backdrop">
          <div className="modal card" style={{ width: 440 }}>
            <h2 className="modal-title">Select Branches for Pattern</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              Select branches to include in the zig-zag seating pattern. By default, all branches are selected so all candidates receive room and seat allocations.
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {selectedBranches.length} of {availableBranches.length} branches selected
              </span>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '4px 10px', fontSize: 12 }}
                onClick={handleSelectAllBranches}
              >
                {selectedBranches.length === availableBranches.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, maxHeight: 300, overflowY: 'auto' }}>
              {availableBranches.length === 0 && (
                <div style={{ color: 'var(--text-muted)' }}>No candidates uploaded yet.</div>
              )}
              {availableBranches.map((b) => (
                <label key={b.branch__code} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedBranches.includes(b.branch__code)}
                    onChange={() => toggleBranch(b.branch__code)}
                  />
                  <div style={{ flex: 1, fontWeight: 600 }}>{b.branch__code}</div>
                  <div className="badge badge-primary">{b.count} candidates</div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowBranchModal(false)}>Cancel</button>
              <button className="btn btn-success" onClick={handleGenerate} disabled={selectedBranches.length === 0}>
                Start Allocation ({selectedBranches.length} Branches)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">{session.name}</h1>
          <p className="page-subtitle">{session.software_name} - {session.code}</p>
        </div>
        <span className={`badge ${statusColors[session.status] || 'badge-primary'}`} style={{ fontSize: 13, padding: '6px 16px' }}>
          {session.status_display}
        </span>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => navigate(`/upload/${sessionId}`)}>
          <Upload size={16} /> Upload NR
        </button>
        <button className="btn btn-success" onClick={openBranchModal} disabled={generating}>
          {generating ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Play size={16} />}
          {generating ? 'Generating...' : 'Generate Allotment'}
        </button>
        <button className="btn btn-secondary" onClick={openBranchModal} disabled={generating}>
          <RefreshCw size={16} /> Regenerate
        </button>
        {['ALLOCATION_GENERATED', 'REVIEWED'].includes(session.status) && (
          <button className="btn btn-danger" onClick={handleReset} style={{ background: 'transparent', border: '1px solid var(--error)', color: 'var(--error)' }}>
            <Trash2 size={16} /> Reset
          </button>
        )}
        {session.status === 'ALLOCATION_GENERATED' && (
          <button className="btn btn-danger" onClick={handleLock}>
            <Lock size={16} /> Lock Allocation
          </button>
        )}
        {session.status === 'LOCKED' && (
          <button className="btn btn-secondary" onClick={async () => { await examAPI.unlockSession(sessionId); loadSession(); }}>
            <Unlock size={16} /> Unlock
          </button>
        )}
        <button className="btn btn-secondary" onClick={() => navigate(`/examination/${sessionId}/rooms`)}>
          <BookOpen size={16} /> View Rooms
        </button>
        <button className="btn btn-secondary" onClick={() => navigate(`/examination/${sessionId}/reports`)}>
          <Download size={16} /> Reports
        </button>
      </div>

      {/* Generation result */}
      {result && (
        <div className={`card fade-in`} style={{
          marginBottom: 24,
          borderLeft: `3px solid ${result.success ? 'var(--success)' : 'var(--error)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            {result.success
              ? <CheckCircle size={20} color="var(--success)" />
              : <AlertCircle size={20} color="var(--error)" />
            }
            <span style={{ fontWeight: 700, fontSize: 15 }}>
              {result.success ? 'Allocation Successful' : 'Allocation Failed'}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>
            {result.message}
          </p>
          {result.success && (
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rooms Used</span>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{result.rooms_used}</div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Allocated</span>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--success)' }}>{result.candidates_allocated}</div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Regular</span>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{result.regular_count || 0}</div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Supply</span>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--warning)' }}>{result.supply_count || 0}</div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Unallocated</span>
                <div style={{ fontSize: 22, fontWeight: 800, color: result.candidates_unallocated > 0 ? 'var(--error)' : 'var(--text-muted)' }}>
                  {result.candidates_unallocated}
                </div>
              </div>
              {result.substitutions?.length > 0 && (
                <div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Substitutions</span>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--warning)' }}>{result.substitutions.length}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick info cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="card">
          <div className="card-title">Software</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{session.software_name}</div>
        </div>
        <div className="card">
          <div className="card-title">Session Code</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{session.code}</div>
        </div>
        <div className="card">
          <div className="card-title">Candidates</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{session.candidate_count || 0}</div>
        </div>
        <div className="card">
          <div className="card-title">Status</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{session.status_display}</div>
        </div>
      </div>
    </div>
  );
}
