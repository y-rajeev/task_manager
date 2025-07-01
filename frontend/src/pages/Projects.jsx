import React, { useEffect, useState, lazy, Suspense, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

// Lazy load modals/drawers for performance
const ProjectFormModal = lazy(() => import('./ProjectFormModal'));
// Details drawer/modal will be inline for now, but could be split if large

// Status badge colors
const STATUS_COLORS = {
  active: '#2563eb',
  completed: '#16a34a',
  on_hold: '#f59e42',
};

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || '#6b7280';
  const label = status ? status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown';
  return (
    <span style={{
      background: color + '22',
      color,
      padding: '0.25em 0.7em',
      borderRadius: '1em',
      fontWeight: 600,
      fontSize: '0.95em',
      marginRight: 4,
    }}>{label}</span>
  );
}

function ProgressBar({ percent }) {
  return (
    <div style={{ background: '#e5e7eb', borderRadius: 8, height: 8, width: 80, margin: '0 auto' }}>
      <div style={{ width: percent + '%', background: '#2563eb', height: 8, borderRadius: 8, transition: 'width 0.3s' }} />
    </div>
  );
}

function AssigneeAvatar({ user }) {
  if (!user) return <span className="avatar avatar-unassigned" title="Unassigned">?</span>;
  const initials = user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : user.email[0].toUpperCase();
  return <span className="avatar" title={user.full_name || user.email}>{initials}</span>;
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [detailsProject, setDetailsProject] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    setError('');
    const [{ data: projects, error: projectsError }, { data: users, error: usersError }, { data: tasks, error: tasksError }] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email'),
      supabase.from('tasks').select('id, project_id, is_complete'),
    ]);
    if (projectsError || usersError || tasksError) setError(projectsError?.message || usersError?.message || tasksError?.message);
    else {
      setProjects(projects.map(p => ({ ...p, assignees: p.assignees || [] })));
      setUsers(users);
      setTasks(tasks);
    }
    setLoading(false);
  }

  async function handleAddOrEdit(projectData) {
    setError('');
    const cleanData = {
      ...projectData,
      assignees: projectData.assignees || [],
    };
    let result;
    if (editProject) {
      result = await supabase.from('projects').update(cleanData).eq('id', editProject.id);
    } else {
      result = await supabase.from('projects').insert([cleanData]);
    }
    if (result.error) setError(result.error.message);
    else {
      setShowModal(false);
      setEditProject(null);
      fetchAll();
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this project?')) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) setError(error.message);
    else fetchAll();
  }

  // Memoize filtered/sorted list for performance
  const filtered = useMemo(() => {
    let result = projects.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      const matchesAssignee =
        filterAssignee === 'all' || (p.assignees && p.assignees.includes(filterAssignee));
      return matchesSearch && matchesStatus && matchesAssignee;
    });
    result = result.sort((a, b) => {
      let vA = a[sortBy], vB = b[sortBy];
      if (sortBy === 'name') {
        vA = vA.toLowerCase(); vB = vB.toLowerCase();
      }
      if (vA < vB) return sortDir === 'asc' ? -1 : 1;
      if (vA > vB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [projects, search, filterStatus, filterAssignee, sortBy, sortDir]);

  // Lazy load tasks for progress only when details drawer is opened
  async function loadTasksIfNeeded() {
    if (!tasksLoaded) {
      const { data: tasks, error } = await supabase.from('tasks').select('id, project_id, is_complete');
      if (!error) {
        setTasks(tasks);
        setTasksLoaded(true);
      }
    }
  }

  // Progress calculation
  function getProgress(projectId) {
    const projectTasks = tasks.filter(t => t.project_id === projectId);
    if (!projectTasks.length) return 0;
    const complete = projectTasks.filter(t => t.is_complete).length;
    return Math.round((complete / projectTasks.length) * 100);
  }

  return (
    <div className="max-w-6xl w-full mx-auto mt-2 p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold text-left">Projects</h1>
        <button className="add-task-btn" onClick={() => { setShowModal(true); setEditProject(null); }} aria-label="Add Project">+ Add Project</button>
      </div>
      <div className="filters-bar flex flex-wrap gap-2 items-center mb-4">
        <label htmlFor="projects-search" className="sr-only">Search projects</label>
        <input
          id="projects-search"
          className="modal-input w-48"
          placeholder="Search projects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search projects"
        />
        <label htmlFor="projects-status" className="sr-only">Filter by status</label>
        <select id="projects-status" className="modal-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
        </select>
        <label htmlFor="projects-assignee" className="sr-only">Filter by assignee</label>
        <select id="projects-assignee" className="modal-input" value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} aria-label="Filter by assignee">
          <option value="all">All Assignees</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </select>
      </div>
      <div className="project-card">
        {loading && <div>Loading projects...</div>}
        {error && <div className="auth-error mb-4">{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center py-8 text-gray-500">
            <span role="img" aria-label="Empty folder" style={{fontSize: 48, marginBottom: 12}}>📁</span>
            <div>No projects found. Try adjusting your search or filters.</div>
          </div>
        )}
        {filtered.length > 0 && (
        <table className="project-table w-full" role="table">
          <thead>
            <tr>
              <th className="cursor-pointer" onClick={() => { setSortBy('name'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }} tabIndex={0} aria-label="Sort by name">Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Assignees</th>
              <th className="cursor-pointer" onClick={() => { setSortBy('created_at'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }} tabIndex={0} aria-label="Sort by created date">Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(project => (
              <tr key={project.id}
                  onDoubleClick={() => navigate(`/projects/${project.id}`)}
                  style={{ cursor: 'pointer' }}
              >
                <td>
                  <a href={`/projects/${project.id}`} className="font-semibold text-blue-700 hover:underline text-lg" tabIndex={0}>{project.name}</a>
                </td>
                <td className="max-w-xs truncate text-gray-700">{project.description || '-'}</td>
                <td><StatusBadge status={project.status} /></td>
                <td><ProgressBar percent={getProgress(project.id)} /></td>
                <td>
                  <div className="flex -space-x-2">
                    {project.assignees && project.assignees.length > 0 ? project.assignees.map(uid => {
                      const user = users.find(u => u.id === uid);
                      return <AssigneeAvatar key={uid} user={user} />;
                    }) : <span className="avatar avatar-unassigned" title="Unassigned" aria-label="Unassigned">?</span>}
                  </div>
                </td>
                <td className="text-sm text-gray-500">{new Date(project.created_at).toLocaleString()}</td>
                <td>
                  <button className="action-btn" title="View details" aria-label="View details" onClick={async () => { setDetailsProject(project); await loadTasksIfNeeded(); }}>👁️ <span className="sr-only">View</span></button>
                  <button className="action-btn" title="Edit project" aria-label="Edit project" onClick={() => { setEditProject(project); setShowModal(true); }}>🖉 <span className="sr-only">Edit</span></button>
                  <button className="action-btn delete" title="Delete project" aria-label="Delete project" onClick={() => handleDelete(project.id)}>🗑️ <span className="sr-only">Delete</span></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
      {/* Details Drawer/Modal */}
      {detailsProject && (
        <Suspense fallback={<div>Loading details...</div>}>
          <div className="modal-overlay details-modal" onClick={() => setDetailsProject(null)}>
            <div className="modal-card" style={{ minWidth: 400, maxWidth: 600 }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Project details">
              <h2 className="text-2xl font-bold mb-2">{detailsProject.name}</h2>
              <StatusBadge status={detailsProject.status} />
              <div className="mt-2 mb-2 text-gray-700">{detailsProject.description || <span className="text-gray-400">No description</span>}</div>
              <div className="mb-2"><b>Progress:</b> <ProgressBar percent={getProgress(detailsProject.id)} /></div>
              <div className="mb-2"><b>Assignees:</b> {detailsProject.assignees && detailsProject.assignees.length > 0 ? detailsProject.assignees.map(uid => {
                const user = users.find(u => u.id === uid);
                return <AssigneeAvatar key={uid} user={user} />;
              }) : <span className="avatar avatar-unassigned" title="Unassigned" aria-label="Unassigned">?</span>}</div>
              <div className="mb-2 text-sm text-gray-500"><b>Created:</b> {new Date(detailsProject.created_at).toLocaleString()}</div>
              <div className="flex gap-2 mt-4">
                <button className="action-btn" aria-label="Edit project" onClick={() => { setEditProject(detailsProject); setShowModal(true); setDetailsProject(null); }}>🖉 <span className="sr-only">Edit</span></button>
                <button className="action-btn delete" aria-label="Delete project" onClick={() => { handleDelete(detailsProject.id); setDetailsProject(null); }}>🗑️ <span className="sr-only">Delete</span></button>
                <button className="action-btn" aria-label="Close details" onClick={() => setDetailsProject(null)}>Close</button>
              </div>
            </div>
          </div>
        </Suspense>
      )}
      <Suspense fallback={<div>Loading modal...</div>}>
        <ProjectFormModal
          open={showModal}
          onClose={() => { setShowModal(false); setEditProject(null); }}
          onSave={handleAddOrEdit}
          initialData={editProject}
          users={users}
        />
      </Suspense>
    </div>
  );
}

// For critical CSS: consider using vite-plugin-critical for above-the-fold styles.
// For further bundle optimization: use vite-plugin-inspect to analyze bundle size. 