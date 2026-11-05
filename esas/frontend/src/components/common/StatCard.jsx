import React from 'react';

export default function StatCard({
  title,
  value,
  icon: Icon,
  variant = 'primary',
  subtext,
  trend,
  onClick,
}) {
  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="card-header" style={{ marginBottom: 12 }}>
        <span className="card-title">{title}</span>
        {Icon && (
          <div className={`card-icon ${variant}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
      <div className="card-value">{value}</div>
      {(subtext || trend) && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {trend && (
            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
              {trend}
            </span>
          )}
          {subtext && <span>{subtext}</span>}
        </div>
      )}
    </div>
  );
}

