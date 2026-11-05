import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { examAPI } from '../services/api';
import {
  Calendar, Plus, ChevronRight, Trash2, ArrowLeft,
  BookOpen, Users, Clock, ShieldCheck
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';

export default function ExamSelect() {
  const [softwares, setSoftwares] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSession, setNewSession] = useState({ name: '', code: '' });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const softwareId = searchParams.get('software') || '';

  useEffect(() => {
    loadSoftwares();
  }, []);

  useEffect(() => {
    if (softwareId) {
      loadSessions(softwareId);
    }
  }, [softwareId]);

  const DEFAULT_SOFTWARES = [
    { id: 1, name: 'March / April Examination' },
    { id: 2, name: 'October / November Examination' }
  ];

  const loadSoftwares = async () => {
    setLoading(true);
    try {
      const res = await examAPI.getSoftware();
      const list = res.data?.results || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        setSoftwares(list);
      } else {
        setSoftwares(DEFAULT_SOFTWARES);
      }
    } catch (err) {
      console.error('Failed to load softwares from API:', err);
      setSoftwares(DEFAULT_SOFTWARES);
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async (sId) => {
    setLoading(true);
    try {
      const res = await examAPI.getSessions(sId);
      setSessions(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await examAPI.createSession({ ...newSession, software: softwareId });
      setShowCreate(false);
      setNewSession({ name: '', code: '' });
      loadSessions(softwareId);
    } catch (err) {
      const data = err.response?.data;
      let msg = 'Failed to create session';
      if (typeof data === 'string') {
        msg = data;
      } else if (data?.error) {
        msg = data.error;
      } else if (data?.detail) {
        msg = data.detail;
      } else if (data && typeof data === 'object') {
        msg = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join('\n');
      }
      alert(msg);
    }
  };

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this session? All associated candidates and allocations will be removed.')) return;
    try {
      await examAPI.deleteSession(id);
      loadSessions(softwareId);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete session');
    }
  };

  if (!softwareId) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Examination Software</h1>
            <p className="page-subtitle">Select examination software cycle to view active sessions</p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading examination programs...</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {softwares.map((sw) => (
              <div
                key={sw.id}
                className="session-card"
                onClick={() => navigate(`/examination?software=${sw.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--primary-subtle)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Calendar size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="session-card-title">{sw.name}</div>
                    <div className="session-card-sub">
                      Autonomous Exam Allotment Engine
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--text-muted)" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const activeSoftware = softwares.find(s => s.id.toString() === softwareId);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <button
            onClick={() => navigate('/examination')}
            className="btn btn-secondary btn-sm"
            style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={14} />
            <span>Back to Software Selection</span>
          </button>
          <h1 className="page-title">{activeSoftware?.name || 'Examination Sessions'}</h1>
          <p className="page-subtitle">Manage examination terms, sessions, candidate rosters and seat allotment</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          <span>New Session</span>
        </button>
      </div>

      {/* New Session Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Examination Session"
        subtitle={`Session under ${activeSoftware?.name || 'Examination Software'}`}
      >
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Session Name</label>
            <input
              className="form-input"
              placeholder="e.g., MARCH 2027 5TH SEM"
              value={newSession.name}
              onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Session Code</label>
            <input
              className="form-input"
              placeholder="e.g., MAR27"
              value={newSession.code}
              onChange={(e) => setNewSession({ ...newSession, code: e.target.value })}
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Session
            </button>
          </div>
        </form>
      </Modal>

      {/* Sessions list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading sessions...</span>
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Sessions Configured"
          description="Create your first examination session to start uploading Nominal Rolls and generating seat allocations."
          action={
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Create First Session
            </button>
          }
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Session Details</th>
                <th>Code</th>
                <th>Status</th>
                <th>Candidate Count</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr
                  key={s.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/examination/${s.id}`)}
                >
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      Session ID: #{s.id}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{s.code}</span>
                  </td>
                  <td>
                    <StatusBadge
                      status={s.status || (s.candidate_count > 0 ? 'allocated' : 'draft')}
                      text={s.status_display || s.status}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                      <Users size={14} color="var(--text-muted)" />
                      <span>{s.candidate_count || 0} students</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        onClick={(e) => handleDeleteSession(e, s.id)}
                        className="btn-ghost"
                        style={{ padding: 6, color: 'var(--error)' }}
                        title="Delete Session"
                      >
                        <Trash2 size={16} />
                      </button>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
