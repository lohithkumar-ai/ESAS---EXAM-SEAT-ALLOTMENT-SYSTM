import { useState, useEffect } from 'react';
import { dashboardAPI, examAPI } from '../services/api';
import {
  Users, UserCheck, UserX, BookOpen, Building2,
  DoorOpen, CheckCircle, Clock
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    examAPI.getSessions().then(res => {
      const fetchedSessions = res.data.results || res.data || [];
      setSessions(fetchedSessions);
      if (fetchedSessions.length > 0) {
        setSelectedSessionId(fetchedSessions[0].id);
      } else {
        loadStats('');
      }
    }).catch(err => {
      console.error(err);
      loadStats('');
    });
  }, []);

  useEffect(() => {
    if (selectedSessionId) loadStats(selectedSessionId);
  }, [selectedSessionId]);

  const loadStats = async (sessionId) => {
    setLoading(true);
    try {
      const res = await dashboardAPI.getStats(sessionId);
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 100 }}>
        <div className="spinner" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Students', value: stats?.total_students || 0, icon: Users, color: 'primary' },
    { label: 'Regular Students', value: stats?.regular_students || 0, icon: UserCheck, color: 'success' },
    { label: 'Supplementary', value: stats?.supplementary_students || 0, icon: UserX, color: 'warning' },
    { label: 'Total Subjects', value: stats?.total_subjects || 0, icon: BookOpen, color: 'accent' },
    { label: 'Total Branches', value: stats?.total_branches || 0, icon: Building2, color: 'primary' },
    { label: 'Total Rooms', value: stats?.total_rooms || 0, icon: DoorOpen, color: 'accent' },
    { label: 'Allocated Seats', value: stats?.allocated_seats || 0, icon: CheckCircle, color: 'success' },
    { label: 'Remaining', value: stats?.remaining_seats || 0, icon: Clock, color: 'error' },
  ];

  const branchData = (stats?.branch_distribution || []).map(b => ({
    name: b.branch__code,
    students: b.count,
  }));

  const categoryData = (stats?.category_distribution || []).map(c => ({
    name: c.category,
    value: c.count,
  }));

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Smart Exam Seat Allotment Overview</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select className="form-select" value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)}>
            <option value="">Select Session...</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.name || `Session ${s.id}`}</option>)}
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((card, i) => (
          <div key={card.label} className={`card fade-in fade-in-delay-${(i % 4) + 1}`}>
            <div className="card-header">
              <div>
                <div className="card-title">{card.label}</div>
                <div className="card-value">{card.value.toLocaleString()}</div>
              </div>
              <div className={`card-icon ${card.color}`}>
                <card.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Branch Distribution */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            Branch Distribution
          </h3>
          {branchData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={branchData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: '#141432',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="students" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                No data yet. Upload a Nominal Roll to see statistics.
              </p>
            </div>
          )}
        </div>

        {/* Category Distribution */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            Regular vs Supplementary
          </h3>
          {categoryData.some(c => c.value > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#141432',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                No data yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
