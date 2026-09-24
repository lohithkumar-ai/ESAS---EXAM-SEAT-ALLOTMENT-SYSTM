import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportAPI, examAPI } from '../services/api';
import { FileText, Download, Table2, BarChart3, BookOpen, Building2 } from 'lucide-react';

export default function Reports() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(sessionId || '');
  const [activeTab, setActiveTab] = useState('room-summary');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    examAPI.getSessions().then(res => setSessions(res.data.results || res.data || [])).catch(console.error);
  }, []);

  useEffect(() => { loadReport(); }, [activeTab, selectedSessionId]);

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
        case 'room-summary': res = await reportAPI.roomSummary(selectedSessionId); break;
        case 'subject-wise': res = await reportAPI.subjectWise(selectedSessionId); break;
        default: res = await reportAPI.roomSummary(selectedSessionId);
      }
      setData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
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
    } catch (err) { alert('Export failed. Generate an allocation first.'); }
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
    } catch (err) { alert('Export failed. Generate an allocation first.'); }
  };

  const tabs = [
    { id: 'room-summary', label: 'Room Summary', icon: Building2 },
    { id: 'subject-wise', label: 'Subject-wise', icon: BookOpen },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">View and export examination reports</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select className="form-select" value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)}>
            <option value="">Select Session...</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn btn-success" onClick={handleExportExcel} disabled={!selectedSessionId}>
            <Download size={16} /> Export Excel
          </button>
          <button className="btn btn-primary" onClick={handleExportPDF} disabled={!selectedSessionId}>
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(tab => (
          <button key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}>
            <tab.icon size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : !selectedSessionId ? (
        <div className="card empty-state">
          <FileText className="empty-state-icon" />
          <div className="empty-state-title">No Session Selected</div>
          <div className="empty-state-text">Please select an examination session to view its reports.</div>
          <button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginTop: 16, display: 'inline-flex' }}>Go to Dashboard</button>
        </div>
      ) : !data ? (
        <div className="card empty-state">
          <FileText className="empty-state-icon" />
          <div className="empty-state-title">No Data Available</div>
          <div className="empty-state-text">Generate a seat allocation first to view reports.</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {activeTab === 'room-summary' && data.rooms && (
            <table className="data-table">
              <thead><tr><th>Room</th><th>Capacity</th><th>Allocated</th><th>Empty</th><th>Utilization</th></tr></thead>
              <tbody>
                {data.rooms.map(r => (
                  <tr key={r.room_number}>
                    <td style={{ fontWeight: 700 }}>Room {r.room_number}</td>
                    <td>{r.capacity}</td>
                    <td style={{ color: 'var(--success)' }}>{r.allocated}</td>
                    <td style={{ color: r.empty > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>{r.empty}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--bg-input)', borderRadius: 3, maxWidth: 120 }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${(r.allocated / r.capacity) * 100}%`,
                            background: 'linear-gradient(90deg, var(--primary), var(--accent))',
                          }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{Math.round((r.allocated / r.capacity) * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}



          {activeTab === 'subject-wise' && data.subjects && (
            <table className="data-table">
              <thead><tr><th>Subject Code</th><th>Subject Name</th><th>Students</th><th>Common</th></tr></thead>
              <tbody>
                {data.subjects.map(s => (
                  <tr key={s.subject_code}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.subject_code}</td>
                    <td>{s.subject_name}</td>
                    <td>{s.students}</td>
                    <td>{s.is_common ? <span className="badge badge-warning">Common</span> : '-'}</td>
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
