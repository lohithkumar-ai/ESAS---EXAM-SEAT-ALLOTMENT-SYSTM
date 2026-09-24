import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { examAPI } from '../services/api';
import { Calendar, Plus, ChevronRight, Trash2, ArrowLeft } from 'lucide-react';

export default function ExamSelect() {
  const [softwares, setSoftwares] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSession, setNewSession] = useState({ name: '', code: '' });
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const softwareId = searchParams.get('software') || '';

  useEffect(() => { 
    loadSoftwares();
  }, []);

  useEffect(() => {
    if (softwareId) {
      loadSessions(softwareId);
    }
  }, [softwareId]);

  const loadSoftwares = async () => {
    setLoading(true);
    try {
      const res = await examAPI.getSoftware();
      setSoftwares(res.data.results || res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadSessions = async (sId) => {
    setLoading(true);
    try {
      const res = await examAPI.getSessions(sId);
      setSessions(res.data.results || res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await examAPI.createSession({ ...newSession, software: softwareId });
      setShowCreate(false);
      setNewSession({ name: '', code: '' });
      loadSessions(softwareId);
    } catch (err) { 
      alert(err.response?.data?.error || 'Failed to create session');
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

  const statusColors = {
    DRAFT: 'badge-primary',
    NR_UPLOADED: 'badge-accent',
    VALIDATED: 'badge-warning',
    ALLOCATION_GENERATED: 'badge-success',
    LOCKED: 'badge-error',
  };

  if (!softwareId) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Examination Software</h1>
            <p className="page-subtitle">Select an examination software mode to view sessions</p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
            {softwares.map((sw, index) => (
              <div key={sw.id} className="session-card" onClick={() => navigate(`/examination?software=${sw.id}`)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 'var(--radius-md)',
                    background: index % 2 === 0 ? 'linear-gradient(135deg, #6366f1, #818cf8)' : 'linear-gradient(135deg, #06b6d4, #22d3ee)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Calendar size={24} color="white" />
                  </div>
                  <div>
                    <div className="session-card-title">{sw.name}</div>
                    <div className="session-card-sub">Manage sessions for this software</div>
                  </div>
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
          <button className="btn-ghost" onClick={() => navigate('/examination')} style={{ padding: '0 0 8px 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', fontSize: 13 }}>
            <ArrowLeft size={14} style={{ marginRight: 4 }} /> Back to Software Selection
          </button>
          <h1 className="page-title">{activeSoftware?.name || 'Examination Sessions'}</h1>
          <p className="page-subtitle">Select or create an examination session for this software</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          <Plus size={16} /> New Session
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card fade-in" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            Create New Examination Session
          </h3>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 16, alignItems: 'end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Session Name</label>
              <input className="form-input" placeholder="e.g., March-April 2027"
                value={newSession.name}
                onChange={e => setNewSession({ ...newSession, name: e.target.value })}
                required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Session Code</label>
              <input className="form-input" placeholder="e.g., MAR27"
                value={newSession.code}
                onChange={e => setNewSession({ ...newSession, code: e.target.value })}
                required />
            </div>
            <button type="submit" className="btn btn-success">Create</button>
          </form>
        </div>
      )}

      {/* Sessions list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : sessions.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-title">No Sessions Yet</div>
          <div className="empty-state-text">Create your first examination session to get started.</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Session</th>
                <th>Code</th>
                <th>Status</th>
                <th>Candidates</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/examination/${s.id}`)}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>{s.code}</td>
                  <td><span className={`badge ${statusColors[s.status] || 'badge-primary'}`}>{s.status_display}</span></td>
                  <td>{s.candidate_count || 0}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
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
