import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI, examAPI } from '../services/api';
import {
  Users, UserCheck, UserX, DoorOpen, CheckCircle,
  Clock, ArrowUpRight, Calendar, Sparkles, Building2,
  BookOpen, ChevronRight, CheckCircle2, AlertCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend
} from 'recharts';
import StatCard from '../components/common/StatCard';
import DashboardCard from '../components/common/DashboardCard';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import SelectDropdown from '../components/common/SelectDropdown';

const CHART_COLORS = ['#398B72', '#75A991', '#E7A66F', '#2A7F9D', '#D9822B', '#5F727D'];

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

  const currentSession = sessions.find(s => String(s.id) === String(selectedSessionId)) || sessions[0];

  const totalStudents = stats?.total_students || 0;
  const allocatedSeats = stats?.allocated_seats || 0;
  const remainingSeats = stats?.remaining_seats || 0;
  const totalRooms = stats?.total_rooms || 0;
  const regularStudents = stats?.regular_students || 0;
  const supplementaryStudents = stats?.supplementary_students || 0;

  const allocationProgress = totalStudents > 0
    ? Math.min(100, Math.round((allocatedSeats / totalStudents) * 100))
    : 0;

  const roomCapacity = totalRooms * 42;
  const roomUtilization = roomCapacity > 0
    ? Math.min(100, Math.round((allocatedSeats / roomCapacity) * 100))
    : 0;

  const branchData = (stats?.branch_distribution || []).map(b => ({
    name: b.branch__code || 'Branch',
    students: b.count || 0,
  }));

  const categoryData = (stats?.category_distribution || []).map(c => ({
    name: c.category === 'REGULAR' ? 'Regular' : (c.category === 'SUPPLEMENTARY' ? 'Supply' : c.category),
    value: c.count || 0,
  }));

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
        <div className="spinner" style={{ marginBottom: 12 }} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading examination analytics...</span>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* ── Hero Welcome Section ── */}
      <div className="hero-banner">
        <div className="hero-welcome">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Academic Operations
            </span>
          </div>
          <h1>Welcome to ESAS Dashboard</h1>
          <p>
            Autonomous seat allotment engine active. Overview of current examination cycle and candidate distributions.
          </p>
          <div className="hero-chips">
            <span className="hero-chip">
              <Calendar size={13} color="var(--primary)" />
              {currentSession?.name || 'No Active Session Selected'}
            </span>
            <span className="hero-chip">
              <Building2 size={13} color="var(--accent)" />
              {currentSession?.software_name || 'Autonomous Examination Cell'}
            </span>
            <StatusBadge
              status={allocatedSeats > 0 ? 'allocated' : 'draft'}
              text={allocatedSeats > 0 ? 'Allotment Generated' : 'Pending Allotment'}
            />
          </div>
        </div>

        <div className="hero-actions">
          {/* Custom Session Switcher Dropdown */}
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
            minWidth={250}
            align="right"
          />

          {/* Direct Session Action */}
          {selectedSessionId && (
            <Link
              to={`/examination/${selectedSessionId}`}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span>Manage Session</span>
              <ArrowUpRight size={15} />
            </Link>
          )}
        </div>
      </div>

      {/* ── Primary KPI Cards ── */}
      <div className="stats-grid">
        <StatCard
          title="Total Registered Students"
          value={totalStudents.toLocaleString()}
          icon={Users}
          variant="primary"
          trend={`${totalStudents > 0 ? '100%' : '0%'} enrolled`}
          subtext="across registered departments"
        />
        <StatCard
          title="Allocated Students"
          value={allocatedSeats.toLocaleString()}
          icon={UserCheck}
          variant="success"
          trend={`${allocationProgress}%`}
          subtext="assigned to exam halls"
        />
        <StatCard
          title="Unallocated / Buffer"
          value={remainingSeats.toLocaleString()}
          icon={Clock}
          variant="warning"
          trend={`${totalStudents > 0 ? Math.round((remainingSeats / totalStudents) * 100) : 0}%`}
          subtext="remaining candidates"
        />
        <StatCard
          title="Active Examination Rooms"
          value={totalRooms.toLocaleString()}
          icon={DoorOpen}
          variant="accent"
          trend={`${roomUtilization}% utilization`}
          subtext={`${roomCapacity} total bench seats`}
        />
      </div>

      {/* ── Secondary Utilization Metric Strip ── */}
      <div
        className="card"
        style={{
          marginBottom: 24,
          padding: '18px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 20,
          alignItems: 'center',
        }}
      >
        {/* Metric 1: Allocation Completion */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Allocation Progress
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)' }}>
              {allocatedSeats} / {totalStudents} ({allocationProgress}%)
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--border-subtle)', borderRadius: 9999, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${allocationProgress}%`,
                background: 'var(--primary)',
                borderRadius: 9999,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Metric 2: Room Utilization */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Exam Hall Capacity Utilization
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)' }}>
              {roomUtilization}% of {roomCapacity} seats
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--border-subtle)', borderRadius: 9999, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${roomUtilization}%`,
                background: 'var(--accent)',
                borderRadius: 9999,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Metric 3: Candidate Split */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', borderLeft: '1px solid var(--border-color)', paddingLeft: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Regular
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {regularStudents}
            </div>
          </div>
          <div style={{ height: 24, width: 1, background: 'var(--border-color)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Supplementary
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--warning)' }}>
              {supplementaryStudents}
            </div>
          </div>
        </div>
      </div>

      {/* ── Analytics Visualizations ── */}
      <div className="charts-grid">
        {/* Branch Distribution Bar Chart */}
        <DashboardCard
          title="Branch-wise Candidate Distribution"
          subtitle="Total candidate enrollment by engineering department"
        >
          {branchData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={branchData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'var(--primary-subtle)' }}
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    boxShadow: 'var(--shadow-md)',
                    color: 'var(--text-primary)',
                    fontSize: 12.5,
                  }}
                />
                <Bar dataKey="students" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={Users}
              title="No Departmental Roll Found"
              description="Upload a Nominal Roll spreadsheet in the Examination section to view branch distributions."
            />
          )}
        </DashboardCard>

        {/* Regular vs Supplementary Split */}
        <DashboardCard
          title="Enrollment Category Breakdown"
          subtitle="Ratio of Regular versus Supplementary candidates"
        >
          {categoryData.some(c => c.value > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    boxShadow: 'var(--shadow-md)',
                    color: 'var(--text-primary)',
                    fontSize: 12.5,
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  formatter={(value) => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="No Category Records"
              description="Enrollment categories will appear automatically once students are imported."
            />
          )}
        </DashboardCard>
      </div>

      {/* ── Active Sessions Summary Table ── */}
      <DashboardCard
        title="Examination Cycles & Allotment Status"
        subtitle="Current academic sessions and their seat allocation progress"
        action={
          <Link to="/examination" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>View All</span>
            <ChevronRight size={14} />
          </Link>
        }
      >
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Session Title</th>
                <th>Software Code</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {session.name || `Session ${session.id}`}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        Created on {session.created_at ? new Date(session.created_at).toLocaleDateString() : 'Active Term'}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">
                        {session.code || 'SEMESTER'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge
                        status={session.is_locked ? 'locked' : (session.id === currentSession?.id && allocatedSeats > 0 ? 'allocated' : 'active')}
                        text={session.is_locked ? 'Locked' : (session.id === currentSession?.id && allocatedSeats > 0 ? 'Allotment Ready' : 'Active')}
                      />
                    </td>
                    <td>
                      <Link
                        to={`/examination/${session.id}`}
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--primary)', fontWeight: 600 }}
                      >
                        Manage Allotment →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    No examination sessions created yet. Navigate to Examination to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}
