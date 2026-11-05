import React from 'react';

const STATUS_VARIANT_MAP = {
  active: 'badge-primary',
  online: 'badge-success',
  confirmed: 'badge-success',
  allocated: 'badge-success',
  regular: 'badge-primary',
  supply: 'badge-warning',
  supplementary: 'badge-warning',
  draft: 'badge-neutral',
  locked: 'badge-warning',
  pending: 'badge-warning',
  error: 'badge-error',
  failed: 'badge-error',
  unallocated: 'badge-warning',
  completed: 'badge-info',
};

export default function StatusBadge({ status = 'draft', text, dot = true }) {
  const normalized = String(status).toLowerCase();
  const variantClass = STATUS_VARIANT_MAP[normalized] || 'badge-neutral';
  const label = text || status;

  return (
    <span className={`badge ${variantClass}`}>
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: 'currentColor',
            display: 'inline-block',
          }}
        />
      )}
      {label}
    </span>
  );
}

