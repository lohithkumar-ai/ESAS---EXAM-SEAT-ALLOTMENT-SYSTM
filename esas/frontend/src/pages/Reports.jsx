import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportAPI, examAPI } from '../services/api';
import { FileText, Download, BookOpen, Building2, FileSpreadsheet, Calendar } from 'lucide-react';
import EmptyState from '../components/common/EmptyState';
import StatusBadge from '../components/common/StatusBadge';
import SelectDropdown from '../components/common/SelectDropdown';

export default function Reports() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(sessionId || '');
  const [activeTab, setActiveTab] = useState('room-summary');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    examAPI
      .getSessions()
      .then((res) => setSessions(res.data.results || res.data || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadReport();
  }, [activeTab, selectedSessionId]);

  const loadReport = async () => {
    if (!selectedSessionId) {
      setData(null);
      return;
    }
    setLoading(true);
    setData(null);
    try {
      let res;
      switch (activeTab) {
        case 'room-summary':
          res = await reportAPI.roomSummary(selectedSessionId);
          break;
        case 'subject-wise':
          res = await reportAPI.subjectWise(selectedSessionId);
          break;
        default:
          res = await reportAPI.roomSummary(selectedSessionId);
      }
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const res = await reportAPI.exportExcel(selectedSessionId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'ESAS_Allotment.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Export failed. Generate an allocation first.');
    }
  };

  const handleExportPDF = async () => {
    try {
      const res = await reportAPI.exportPDF(selectedSessionId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'ESAS_Allotment.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Export failed. Generate an allocation first.');
    }
  };

  const tabs = [
    { id: 'room-summary', label: 'Room Summary', icon: Building2 },
    { id: 'subject-wise', label: 'Subject-wise Allocation', icon: BookOpen },
  ];

  return (
    <div className="fade-in">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Examination Reports & Allotment Lists</h1>
          <p className="page-subtitle">Generate exportable PDF seating charts and Excel registers</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <SelectDropdown
            value={selectedSessionId}
            onChange={(val) => setSelectedSessionId(val?.target?.value ?? val)}
            options={sessions.map((s) => ({
              value: s.id,
              label: s.name ? `${s.name} (${s.code || 'Cycle'})` : `Session ${s.id}`,
              subtext: s.software_name || 'Autonomous Examination Cell',
              badge: s.status === 'ALLOCATION_GENERATED' ? 'Generated' : (s.status_display || s.status || 'Draft'),
            }))}
            placeholder="Select Exam Session..."
            icon={Calendar}
            minWidth={240}
            align="right"
          />
          <button
            className="btn btn-secondary"
            onClick={handleExportExcel}
            disabled={!selectedSessionId}
          >
            <FileSpreadsheet size={15} />
            <span>Export Excel</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExportPDF}
            disabled={!selectedSessionId}
          >
            <Download size={15} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 56 }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Generating report data...</span>
        </div>
      ) : !selectedSessionId ? (
        <EmptyState
          icon={FileText}
          title="Select an Examination Session"
          description="Choose an examination term above to view its comprehensive room summaries and subject rosters."
          action={
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>
              Go to Dashboard
            </button>
          }
        />
      ) : !data ? (
        <EmptyState
          icon={FileText}
          title="No Report Data Available"
          description="Ensure you have generated seat allocations for this session before viewing reports."
        />
      ) : (
        <div className="table-container">
          {activeTab === 'room-summary' && data.rooms && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hall Identifier</th>
                  <th>Capacity</th>
                  <th>Allocated Candidates</th>
                  <th>Buffer Seats</th>
                  <th>Capacity Utilization</th>
                </tr>
              </thead>
              <tbody>
                {data.rooms.map((r) => {
                  const utilPercent = r.capacity > 0 ? Math.round((r.allocated / r.capacity) * 100) : 0;
                  return (
                    <tr key={r.room_number}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          Room {r.room_number}
                        </div>
                      </td>
                      <td>{r.capacity}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                          {r.allocated}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: r.empty > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                          {r.empty}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 200 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--border-subtle)', borderRadius: 9999, overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                borderRadius: 9999,
                                width: `${utilPercent}%`,
                                background: 'var(--primary)',
                                transition: 'width 0.4s ease',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, minWidth: 36 }}>
                            {utilPercent}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeTab === 'subject-wise' && data.subjects && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course Code</th>
                  <th>Subject Title</th>
                  <th>Candidate Count</th>
                  <th>Course Type</th>
                </tr>
              </thead>
              <tbody>
                {data.subjects.map((s) => (
                  <tr key={s.subject_code}>
                    <td>
                      <span className="badge badge-neutral" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {s.subject_code}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {s.subject_name}
                    </td>
                    <td>
                      <span style={{ fontWeight: 700 }}>{s.students}</span>
                    </td>
                    <td>
                      {s.is_common ? (
                        <StatusBadge status="warning" text="Common Paper" />
                      ) : (
                        <StatusBadge status="draft" text="Departmental" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
