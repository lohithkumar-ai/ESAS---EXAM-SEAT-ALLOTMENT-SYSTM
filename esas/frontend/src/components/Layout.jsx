import { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, GraduationCap, Upload, Users, DoorOpen,
  FileText, Search, Settings, LogOut, BookOpen, Sun, Moon
} from 'lucide-react';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const [isLogoOpen, setIsLogoOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('esas_theme') || 'dark');
  const user = JSON.parse(localStorage.getItem('esas_user') || '{}');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('esas_theme', theme);
  }, [theme]);

  const handleLogout = () => {
    localStorage.removeItem('esas_token');
    localStorage.removeItem('esas_user');
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

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <Link to="/" className="sidebar-brand" style={{ textDecoration: 'none', color: 'inherit', position: 'relative' }}>
          {isLogoOpen && (
            <div 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsLogoOpen(false);
              }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 9999,
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'zoom-out'
              }}
            >
              <img 
                src="/logo.png" 
                alt="ESAS Logo Large" 
                style={{ 
                  width: '400px', 
                  height: '400px', 
                  objectFit: 'contain',
                  background: 'var(--bg-surface)',
                  padding: '24px',
                  borderRadius: '16px',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                }} 
              />
            </div>
          )}
          <img 
            src="/logo.png" 
            alt="ESAS Logo" 
            onClick={(e) => {
              e.preventDefault();
              setIsLogoOpen(true);
            }}
            style={{ width: '40px', height: '40px', objectFit: 'contain', cursor: 'zoom-in' }} 
          />
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">ESAS</span>
            <span className="sidebar-brand-subtitle">Seat Allotment</span>
          </div>
        </Link>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main Menu</div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}

          <div className="sidebar-section-label" style={{ marginTop: 16 }}>
            NR Upload
          </div>
          <NavLink to="/examination" className="sidebar-link">
            <Upload />
            Upload NR
          </NavLink>
        </nav>

        {/* User footer */}
        <div style={{
          padding: '16px 14px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {user.first_name || user.username || 'Admin'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Exam Cell Staff
            </div>
          </div>
          <button className="btn-ghost" onClick={handleLogout} title="Logout"
            style={{ padding: 8, borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Header */}
      <header className="header">
        <div className="header-title">Smart Exam Seat Allotment Dashboard</div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle Theme" style={{ padding: '8px', cursor: 'pointer', background: 'transparent', border: 'none', color: 'var(--text-primary)' }}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <span className="badge badge-success">System Online</span>
        </div>
      </header>

      {/* Main content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
