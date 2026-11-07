import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomAPI } from '../services/api';
import { ArrowLeft } from 'lucide-react';
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

const BRANCH_BG_COLORS = {
  CME: '#F0FDF4',
  CM: '#F0FDF4',
  ECE: '#F0F9FF',
  EC: '#F0F9FF',
  EEE: '#FFFBEB',
  EE: '#FFFBEB',
  ME: '#F8FAFC',
  M: '#F8FAFC',
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

  // Build seat lookup by (column, row)
  const seatMap = {};
  chart.seats.forEach((s) => {
    seatMap[`${s.column}-${s.row}`] = s;
  });

  // Calculate bench columns: each bench column = 2 physical columns
  const benchColumns = Math.floor(chart.columns / 2);
  const rowCount = chart.rows;
  const totalBenches = benchColumns * rowCount;

  const occupiedCount = chart.seats.filter((s) => s.student).length;
  const occupancyPercent = chart.capacity > 0 ? Math.round((occupiedCount / chart.capacity) * 100) : 0;

  const backUrl = sessionId ? `/examination/${sessionId}/rooms` : '/rooms';

  // Calculate bench number
  const getBenchNumber = (benchCol, row) => (benchCol * rowCount) + row;

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
            {benchColumns} Bench Columns &times; {rowCount} Rows &bull; {totalBenches} Benches &bull; Dual-Branch Bench Grid
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
                width: 12,
                height: 12,
                borderRadius: 3,
                background: '#FEE2E2',
                border: '1.5px solid #DC2626',
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>Not Allocated</span>
          </div>
        </div>
      </div>

      {/* ── Bench-Based Seating Matrix ── */}
      <div className="card" style={{ overflowX: 'auto', padding: '28px 20px' }}>
        {/* Bench Column Headers */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 16 }}>
          {Array.from({ length: benchColumns }, (_, i) => (
            <div
              key={i}
              style={{
                width: 240,
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
              Column {i + 1}
            </div>
          ))}
        </div>

        {/* Bench Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          {Array.from({ length: rowCount }, (_, ri) => {
            const row = ri + 1;
            return (
              <div key={ri} style={{ display: 'flex', gap: 32 }}>
                {Array.from({ length: benchColumns }, (_, bci) => {
                  const leftCol = bci * 2 + 1;
                  const rightCol = bci * 2 + 2;
                  const leftSeat = seatMap[`${leftCol}-${row}`];
                  const rightSeat = seatMap[`${rightCol}-${row}`];
                  const benchNum = getBenchNumber(bci, row);

                  return (
                    <BenchCell
                      key={bci}
                      benchNumber={benchNum}
                      leftSeat={leftSeat}
                      rightSeat={rightSeat}
                      hoveredSeat={hoveredSeat}
                      setHoveredSeat={setHoveredSeat}
                    />
                  );
                })}
              </div>
            );
          })}
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

/**
 * BenchCell — renders a single bench with LEFT and RIGHT seats side by side
 */
function BenchCell({ benchNumber, leftSeat, rightSeat, hoveredSeat, setHoveredSeat }) {
  return (
    <div
      style={{
        width: 240,
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md, 8px)',
        overflow: 'hidden',
        background: 'var(--bg-card, #fff)',
        transition: 'box-shadow 0.15s',
      }}
    >
      {/* Bench label */}
      <div
        style={{
          textAlign: 'center',
          fontSize: 10.5,
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          padding: '4px 0 2px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        B{benchNumber}
      </div>

      {/* Two seats side by side */}
      <div style={{ display: 'flex' }}>
        <SeatHalf
          seat={leftSeat}
          side="left"
          hoveredSeat={hoveredSeat}
          setHoveredSeat={setHoveredSeat}
        />
        <div style={{ width: 1, background: 'var(--border-color)' }} />
        <SeatHalf
          seat={rightSeat}
          side="right"
          hoveredSeat={hoveredSeat}
          setHoveredSeat={setHoveredSeat}
        />
      </div>
    </div>
  );
}

/**
 * SeatHalf — one side (LEFT or RIGHT) of a bench
 */
function SeatHalf({ seat, side, hoveredSeat, setHoveredSeat }) {
  if (!seat) {
    return (
      <div style={{ flex: 1, padding: '8px 10px', minHeight: 62 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>—</div>
      </div>
    );
  }

  const branch = seat.student?.branch || '';
  const branchColor = BRANCH_COLORS[branch] || 'var(--primary)';
  const isHovered = hoveredSeat === seat.seat_number;
  const isOccupied = Boolean(seat.student);

  return (
    <div
      style={{
        flex: 1,
        padding: '6px 10px',
        minHeight: 62,
        cursor: 'pointer',
        background: isHovered
          ? 'var(--primary-subtle)'
          : !isOccupied
          ? '#FEF2F2'
          : BRANCH_BG_COLORS[branch] || 'transparent',
        borderLeft: isOccupied && side === 'left' ? `3px solid ${branchColor}` : !isOccupied && side === 'left' ? '3px solid #DC2626' : undefined,
        borderRight: isOccupied && side === 'right' ? `3px solid ${branchColor}` : !isOccupied && side === 'right' ? '3px solid #DC2626' : undefined,
        transition: 'background 0.12s',
      }}
      onMouseEnter={() => setHoveredSeat(seat.seat_number)}
      onMouseLeave={() => setHoveredSeat(null)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            fontFamily: 'monospace',
          }}
        >
          S{seat.seat_number}
        </span>
        {isOccupied && (
          <span
            style={{
              fontSize: 9,
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
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'monospace',
            }}
            title={seat.student.pin}
          >
            {seat.student.pin}
          </div>
          <div
            style={{
              fontSize: 9.5,
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 95,
            }}
            title={seat.student.name}
          >
            {seat.student.name}
          </div>
        </div>
      ) : (
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: '#DC2626',
            marginTop: 4,
            padding: '2px 6px',
            background: '#FEE2E2',
            borderRadius: 3,
            display: 'inline-block',
          }}
        >
          NOT ALLOCATED
        </div>
      )}
    </div>
  );
}
