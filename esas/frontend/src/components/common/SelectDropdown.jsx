import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

/**
 * Premium Minimalist SaaS Select Dropdown
 * Drop-in replacement for native HTML <select> elements.
 * Features:
 * - Beautiful sage-tinted hover and active states
 * - Dual-theme support (light and dark mode)
 * - Click-outside listener
 * - Keyboard navigation (Escape, Enter, ArrowUp, ArrowDown)
 * - Optional embedded search filtering for lists > 7 items
 * - Subtext & badge support for metadata display
 * - Dual-signature onChange support: (value) and (value, { target: { value } })
 */
export default function SelectDropdown({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option...',
  icon: Icon,
  minWidth = 200,
  style = {},
  className = '',
  disabled = false,
  clearable = false,
  searchable = false,
  align = 'left',
  name = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Normalize options array: supports primitives, { value, label }, and { id, name }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: String(opt), label: String(opt) };
    }
    const val = opt.value !== undefined ? opt.value : opt.id;
    const lbl = opt.label !== undefined ? opt.label : (opt.name || `Option ${val}`);
    return {
      value: String(val ?? ''),
      label: String(lbl ?? ''),
      subtext: opt.subtext,
      badge: opt.badge,
    };
  });

  // Filter options if search query is active
  const filteredOptions = normalizedOptions.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.subtext && opt.subtext.toLowerCase().includes(q)) ||
      (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  });

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value ?? '')
  );

  const shouldShowSearch = searchable || normalizedOptions.length > 7;
  const hasEmptyOptionInList = normalizedOptions.some((opt) => opt.value === '');

  // Reset search when opening / closing
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setHighlightedIndex(-1);
      if (shouldShowSearch && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
  }, [isOpen, shouldShowSearch]);

  // Click-outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optValue) => {
    if (onChange) {
      const syntheticEvent = {
        target: { value: optValue, name },
        currentTarget: { value: optValue, name },
      };
      onChange(optValue, syntheticEvent);
    }
    setIsOpen(false);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex].value);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`select-dropdown-container ${className}`}
      onKeyDown={handleKeyDown}
      style={{
        position: 'relative',
        display: 'inline-block',
        minWidth,
        userSelect: 'none',
        ...style,
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '8px 13px',
          background: 'var(--bg-card)',
          border: `1px solid ${isOpen ? 'var(--primary)' : 'var(--border-color)'}`,
          boxShadow: isOpen
            ? '0 0 0 3px rgba(57, 139, 114, 0.12)'
            : '0 1px 2px rgba(0, 0, 0, 0.04)',
          borderRadius: 'var(--radius-md)',
          color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: 13.5,
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.18s ease',
          outline: 'none',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
          {Icon && (
            <Icon
              size={15}
              color={isOpen ? 'var(--primary)' : 'var(--text-muted)'}
              style={{ flexShrink: 0 }}
            />
          )}
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          size={15}
          color={isOpen ? 'var(--primary)' : 'var(--text-muted)'}
          style={{
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </button>

      {/* Floating Custom Menu */}
      {isOpen && (
        <div
          ref={listRef}
          className="fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            ...(align === 'right' ? { right: 0, left: 'auto' } : { left: 0, right: 'auto' }),
            minWidth: '100%',
            width: 'max-content',
            maxWidth: 400,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.12), 0 8px 12px -6px rgba(0, 0, 0, 0.06)',
            zIndex: 1050,
            padding: 5,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {/* Optional Embedded Search */}
          {shouldShowSearch && (
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                background: 'var(--bg-card)',
                padding: '4px 4px 8px 4px',
                borderBottom: '1px solid var(--border-color)',
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <Search size={13} color="var(--text-muted)" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter options..."
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: 12.5,
                    color: 'var(--text-primary)',
                    width: '100%',
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery('');
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                    }}
                  >
                    <X size={12} color="var(--text-muted)" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Optional Clear/Default Option if explicitly clearable and not already in options */}
          {clearable && !hasEmptyOptionInList && (
            <div
              onClick={() => handleSelect('')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12.5,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'background 0.12s ease',
                fontStyle: 'italic',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span>{placeholder}</span>
              {!value && <Check size={14} color="var(--primary)" />}
            </div>
          )}

          {/* Options List */}
          {filteredOptions.map((opt, index) => {
            const isSelected = String(opt.value) === String(value ?? '');
            const isHighlighted = highlightedIndex === index;

            return (
              <div
                key={`${opt.value}-${index}`}
                onClick={() => handleSelect(opt.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                  background: isSelected
                    ? 'var(--primary-subtle)'
                    : isHighlighted
                    ? 'var(--bg-secondary)'
                    : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected && !isHighlighted) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ overflow: 'hidden' }}>
                  <div
                    style={{
                      lineHeight: 1.25,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {opt.label}
                  </div>
                  {opt.subtext && (
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        marginTop: 2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {opt.subtext}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {opt.badge && (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: 12,
                        background: isSelected
                          ? 'rgba(57, 139, 114, 0.15)'
                          : 'var(--bg-secondary)',
                        color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      {opt.badge}
                    </span>
                  )}
                  {isSelected && <Check size={14} color="var(--primary)" />}
                </div>
              </div>
            );
          })}

          {filteredOptions.length === 0 && (
            <div
              style={{
                padding: '16px 12px',
                fontSize: 12.5,
                color: 'var(--text-muted)',
                textAlign: 'center',
              }}
            >
              No matching options found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
