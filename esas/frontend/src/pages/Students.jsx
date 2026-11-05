import { useState, useEffect } from 'react';
import { studentAPI, examAPI } from '../services/api';
import { Users, Filter, Calendar, BookOpen, Layers } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import SelectDropdown from '../components/common/SelectDropdown';

export default function Students() {
  const [candidates, setCandidates] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ session_id: '', category: '', branch: '', year: '' });

  useEffect(() => {
    examAPI
      .getSessions()
      .then((res) => {
        const fetchedSessions = res.data.results || res.data || [];
        setSessions(fetchedSessions);
        if (fetchedSessions.length > 0) {
          setFilters((f) => ({ ...f, session_id: fetchedSessions[0].id }));
        }
      })
      .catch(console.error);

    examAPI
      .getBranches()
      .then((res) => {
        setBranches(res.data.results || res.data || []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [filters]);

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Candidate Registry</h1>
          <p className="page-subtitle">Inspect registered students, enrollment categories, and seat assignments</p>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
            <Filter size={15} />
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Filter By:</span>
          </div>

          <SelectDropdown
            value={filters.session_id}
            onChange={(val) => setFilters({ ...filters, session_id: val?.target?.value ?? val })}
            options={sessions.map((s) => ({
              value: s.id,
              label: s.name || s.session_name || `Session ${s.id}`,
            }))}
            placeholder="All Exam Sessions"
            icon={Calendar}
            minWidth={190}
          />

          <SelectDropdown
            value={filters.category}
            onChange={(val) => setFilters({ ...filters, category: val?.target?.value ?? val })}
            options={[
              { value: '', label: 'All Categories' },
              { value: 'REGULAR', label: 'Regular' },
              { value: 'SUPPLEMENTARY', label: 'Supplementary' },
            ]}
            placeholder="All Categories"
            minWidth={150}
          />

          <SelectDropdown
            value={filters.branch}
            onChange={(val) => setFilters({ ...filters, branch: val?.target?.value ?? val })}
            options={[
              { value: '', label: 'All Departments' },
              ...branches.map((b) => ({
                value: b.code,
                label: `${b.code} - ${b.name}`,
              })),
            ]}
            placeholder="All Departments"
            minWidth={160}
          />

          <SelectDropdown
            value={filters.year}
            onChange={(val) => setFilters({ ...filters, year: val?.target?.value ?? val })}
            options={[
              { value: '', label: 'All Years' },
              { value: '1', label: '1st Year' },
              { value: '2', label: '2nd Year' },
              { value: '3', label: '3rd Year' },
            ]}
            placeholder="All Years"
            minWidth={130}
          />

          <div style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>
            {candidates.length} candidates listed
          </div>
        </div>
      </div>

      {/* ── Candidates Table ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 56 }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Filtering candidate records...</span>
        </div>
      ) : candidates.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Candidates Found"
          description="Upload a Nominal Roll spreadsheet in the Examination section to view students here."
        />
      ) : (
        <div className="table-container">
          <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student PIN</th>
                  <th>Candidate Name</th>
                  <th>Department</th>
                  <th>Year</th>
                  <th>Subject Title</th>
                  <th>Category</th>
                  <th>Assigned Room</th>
                  <th>Seat Number</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                        {c.pin}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {c.student_name}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-primary">{c.branch_code}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {c.year_display || '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-secondary)', maxWidth: 220 }}>
                      {c.subject_name || '—'}
                    </td>
                    <td>
                      <StatusBadge
                        status={c.category === 'REGULAR' ? 'regular' : 'supply'}
                        text={c.category_display || c.category}
                      />
                    </td>
                    <td>
                      {c.room_number ? (
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          Room {c.room_number}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Unallocated</span>
                      )}
                    </td>
                    <td>
                      {c.seat_number ? (
                        <span className="badge badge-success" style={{ fontWeight: 700 }}>
                          S{c.seat_number}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>
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
