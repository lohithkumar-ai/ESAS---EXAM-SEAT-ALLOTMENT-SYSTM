import { useState } from 'react';
import { studentAPI } from '../services/api';
import { Search as SearchIcon, User, MapPin } from 'lucide-react';

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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Search Students</h1>
          <p className="page-subtitle">Find students by PIN or name and view their seat allocation</p>
        </div>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <SearchIcon size={18} style={{
              position: 'absolute', left: 14, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text-muted)'
            }} />
            <input
              className="form-input"
              style={{ paddingLeft: 42, fontSize: 15 }}
              placeholder="Search by PIN (e.g., 24101-CM-001) or student name..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <SearchIcon size={16} />}
            Search
          </button>
        </div>
      </form>

      {/* Results */}
      {results && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            {results.count} result{results.count !== 1 ? 's' : ''} found
          </div>

          {results.results.length === 0 ? (
            <div className="card empty-state">
              <SearchIcon className="empty-state-icon" />
              <div className="empty-state-title">No Results</div>
              <div className="empty-state-text">Try a different search term.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {results.results.map(c => (
                <div key={c.id} className="card" style={{
                  display: 'grid', gridTemplateColumns: '1fr auto',
                  gap: 20, alignItems: 'center',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <User size={18} color="var(--primary-light)" />
                      <span style={{ fontSize: 17, fontWeight: 700 }}>{c.student_name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)' }}>
                      <span><strong>PIN:</strong> {c.pin}</span>
                      <span><strong>Branch:</strong> <span className="badge badge-primary" style={{ marginLeft: 4 }}>{c.branch_code}</span></span>
                      <span><strong>Year:</strong> {c.year_display}</span>
                      <span><strong>Curriculum:</strong> {c.curriculum_code}</span>
                      <span><strong>Subject:</strong> {c.subject_name}</span>
                      <span>
                        <span className={`badge ${c.category === 'REGULAR' ? 'badge-success' : 'badge-warning'}`}>
                          {c.category_display}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Seat info */}
                  <div style={{
                    textAlign: 'center', padding: '12px 24px',
                    background: 'var(--primary-glow)', borderRadius: 'var(--radius-md)',
                    minWidth: 120,
                  }}>
                    {c.room_number ? (
                      <>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                          <MapPin size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
                          Allocated
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800 }}>Room {c.room_number}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary-light)' }}>
                          Seat {c.seat_number}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Not allocated</div>
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
