import React from 'react';

export default function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  emptyMessage = 'No records found',
  loading = false,
}) {
  if (loading) {
    return (
      <div className="table-container" style={{ padding: '36px 0', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading records...</span>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key || col.label}
                style={{
                  textAlign: col.align || 'left',
                  width: col.width || 'auto',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data && data.length > 0 ? (
            data.map((row, index) => (
              <tr key={row[keyField] ?? index}>
                {columns.map((col) => (
                  <td
                    key={col.key || col.label}
                    style={{ textAlign: col.align || 'left' }}
                  >
                    {col.render ? col.render(row[col.key], row, index) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  textAlign: 'center',
                  padding: '36px 16px',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

