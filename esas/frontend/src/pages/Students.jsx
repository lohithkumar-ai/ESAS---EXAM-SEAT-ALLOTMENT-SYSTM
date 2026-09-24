import { useState, useEffect } from 'react';
import { studentAPI, examAPI } from '../services/api';
import { Users, Filter } from 'lucide-react';

export default function Students() {
  const [candidates, setCandidates] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ session_id: '', category: '', branch: '', year: '' });

  useEffect(() => {
    examAPI.getSessions().then(res => {
      const fetchedSessions = res.data.results || res.data || [];
      setSessions(fetchedSessions);
      if (fetchedSessions.length > 0) {
        setFilters(f => ({ ...f, session_id: fetchedSessions[0].id }));
      }
    }).catch(console.error);

    examAPI.getBranches().then(res => {
      setBranches(res.data.results || res.data || []);
    }).catch(console.error);
  }, []);

  useEffect(() => { loadCandidates(); }, [filters]);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.session_id) params.session_id = filters.session_id;
      if (filters.category) params.category = filters.category;
      if (filters.branch) params.branch = filters.branch;
      if (filters.year) params.year = filters.year;
      const res = await studentAPI.getCandidates(params);
      setCandidates(res.data.results || res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">View and manage examination candidates</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={16} color="var(--text-muted)" />
          <select className="form-select" style={{ width: 160 }}
            value={filters.session_id} onChange={e => setFilters({ ...filters, session_id: e.target.value })}>
            <option value="">All Sessions</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.name || s.session_name || `Session ${s.id}`}</option>
            ))}
          </select>
          <select className="form-select" style={{ width: 160 }}
            value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}>
            <option value="">All Categories</option>
            <option value="REGULAR">Regular</option>
            <option value="SUPPLEMENTARY">Supplementary</option>
          </select>
          <select className="form-select" style={{ width: 140 }}
            value={filters.branch} onChange={e => setFilters({ ...filters, branch: e.target.value })}>
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b.id || b.code} value={b.code}>{b.code} - {b.name}</option>
            ))}
          </select>
          <select className="form-select" style={{ width: 130 }}
            value={filters.year} onChange={e => setFilters({ ...filters, year: e.target.value })}>
            <option value="">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
          </select>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {candidates.length} candidates
          </span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : candidates.length === 0 ? (
        <div className="card empty-state">
          <Users className="empty-state-icon" />
          <div className="empty-state-title">No Students Found</div>
          <div className="empty-state-text">Upload a Nominal Roll to see candidates here.</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>PIN</th>
                  <th>Name</th>
                  <th>Branch</th>
                  <th>Year</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Room</th>
                  <th>Seat</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{c.pin}</td>
                    <td>{c.student_name}</td>
                    <td><span className="badge badge-primary">{c.branch_code}</span></td>
                    <td>{c.year_display}</td>
                    <td style={{ fontSize: 12 }}>{c.subject_name}</td>
                    <td>
                      <span className={`badge ${c.category === 'REGULAR' ? 'badge-success' : 'badge-warning'}`}>
                        {c.category_display}
                      </span>
                    </td>
                    <td>{c.room_number || '-'}</td>
                    <td>{c.seat_number || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
