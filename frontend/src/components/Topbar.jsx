import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Topbar() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Optionally add a logo here */}
      </div>
      <div className="topbar-center">
        <input
          type="text"
          className="topbar-search"
          placeholder="Search tasks, projects..."
        />
      </div>
      <div className="topbar-right">
        {user && (
          <div className="topbar-profile">
            <span className="topbar-profile-avatar">{user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}</span>
            <span className="topbar-profile-name">{user.user_metadata?.full_name || user.email}</span>
            <button className="topbar-logout" onClick={handleLogout} title="Log out">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 16l4-4-4-4"/><path d="M21 12H9"/><path d="M13 5v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2"/></svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
} 