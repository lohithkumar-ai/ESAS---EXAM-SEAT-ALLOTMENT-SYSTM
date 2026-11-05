import React from 'react';

export default function LoadingSkeleton({
  width = '100%',
  height = 20,
  borderRadius = 'var(--radius-sm)',
  style = {},
}) {
  return (
    <div
      className="skeleton"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
}

