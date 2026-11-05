import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { roomAPI, examAPI } from '../services/api';
import { DoorOpen, Plus, Eye, Trash2, ArrowRight, LayoutGrid, Calendar } from 'lucide-react';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import StatusBadge from '../components/common/StatusBadge';
import SelectDropdown from '../components/common/SelectDropdown';

export default function Rooms() {
  const { sessionId } = useParams();
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(sessionId || '');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoom, setNewRoom] = useState({
    room_number: '',
    name: '',
    capacity: 42,
    columns: 3,
    rows: 14,
  });
  const navigate = useNavigate();

  useEffect(() => {
    examAPI
      .getSessions()
      .then((res) => setSessions(res.data.results || res.data || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadRooms();
  }, [selectedSessionId]);

  const loadRooms = async () => {
    if (!selectedSessionId) {
      setRooms([]);
      setLoading(false);
      return;
    }
    try {
      const res = await roomAPI.list(selectedSessionId);
      setRooms(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await roomAPI.create(newRoom);
      setShowCreate(false);
      setNewRoom({ room_number: '', name: '', capacity: 42, columns: 3, rows: 14 });
      loadRooms();
    } catch (err) {
      console.error(err);
      alert('Failed to create examination room');
    }
  };

  const handleDelete = async (id, roomNumber) => {
    if (!window.confirm(`Are you sure you want to delete Room ${roomNumber}? This cannot be undone.`)) return;
    try {
      await roomAPI.delete(id);
      loadRooms();
    } catch (err) {
      console.error(err);
      alert('Failed to delete room. It may currently have allocated candidate seats.');
    }
  };

  return (
    <div className="fade-in">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Examination Rooms & Halls</h1>
          <p className="page-subtitle">Configure seating capacities, serpentine layouts, and hall charts</p>
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
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            <span>Add Room</span>
          </button>
        </div>
      </div>

      {/* ── Add Room Modal ── */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Configure New Examination Room"
        subtitle="Specify room dimensions and bench seating layout"
      >
        <form onSubmit={handleCreate}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Room Number</label>
              <input
                className="form-input"
                placeholder="e.g. 108"
                value={newRoom.room_number}
                onChange={(e) => setNewRoom({ ...newRoom, room_number: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Display Name (Optional)</label>
              <input
                className="form-input"
                placeholder="e.g. Seminar Hall 1"
                value={newRoom.name}
                onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Capacity (Seats)</label>
              <input
                className="form-input"
                type="number"
                value={newRoom.capacity}
                onChange={(e) => setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Columns (Benches per row)</label>
              <input
                className="form-input"
                type="number"
                value={newRoom.columns}
                onChange={(e) => setNewRoom({ ...newRoom, columns: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Rows (Benches depth)</label>
              <input
                className="form-input"
                type="number"
                value={newRoom.rows}
                onChange={(e) => setNewRoom({ ...newRoom, rows: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Room
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Room Cards Grid ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading hall configurations...</span>
        </div>
      ) : !selectedSessionId ? (
        <EmptyState
          icon={DoorOpen}
          title="Select an Examination Session"
          description="Choose an examination term above to view its allocated halls and capacity utilization."
          action={
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>
              Go to Dashboard
            </button>
          }
        />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No Examination Rooms Registered"
          description="Click 'Add Room' above to create standard 3×14 examination halls."
          action={
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Add First Room
            </button>
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 18 }}>
          {rooms.map((room) => {
            const chartUrl = selectedSessionId
              ? `/examination/${selectedSessionId}/rooms/${room.id}/chart`
              : `/rooms/${room.id}/chart`;
            const fillRate = room.capacity > 0 ? Math.min(100, Math.round(((room.allocated_count || 0) / room.capacity) * 100)) : 0;

            return (
              <div
                key={room.id}
                className="card"
                style={{ cursor: 'pointer', position: 'relative' }}
                onClick={() => navigate(chartUrl)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                      Room {room.room_number}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {room.name || 'Standard Exam Hall'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span
                      style={{
                        padding: 6,
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="View Seating Chart"
                    >
                      <Eye size={17} />
                    </span>
                    <button
                      className="btn-ghost"
                      style={{ padding: 6, color: 'var(--error)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(room.id, room.room_number);
                      }}
                      title="Delete Room"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 10,
                    padding: '10px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Capacity
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {room.capacity}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Layout
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {room.columns}&times;{room.rows}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Allocated
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>
                      {room.allocated_count || 0}
                    </div>
                  </div>
                </div>

                {/* Capacity Progress Meter */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 5 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Occupancy</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fillRate}%</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--border-subtle)', borderRadius: 9999, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: 9999,
                        width: `${fillRate}%`,
                        background: 'var(--primary)',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
