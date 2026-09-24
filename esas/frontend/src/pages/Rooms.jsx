import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { roomAPI, examAPI } from '../services/api';
import { DoorOpen, Plus, Eye, Trash2 } from 'lucide-react';

export default function Rooms() {
  const { sessionId } = useParams();
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(sessionId || '');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoom, setNewRoom] = useState({ room_number: '', name: '', capacity: 42, columns: 3, rows: 14 });
  const navigate = useNavigate();

  useEffect(() => {
    examAPI.getSessions().then(res => setSessions(res.data.results || res.data || [])).catch(console.error);
  }, []);

  useEffect(() => { loadRooms(); }, [selectedSessionId]);

  const loadRooms = async () => {
    if (!selectedSessionId) {
      setRooms([]);
      setLoading(false);
      return;
    }
    try {
      const res = await roomAPI.list(selectedSessionId);
      setRooms(res.data.results || res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await roomAPI.create(newRoom);
      setShowCreate(false);
      setNewRoom({ room_number: '', name: '', capacity: 42, columns: 6, rows: 7 });
      loadRooms();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    try {
      await roomAPI.delete(id);
      loadRooms();
    } catch (err) {
      console.error(err);
      alert('Failed to delete room. It might have allocated seats.');
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Rooms</h1>
          <p className="page-subtitle">Configure examination rooms and view seating charts</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select className="form-select" value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)}>
            <option value="">Select Session...</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
            <Plus size={16} /> Add Room
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="card fade-in" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Add New Room</h3>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', gap: 14, alignItems: 'end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Room Number</label>
              <input className="form-input" placeholder="e.g., 107" value={newRoom.room_number}
                onChange={e => setNewRoom({ ...newRoom, room_number: e.target.value })} required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Name</label>
              <input className="form-input" placeholder="Room 107" value={newRoom.name}
                onChange={e => setNewRoom({ ...newRoom, name: e.target.value })} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Capacity</label>
              <input className="form-input" type="number" value={newRoom.capacity}
                onChange={e => setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) })} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Columns</label>
              <input className="form-input" type="number" value={newRoom.columns}
                onChange={e => setNewRoom({ ...newRoom, columns: parseInt(e.target.value) })} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Rows</label>
              <input className="form-input" type="number" value={newRoom.rows}
                onChange={e => setNewRoom({ ...newRoom, rows: parseInt(e.target.value) })} />
            </div>
            <button type="submit" className="btn btn-success">Add</button>
          </form>
        </div>
      )}

        {/* Rooms list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : !selectedSessionId ? (
        <div className="card empty-state">
          <DoorOpen className="empty-state-icon" />
          <div className="empty-state-title">No Session Selected</div>
          <div className="empty-state-text">Please select an examination session to view its allocated rooms.</div>
          <button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginTop: 16, display: 'inline-flex' }}>Go to Dashboard</button>
        </div>
      ) : rooms.length === 0 ? (
        <div className="card empty-state">
          <DoorOpen className="empty-state-icon" />
          <div className="empty-state-title">No Rooms Configured</div>
          <div className="empty-state-text">Add examination rooms to get started.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {rooms.map(room => (
            <div key={room.id} className="card" style={{ cursor: 'pointer' }}
              onClick={() => navigate(selectedSessionId ? `/examination/${selectedSessionId}/rooms/${room.id}/chart` : `/rooms/${room.id}/chart`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>Room {room.room_number}</div>
                  {room.name && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{room.name}</div>}
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Eye size={18} color="var(--text-muted)" />
                  <button 
                    className="btn" 
                    style={{ padding: 4, background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Are you sure you want to delete Room ${room.room_number}?`)) {
                        handleDelete(room.id);
                      }
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Capacity</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{room.capacity}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Layout</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{room.columns}x{room.rows}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Allocated</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)' }}>{room.allocated_count || 0}</div>
                </div>
              </div>
              {/* Mini capacity bar */}
              <div style={{
                marginTop: 14, height: 4, background: 'var(--bg-input)',
                borderRadius: 2, overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${Math.min(100, ((room.allocated_count || 0) / room.capacity) * 100)}%`,
                  background: 'linear-gradient(90deg, var(--primary), var(--accent))',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
