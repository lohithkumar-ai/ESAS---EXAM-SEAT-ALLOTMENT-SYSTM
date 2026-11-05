import React from 'react';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  style = {},
}) {
  return (
    <div className="empty-state" style={style}>
      {Icon && (
        <div className="empty-state-icon">
          <Icon size={44} />
        </div>
      )}
      {title && <h4 className="empty-state-title">{title}</h4>}
      {description && <p className="empty-state-text">{description}</p>}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}

