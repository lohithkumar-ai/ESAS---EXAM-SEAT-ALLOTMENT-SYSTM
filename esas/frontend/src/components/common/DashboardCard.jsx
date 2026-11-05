import React from 'react';

export default function DashboardCard({
  title,
  subtitle,
  action,
  children,
  className = '',
  style = {},
}) {
  return (
    <div className={`card ${className}`} style={style}>
      {(title || action) && (
        <div
          className="card-header"
          style={{
            marginBottom: 18,
            paddingBottom: subtitle ? 12 : 8,
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            {title && (
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.2px',
                  margin: 0,
                }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                style={{
                  fontSize: 12.5,
                  color: 'var(--text-muted)',
                  marginTop: 2,
                  margin: 0,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

