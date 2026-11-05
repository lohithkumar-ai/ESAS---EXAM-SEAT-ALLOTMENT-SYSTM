import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option...',
  icon: Icon,
  width,
  minWidth = 190,
  disabled = false,
  className = '',
  style = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize options array
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: opt, label: String(opt) };
    }
    return {
      value: opt.value ?? opt.id,
      label: opt.label ?? opt.name ?? `Option ${opt.value ?? opt.id}`,
      sublabel: opt.sublabel,
      icon: opt.icon,
      badge: opt.badge,
    };
  });

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  );

  // Close on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val) => {
    // Call with either direct value or synthetic event object so it's drop-in compatible
    if (onChange) {
      onChange({ target: { value: val } });
    }
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${className}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: width || 'auto',
        minWidth: minWidth,
        userSelect: 'none',
        ...style,
      }}
    >
      {/* ── Trigger Button ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '8px 14px',
          background: 'var(--bg-card)',
          border: `1px solid ${isOpen ? 'var(--primary)' : 'var(--border-color)'}`,
          borderRadius: 'var(--radius-md)',
          boxShadow: isOpen ? 'var(--shadow-glow)' : 'var(--shadow-xs)',
          color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: 13.5,
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          transition: 'all var(--transition-fast)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
          {Icon && (
            <Icon
              size={15}
              style={{
                color: isOpen ? 'var(--primary)' : 'var(--text-muted)',
                flexShrink: 0,
              }}
            />
          )}
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.2,
            }}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          size={15}
          style={{
            color: 'var(--text-muted)',
            transition: 'transform var(--transition-fast)',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            flexShrink: 0,
          }}
        />
      </button>

      {/* ── Popover Menu ── */}
      {isOpen && (
        <div
          className="custom-select-popover fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            minWidth: '100%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            maxHeight: 280,
            overflowY: 'auto',
            padding: 4,
          }}
        >
          {placeholder && (
            <div
              onClick={() => handleSelect('')}
              className={`custom-select-item ${!value ? 'selected' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                fontWeight: !value ? 700 : 500,
                color: !value ? 'var(--primary)' : 'var(--text-muted)',
                background: !value ? 'var(--primary-subtle)' : 'transparent',
                cursor: 'pointer',
                transition: 'background var(--transition-fast)',
              }}
            >
              <span>{placeholder}</span>
              {!value && <Check size={14} color="var(--primary)" />}
            </div>
          )}

          {normalizedOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <div
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`custom-select-item ${isSelected ? 'selected' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                  background: isSelected ? 'var(--primary-subtle)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background var(--transition-fast)',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {opt.icon && (
                      <opt.icon
                        size={14}
                        color={isSelected ? 'var(--primary)' : 'var(--text-muted)'}
                      />
                    )}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {opt.label}
                    </span>
                  </div>
                  {opt.sublabel && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                      {opt.sublabel}
                    </span>
                  )}
                </div>
                {isSelected && <Check size={14} color="var(--primary)" style={{ flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

