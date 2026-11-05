import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomAPI } from '../services/api';
import { ArrowLeft, Users, DoorOpen, ShieldCheck, CheckCircle } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';

const BRANCH_COLORS = {
  CME: '#398B72',
  CM: '#398B72',
  ECE: '#2A7F9D',
  EC: '#2A7F9D',
  EEE: '#D9822B',
  EE: '#D9822B',
  ME: '#5F727D',
  M: '#5F727D',
};

export default function SeatingChart() {
  const { sessionId, roomId } = useParams();
  const navigate = useNavigate();
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredSeat, setHoveredSeat] = useState(null);

  useEffect(() => {
    loadChart();
  }, [roomId, sessionId]);

  const loadChart = async () => {
    try {
      const res = await roomAPI.getSeatingChart(roomId, sessionId);
      setChart(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
        <div className="spinner" style={{ marginBottom: 12 }} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Rendering hall seating chart...</span>
      </div>
    );
  }

  if (!chart) {
    return (
      <div className="card empty-state">
        <div className="empty-state-title">Room Layout Not Found</div>
        <div className="empty-state-text">No seating arrangement data available for this room.</div>
      </div>
    );
  }

  // Build 2D grid: grid[row][col] (Preserve exact 1-indexed row/col logic)
  const grid = [];
  for (let r = 1; r <= chart.rows; r++) {
    const row = [];
    for (let c = 1; c <= chart.columns; c++) {
      const seat = chart.seats.find((s) => s.column === c && s.row === r);
      row.push(seat || null);
    }
    grid.push(row);
  }

  const occupiedCount = chart.seats.filter((s) => s.student).length;
  const occupancyPercent = chart.capacity > 0 ? Math.round((occupiedCount / chart.capacity) * 100) : 0;

  const backUrl = sessionId ? `/examination/${sessionId}/rooms` : '/rooms';

  return (
    <div className="fade-in">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <button
            onClick={() => navigate(backUrl)}
            className="btn btn-secondary btn-sm"
            style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={14} />
            <span>Back to Room List</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="page-title">Room {chart.room_number} &bull; Seating Allotment</h1>
            <span className="badge badge-primary">
              {occupiedCount} / {chart.capacity} Seats ({occupancyPercent}%)
            </span>
          </div>
          <p className="page-subtitle">
            Configuration: {chart.columns} Columns &times; {chart.rows} Rows &bull; Serpentine Dual-Branch Grid
          </p>
        </div>

        {/* Legend */}
        <div
          className="card"
          style={{
            padding: '10px 16px',
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Branches:
          </span>
          {Object.entries({ CME: '#398B72', ECE: '#2A7F9D', EEE: '#D9822B', ME: '#5F727D' }).map(
            ([branch, color]) => (
              <div key={branch} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: color,
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {branch}
                </span>
              </div>
            )
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderLeft: '1px solid var(--border-color)', paddingLeft: 10 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: 'var(--bg-secondary)',
                border: '1px dashed var(--border-strong)',
              }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Empty / Buffer</span>
          </div>
        </div>
      </div>

      {/* ── Interactive Seating Matrix ── */}
      <div className="card" style={{ overflowX: 'auto', padding: '28px 20px' }}>
        {/* Column Headers */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          {Array.from({ length: chart.columns }, (_, i) => (
            <div
              key={i}
              style={{
                width: 110,
                textAlign: 'center',
                fontSize: 11.5,
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                padding: '6px 0',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
              }}
            >
              Col {i + 1}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          {grid.map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap: 12 }}>
              {row.map((seat, ci) => {
                if (!seat) return <div key={ci} style={{ width: 110, height: 74 }} />;
                const branch = seat.student?.branch || '';
                const branchColor = BRANCH_COLORS[branch] || 'var(--primary)';
                const isHovered = hoveredSeat === seat.seat_number;
                const isOccupied = Boolean(seat.student);

                return (
                  <div
                    key={ci}
                    className={`seat-cell ${isOccupied ? 'occupied' : 'empty'}`}
                    style={{
                      width: 110,
                      minHeight: 74,
                      borderLeft: isOccupied ? `4px solid ${branchColor}` : '1px dashed var(--border-strong)',
                      borderColor: isHovered ? branchColor : undefined,
                      boxShadow: isHovered ? 'var(--shadow-md)' : undefined,
                      background: isHovered ? 'var(--primary-subtle)' : undefined,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={() => setHoveredSeat(seat.seat_number)}
                    onMouseLeave={() => setHoveredSeat(null)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="seat-number">
                        S{seat.seat_number}
                      </span>
                      {isOccupied && (
                        <span
                          style={{
                            fontSize: 9.5,
                            fontWeight: 700,
                            color: branchColor,
                            textTransform: 'uppercase',
                          }}
                        >
                          {branch}
                        </span>
                      )}
                    </div>

                    {isOccupied ? (
                      <div style={{ marginTop: 2 }}>
                        <div className="seat-pin" title={seat.student.pin}>
                          {seat.student.pin}
                        </div>
                        <div
                          style={{
                            fontSize: 9.5,
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={seat.student.name}
                        >
                          {seat.student.name}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
                        Buffer
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Hovered Seat Details Popover Card ── */}
      {hoveredSeat && (() => {
        const seat = chart.seats.find((s) => s.seat_number === hoveredSeat);
        if (!seat?.student) return null;
        const branchColor = BRANCH_COLORS[seat.student.branch] || 'var(--primary)';

        return (
          <div
            className="card fade-in"
            style={{
              position: 'fixed',
              bottom: 24,
              right: 28,
              width: 300,
              boxShadow: 'var(--shadow-lg)',
              zIndex: 1000,
              borderLeft: `4px solid ${branchColor}`,
              padding: '16px 18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Seat S{seat.seat_number} &bull; Col {seat.column}, Row {seat.row}
              </span>
              <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                Room {chart.room_number}
              </span>
            </div>

            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
              {seat.student.name}
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'monospace', marginBottom: 10 }}>
              PIN: {seat.student.pin}
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="badge badge-primary">{seat.student.branch}</span>
              <StatusBadge
                status={seat.student.category === 'REGULAR' ? 'regular' : 'supply'}
                text={seat.student.category || 'Regular'}
              />
              {seat.student.semester && (
                <span className="badge badge-neutral">
                  Sem {seat.student.semester}
                </span>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
