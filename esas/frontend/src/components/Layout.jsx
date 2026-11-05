import { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  DoorOpen,
  FileText,
  Search,
  Upload,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLogoOpen, setIsLogoOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('esas_sidebar_collapsed') === 'true';
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('esas_theme') || 'light';
  });

  const user = JSON.parse(
    localStorage.getItem('esas_user') ||
    sessionStorage.getItem('esas_user') ||
    '{}'
  );

  // Sync theme with <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('esas_theme', theme);
  }, [theme]);

  // Sync collapsed state
  const toggleCollapsed = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    localStorage.setItem('esas_sidebar_collapsed', String(nextState));
  };

  const handleLogout = () => {
    localStorage.removeItem('esas_token');
    localStorage.removeItem('esas_refresh');
    localStorage.removeItem('esas_user');
    sessionStorage.removeItem('esas_token');
    sessionStorage.removeItem('esas_refresh');
    sessionStorage.removeItem('esas_user');
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/examination', icon: BookOpen, label: 'Examination' },
    { to: '/students', icon: Users, label: 'Students' },
    { to: '/rooms', icon: DoorOpen, label: 'Rooms' },
    { to: '/reports', icon: FileText, label: 'Reports' },
    { to: '/search', icon: Search, label: 'Search' },
  ];

  // Derive page title from route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'Exam Overview Dashboard';
    if (path.startsWith('/examination')) return 'Examination Management';
    if (path.startsWith('/students')) return 'Candidate Roll';
    if (path.startsWith('/rooms')) return 'Hall & Room Configurations';
    if (path.startsWith('/reports')) return 'Seat Allotment Reports';
    if (path.startsWith('/search')) return 'Student Seat Locator';
    if (path.startsWith('/upload')) return 'Nominal Roll Upload';
    return 'Smart Exam Seat Allotment';
  };

  const userInitial = user.first_name ? user.first_name.charAt(0).toUpperCase() : (user.username ? user.username.charAt(0).toUpperCase() : 'A');

  return (
    <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* ── Sidebar ── */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textDecoration: 'none',
              color: 'inherit',
              flex: 1,
              overflow: 'hidden',
            }}
          >
            <div
              className="sidebar-brand-icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsLogoOpen(true);
              }}
              title="Click to view logo"
            >
              <img
                src="/logo.png"
                alt="ESAS"
                style={{ width: 24, height: 24, objectFit: 'contain' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span style={{ display: 'none' }}>E</span>
            </div>
            {!collapsed && (
              <div className="sidebar-brand-text">
                <span className="sidebar-brand-name">ESAS</span>
                <span className="sidebar-brand-subtitle">Exam Allotment</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main Navigation</div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* Quick NR Upload Action */}
          <div className="sidebar-action-wrap">
            <NavLink to="/examination" className="sidebar-action-btn">
              <Upload size={14} />
              <span>Upload NR</span>
            </NavLink>
          </div>
        </nav>

        {/* User Profile Footer */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--primary-subtle)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {userInitial}
            </div>
            <div className="sidebar-user-info">
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user.first_name
                  ? `${user.first_name} ${user.last_name || ''}`.trim()
                  : user.username || 'Administrator'}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  textTransform: 'capitalize',
                }}
              >
                {user.role ? `${user.role.toLowerCase()}` : 'Exam Cell'}
              </div>
            </div>
          </div>
          <button
            className="btn-ghost"
            onClick={handleLogout}
            title="Sign Out"
            style={{
              padding: 6,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ── Header / Topbar ── */}
      <header className="header">
        <div className="header-left">
          <button
            className="header-toggle-btn"
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <div className="header-title">
            <span>{getPageTitle()}</span>
            <div className="header-session-badge">
              <ShieldCheck size={12} />
              <span>ESAS Active</span>
            </div>
          </div>
        </div>

        <div className="header-actions">
          {/* Quick Search Link */}
          <NavLink
            to="/search"
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Search size={14} />
            <span>Search Seat</span>
          </NavLink>

          {/* Theme Toggle Button */}
          <button
            className="header-toggle-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* ── Main Content Canvas ── */}
      <main className="main-content">
        {children}
      </main>

      {/* ── Logo Zoom Lightbox Modal ── */}
      {isLogoOpen && (
        <div
          onClick={() => setIsLogoOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(18, 23, 22, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              padding: 24,
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-color)',
              maxWidth: 420,
              width: '100%',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src="/logo.png"
              alt="ESAS System Emblem"
              style={{
                width: 200,
                height: 200,
                objectFit: 'contain',
                margin: '0 auto 16px',
              }}
              onError={(e) => {
                e.currentTarget.src = '';
              }}
            />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              ESAS Allotment System
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
              Smart Examination Seat Allocation Engine
            </p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsLogoOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
