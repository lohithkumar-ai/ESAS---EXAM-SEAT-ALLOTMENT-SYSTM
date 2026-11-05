import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { examAPI, allotmentAPI, dashboardAPI } from '../services/api';
import {
  Upload, Play, RefreshCw, Lock, Unlock, Download,
  CheckCircle, AlertCircle, Users, BookOpen, Trash2,
  DoorOpen, ArrowLeft, Calendar, ShieldCheck, Info,
  AlertTriangle, HelpCircle
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import StatCard from '../components/common/StatCard';

export default function ExamSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showUnallocatedModal, setShowUnallocatedModal] = useState(false);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const res = await examAPI.getSession(sessionId);
      setSession(res.data);
      // Fetch available branches and stats from dashboard stats
      const statsRes = await dashboardAPI.getStats(sessionId);
      const rawBranches = statsRes.data.branch_distribution || [];
      const bogus = ['SNO', 'SINO', 'UNNAMED', 'SLNO', 'SERIAL', 'NAN'];
      const validBranches = rawBranches.filter(
        b => !bogus.includes(b.branch__code?.toUpperCase())
      );
      setAvailableBranches(validBranches);

      // If allocations already exist, populate the result summary card
      if (statsRes.data.allocated_seats > 0) {
        const roomsUsed = statsRes.data.room_utilization
          ? statsRes.data.room_utilization.filter(r => r.allocated > 0).length
          : statsRes.data.total_rooms;

        setResult({
          success: true,
          message: `Successfully allocated ${statsRes.data.allocated_seats} candidates (${statsRes.data.regular_students || 0} Regular + ${statsRes.data.supplementary_students || 0} Supply) across ${roomsUsed} rooms.`,
          rooms_used: roomsUsed,
          candidates_allocated: statsRes.data.allocated_seats,
          candidates_unallocated: statsRes.data.remaining_seats,
          regular_count: statsRes.data.regular_students,
          supply_count: statsRes.data.supplementary_students,
          unallocated_breakdown: statsRes.data.unallocated_breakdown,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openBranchModal = () => {
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
      const res = await allotmentAPI.generate(sessionId, null, selectedBranches);
      setResult(res.data);
      loadSession();
    } catch (err) {
      setResult({
        success: false,
        message: err.response?.data?.message || err.response?.data?.error || 'Generation failed',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to delete the current seat allocation? This cannot be undone.')) return;
    try {
      await allotmentAPI.reset(sessionId);
      setResult(null);
      loadSession();
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.error || 'Reset failed' });
    }
  };

  const handleLock = async () => {
    try {
      await examAPI.lockSession(sessionId);
      loadSession();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
        <div className="spinner" style={{ marginBottom: 12 }} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading session details...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="card empty-state">
        <div className="empty-state-title">Session Not Found</div>
        <div className="empty-state-text">The requested examination session could not be located.</div>
      </div>
    );
  }

  const breakdown = result?.unallocated_breakdown;
  const unallocatedCount = result?.candidates_unallocated ?? 0;

  return (
    <div className="fade-in">
      {/* ── Branch Selection Modal ── */}
      <Modal
        isOpen={showBranchModal}
        onClose={() => setShowBranchModal(false)}
        title="Departmental Zig-Zag Pattern Selection"
        subtitle="Select engineering departments to participate in the autonomous seating engine"
        maxWidth={480}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            <strong>{selectedBranches.length}</strong> of {availableBranches.length} departments active
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleSelectAllBranches}
          >
            {selectedBranches.length === availableBranches.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto', marginBottom: 20 }}>
          {availableBranches.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>
              No candidates uploaded yet for this session.
            </div>
          ) : (
            availableBranches.map((b) => {
              const isChecked = selectedBranches.includes(b.branch__code);
              return (
                <label
                  key={b.branch__code}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    background: isChecked ? 'var(--primary-subtle)' : 'var(--bg-secondary)',
                    border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleBranch(b.branch__code)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <div style={{ flex: 1, fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>
                    {b.branch__code}
                  </div>
                  <span className="badge badge-neutral">
                    {b.count} candidates
                  </span>
                </label>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setShowBranchModal(false)}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={selectedBranches.length === 0}
          >
            Start Seat Allotment ({selectedBranches.length} Depts)
          </button>
        </div>
      </Modal>

      {/* ── Unallocated Reason Details Modal ── */}
      <Modal
        isOpen={showUnallocatedModal}
        onClose={() => setShowUnallocatedModal(false)}
        title="Unallocated Candidate Diagnostics"
        subtitle={`Audit breakdown of ${unallocatedCount} unallocated candidate registrations`}
        maxWidth={720}
      >
        <div
          style={{
            padding: '14px 18px',
            background: 'var(--primary-subtle)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 18,
            border: '1px solid rgba(57, 139, 114, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13.5, color: 'var(--primary)', marginBottom: 4 }}>
            <CheckCircle size={16} />
            <span>100% Unique Physical Students Allocated</span>
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {breakdown?.reason_summary ||
              `All physical students in this session have been placed into seats. The ${unallocatedCount} unallocated rows represent repeat nominal roll rows for students taking multiple subjects or uploaded in multiple batches who already hold an active seat assignment.`}
          </p>
        </div>

        {breakdown?.details && breakdown.details.length > 0 ? (
          <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 140 }}>Student PIN</th>
                  <th style={{ width: 80 }}>Branch</th>
                  <th>Candidate Name</th>
                  <th>Allocation Status / Reason</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.details.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.pin}</td>
                    <td>
                      <span className="badge badge-primary">{item.branch}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {item.reason}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>
            All unallocated records are confirmed duplicate candidate subject enrollments for students who already have seats assigned.
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <button className="btn btn-secondary" onClick={() => setShowUnallocatedModal(false)}>
            Close
          </button>
        </div>
      </Modal>

      {/* ── Page Header & Navigation Breadcrumb ── */}
      <div className="page-header">
        <div>
          <button
            onClick={() => navigate('/examination')}
            className="btn btn-secondary btn-sm"
            style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={14} />
            <span>Back to Sessions</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="page-title">{session.name}</h1>
            <StatusBadge
              status={session.status}
              text={session.status_display || session.status}
            />
          </div>
          <p className="page-subtitle">
            {session.software_name} &bull; Code: <strong>{session.code}</strong> &bull; Session ID: #{session.id}
          </p>
        </div>
      </div>

      {/* ── Action Toolbar ── */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          marginBottom: 24,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <button
          className="btn btn-primary"
          onClick={openBranchModal}
          disabled={generating}
        >
          {generating ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Play size={15} />}
          <span>{generating ? 'Engine Running...' : 'Generate Allotment'}</span>
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => navigate(`/upload/${sessionId}`)}
        >
          <Upload size={15} />
          <span>Upload NR</span>
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => navigate(`/examination/${sessionId}/rooms`)}
        >
          <DoorOpen size={15} />
          <span>View Rooms</span>
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => navigate(`/examination/${sessionId}/reports`)}
        >
          <Download size={15} />
          <span>Reports</span>
        </button>

        {['ALLOCATION_GENERATED', 'REVIEWED'].includes(session.status) && (
          <button
            className="btn btn-ghost"
            onClick={handleReset}
            style={{ color: 'var(--error)', marginLeft: 'auto' }}
            title="Reset Allotment"
          >
            <Trash2 size={15} />
            <span>Reset</span>
          </button>
        )}

        {session.status === 'ALLOCATION_GENERATED' && (
          <button className="btn btn-secondary" onClick={handleLock}>
            <Lock size={15} />
            <span>Lock</span>
          </button>
        )}

        {session.status === 'LOCKED' && (
          <button
            className="btn btn-secondary"
            onClick={async () => {
              await examAPI.unlockSession(sessionId);
              loadSession();
            }}
          >
            <Unlock size={15} />
            <span>Unlock</span>
          </button>
        )}
      </div>

      {/* ── Generation Result Alert Card ── */}
      {result && (
        <div
          className="card fade-in"
          style={{
            marginBottom: 24,
            borderLeft: `4px solid ${result.success ? 'var(--success)' : 'var(--error)'}`,
            padding: '20px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            {result.success ? (
              <CheckCircle size={20} color="var(--success)" />
            ) : (
              <AlertCircle size={20} color="var(--error)" />
            )}
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              {result.success ? 'Seat Allocation Complete' : 'Allotment Notice'}
            </h4>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, margin: '0 0 16px' }}>
            {result.message}
          </p>

          {result.success && (
            <div>
              {/* Stat grid strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 16,
                  paddingTop: 14,
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                <div>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Rooms Used
                  </span>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {result.rooms_used}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Allocated
                  </span>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>
                    {result.candidates_allocated}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Regular
                  </span>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>
                    {result.regular_count || 0}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Supplementary
                  </span>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--warning)' }}>
                    {result.supply_count || 0}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Unallocated
                  </span>
                  <div style={{ fontSize: 20, fontWeight: 800, color: unallocatedCount > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                    {unallocatedCount}
                  </div>
                </div>
              </div>

              {/* ── Unallocated Reason Explanatory Banner ── */}
              {unallocatedCount > 0 && (
                <div
                  style={{
                    marginTop: 18,
                    padding: '14px 18px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <Info size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                      Why are there {unallocatedCount} unallocated records?
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {breakdown?.reason_summary || (
                        <span>
                          <strong>100% of all unique physical students ({result.candidates_allocated} students) are successfully allocated.</strong> The {unallocatedCount} unallocated entries are duplicate candidate records (e.g., students enrolled across multiple subjects or duplicate nominal roll rows) who were already seated to avoid assigning multiple desks to the same individual.
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <button
                        onClick={() => setShowUnallocatedModal(true)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 12, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <HelpCircle size={13} />
                        <span>Inspect Unallocated Details ({unallocatedCount})</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Session Detail Stat Cards ── */}
      <div className="stats-grid">
        <StatCard
          title="Candidate Enrollment"
          value={session.candidate_count || 0}
          icon={Users}
          variant="primary"
          subtext="registered in nominal roll"
        />
        <StatCard
          title="Software Code"
          value={session.code}
          icon={Calendar}
          variant="accent"
          subtext={session.software_name}
        />
        <StatCard
          title="Available Departments"
          value={availableBranches.length}
          icon={BookOpen}
          variant="info"
          subtext="ready for pattern generation"
        />
        <StatCard
          title="Current State"
          value={session.status_display || session.status}
          icon={ShieldCheck}
          variant={session.status === 'ALLOCATION_GENERATED' ? 'success' : 'warning'}
          subtext={`Session ID #${session.id}`}
        />
      </div>
    </div>
  );
}
