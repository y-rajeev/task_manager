import React, { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [dropdown, setDropdown] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef();

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdown(false);
      }
    }
    if (dropdown) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdown]);

  const handleLogout = async () => {
    await logout();
    setDropdown(false);
    navigate('/login');
  };

  // Hide login/signup links if on /login or /signup
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <span className="navbar-logo">TaskManager</span>
        <div className="navbar-links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/projects">Projects</Link>
          <Link to="/tasks">Tasks</Link>
          {!user && !isAuthPage && <Link to="/login">Login</Link>}
          {!user && !isAuthPage && <Link to="/signup">Signup</Link>}
          {user && (
            <div className="profile-menu" ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
              <button
                className="profile-btn"
                onClick={() => setDropdown((d) => !d)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: '#2563eb',
                  padding: '0.5rem 1rem',
                  borderRadius: '2rem',
                }}
              >
                {user.user_metadata?.full_name || user.email}
                <span style={{ marginLeft: 6 }}>▼</span>
              </button>
              {dropdown && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '2.5rem',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)',
                    minWidth: 160,
                    zIndex: 10,
                  }}
                >
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eee', fontWeight: 500 }}>
                    {user.user_metadata?.full_name || user.email}
                  </div>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontWeight: 600,
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      borderRadius: '0 0 0.5rem 0.5rem',
                    }}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 