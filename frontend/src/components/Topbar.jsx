import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import ProfileModal from './ProfileModal';
import { useTheme } from '../context/ThemeContext';

export default function Topbar() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    async function fetchNotifications() {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (!error) setNotifications(data || []);
    }
    fetchNotifications();
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (profileDropdownOpen && profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    }
    if (dropdownOpen || profileDropdownOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen, profileDropdownOpen]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  async function markAsRead(id) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(notifications => notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

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
          <div className="topbar-right-content">
            <span className="topbar-notification" ref={dropdownRef}>
              <button className="notification-bell" onClick={() => setDropdownOpen(v => !v)} title="Notifications">
                <span role="img" aria-label="Notifications">🔔</span>
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>
              {dropdownOpen && (
                <div className="notification-dropdown">
                  <div className="notification-dropdown-header">Notifications</div>
                  {notifications.length === 0 && <div className="notification-empty">No notifications</div>}
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      className={`notification-item${n.is_read ? '' : ' unread'}`}
                      onClick={() => { if (!n.is_read) markAsRead(n.id); if (n.link) window.location.href = n.link; }}
                    >
                      <div className="notification-message">{n.message}</div>
                      <div className="notification-meta">{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </span>
            <button className="topbar-theme-toggle" onClick={toggleTheme} title="Toggle dark mode">
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
            <span className="topbar-profile" style={{ position: 'relative' }}>
              <span className="topbar-profile-avatar" onClick={() => setProfileDropdownOpen(v => !v)} style={{ cursor: 'pointer' }}>
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                ) : (
                  user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()
                )}
              </span>
              {profileDropdownOpen && (
                <div className="profile-dropdown" ref={profileDropdownRef}>
                  <div className="profile-dropdown-header">
                    <div className="profile-dropdown-avatar">
                      {user.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                      ) : (
                        user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()
                      )}
                    </div>
                    <div className="profile-dropdown-info">
                      <div className="profile-dropdown-name">{user.user_metadata?.full_name || 'User'}</div>
                      <div className="profile-dropdown-email">{user.email}</div>
                    </div>
                  </div>
                  <button className="profile-dropdown-btn" onClick={() => { setProfileOpen(true); setProfileDropdownOpen(false); }}>View Profile</button>
                  <button className="profile-dropdown-btn logout" onClick={handleLogout}>Logout</button>
                </div>
              )}
            </span>
            {profileOpen && <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />}
          </div>
        )}
      </div>
    </header>
  );
} 