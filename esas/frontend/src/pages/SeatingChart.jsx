import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { roomAPI } from '../services/api';

const BRANCH_COLORS = {
  CME: '#6366f1', ECE: '#06b6d4', EEE: '#f59e0b', ME: '#10b981',
};

export default function SeatingChart() {
  const { sessionId, roomId } = useParams();
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredSeat, setHoveredSeat] = useState(null);

  useEffect(() => { loadChart(); }, [roomId]);

  const loadChart = async () => {
    try {
      const res = await roomAPI.getSeatingChart(roomId, sessionId);
      setChart(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 100 }}><div className="spinner" /></div>;
  }

  if (!chart) {
    return <div className="card empty-state"><div className="empty-state-title">Room not found</div></div>;
  }

  // Build 2D grid: grid[row][col]
  const grid = [];
  for (let r = 1; r <= chart.rows; r++) {
    const row = [];
    for (let c = 1; c <= chart.columns; c++) {
      const seat = chart.seats.find(s => s.column === c && s.row === r);
      row.push(seat || null);
    }
    grid.push(row);
  }

  const occupiedCount = chart.seats.filter(s => s.student).length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Room {chart.room_number} - Seating Chart</h1>
          <p className="page-subtitle">
            {chart.columns} columns x {chart.rows} rows | {occupiedCount} / {chart.capacity} occupied
          </p>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {Object.entries(BRANCH_COLORS).map(([branch, color]) => (
            <div key={branch} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{branch}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Seat Grid */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 12 }}>
          {Array.from({ length: chart.columns }, (_, i) => (
            <div key={i} style={{
              width: 100, textAlign: 'center', fontSize: 11, fontWeight: 700,
              color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1
            }}>
              Col {i + 1}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          {grid.map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap: 4 }}>
              {row.map((seat, ci) => {
                if (!seat) return <div key={ci} style={{ width: 100, height: 72 }} />;
                const branch = seat.student?.branch || '';
                const borderColor = BRANCH_COLORS[branch] || 'var(--border-subtle)';
                const isHovered = hoveredSeat === seat.seat_number;

                return (
                  <div
                    key={ci}
                    className={`seat-cell ${seat.student ? 'occupied' : ''}`}
                    style={{
                      width: 100, minHeight: 72,
                      borderLeft: seat.student ? `3px solid ${borderColor}` : undefined,
                      background: isHovered ? 'var(--primary-glow)' : undefined,
                      transform: isHovered ? 'scale(1.08)' : undefined,
                      zIndex: isHovered ? 10 : 1,
                    }}
                    onMouseEnter={() => setHoveredSeat(seat.seat_number)}
                    onMouseLeave={() => setHoveredSeat(null)}
                  >
                    <div className="seat-number">{String(seat.seat_number).padStart(2, '0')}</div>
                    {seat.student ? (
                      <>
                        <div className="seat-pin">{seat.student.pin}</div>
                        <div className="seat-branch" style={{ color: borderColor }}>{branch}</div>
                      </>
                    ) : (
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Empty</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Hovered seat detail */}
      {hoveredSeat && (() => {
        const seat = chart.seats.find(s => s.seat_number === hoveredSeat);
        if (!seat?.student) return null;
        return (
          <div className="card" style={{
            position: 'fixed', bottom: 20, right: 20, width: 280,
            boxShadow: 'var(--shadow-lg)', zIndex: 100,
            borderLeft: `3px solid ${BRANCH_COLORS[seat.student.branch] || 'var(--primary)'}`,
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
              Seat {seat.seat_number} (Col {seat.column}, Row {seat.row})
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{seat.student.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{seat.student.pin}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <span className="badge badge-primary">{seat.student.branch}</span>
              <span className={`badge ${seat.student.category === 'REGULAR' ? 'badge-success' : 'badge-warning'}`}>
                {seat.student.category}
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
