import { useState } from 'react';
import { studentAPI } from '../services/api';
import { Search as SearchIcon, User, MapPin, CheckCircle, Clock } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true);
    try {
      const res = await studentAPI.search(query);
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Candidate Seat Locator</h1>
          <p className="page-subtitle">Lookup candidate seat assignments by PIN or name</p>
        </div>
      </div>

      {/* ── Search Form Bar ── */}
      <form onSubmit={handleSearch} className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <SearchIcon
              size={18}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              className="form-input"
              style={{ paddingLeft: 42, fontSize: 14 }}
              placeholder="Enter student PIN (e.g., 24101-CM-001) or candidate name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 15, height: 15 }} /> : <SearchIcon size={15} />}
            <span>Search Seat</span>
          </button>
        </div>
      </form>

      {/* ── Search Results ── */}
      {results && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, fontWeight: 500 }}>
            Found <strong>{results.count}</strong> candidate{results.count !== 1 ? 's' : ''} matching "{query}"
          </div>

          {results.results.length === 0 ? (
            <EmptyState
              icon={SearchIcon}
              title="No Matching Students Found"
              description="Verify the candidate PIN or name and try searching again."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {results.results.map((c) => (
                <div
                  key={c.id}
                  className="card"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    padding: '18px 22px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 280 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'var(--primary-subtle)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 14,
                        flexShrink: 0,
                      }}
                    >
                      {c.student_name ? c.student_name.charAt(0).toUpperCase() : 'S'}
                    </div>

                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                        {c.student_name}
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.pin}</span>
                        <span className="badge badge-primary">{c.branch_code}</span>
                        {c.curriculum_code && (
                          <span className="badge badge-neutral">{c.curriculum_code}</span>
                        )}
                        <StatusBadge
                          status={c.category === 'REGULAR' ? 'regular' : 'supply'}
                          text={c.category_display || c.category}
                        />
                        {c.subject_name && (
                          <span style={{ color: 'var(--text-muted)' }}>&bull; {c.subject_name}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Seat Allotment Badge Card */}
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '10px 20px',
                      background: c.room_number ? 'var(--primary-subtle)' : 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${c.room_number ? 'rgba(57, 139, 114, 0.2)' : 'var(--border-color)'}`,
                      minWidth: 140,
                    }}
                  >
                    {c.room_number ? (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, textTransform: 'uppercase' }}>
                          <MapPin size={12} />
                          Allotment Confirmed
                        </div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0' }}>
                          Room {c.room_number}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                          Seat S{c.seat_number}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                        <Clock size={13} />
                        <span>Unallocated</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
