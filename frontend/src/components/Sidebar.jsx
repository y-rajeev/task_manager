import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navLinks = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
    ),
  },
  {
    to: '/projects',
    label: 'Projects',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 3v4M8 3v4"/></svg>
    ),
  },
  {
    to: '/tasks',
    label: 'Tasks',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 3v2M15 3v2"/></svg>
    ),
  },
  {
    to: '/notes',
    label: 'Sticky Notes',
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 4v4a2 2 0 0 0 2 2h4"/><path d="M16 20v-4a2 2 0 0 0-2-2h-4"/></svg>
    ),
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <aside className={`sidebar${expanded ? ' expanded' : ' collapsed'}`}> 
      <div className="sidebar-top">
        <button className="sidebar-toggle" onClick={() => setExpanded(e => !e)}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12h16"/><path d="M4 6h16"/><path d="M4 18h16"/></svg>
        </button>
        {expanded && <span className="sidebar-logo">TaskManager</span>}
      </div>
      <nav className="sidebar-nav">
        {navLinks.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`sidebar-link${location.pathname.startsWith(link.to) ? ' active' : ''}`}
            title={link.label}
          >
            <span className="sidebar-icon">{link.icon}</span>
            {expanded && <span className="sidebar-label">{link.label}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
} 