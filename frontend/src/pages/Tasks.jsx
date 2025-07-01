import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function PriorityBadge({ priority }) {
  const color = priority === 'high' ? '#ef4444' : priority === 'medium' ? '#f59e42' : '#16a34a';
  return <span style={{ background: color + '22', color, padding: '0.25em 0.7em', borderRadius: '1em', fontWeight: 600, fontSize: '0.95em' }}>{priority}</span>;
}

function DueBadge({ due, complete }) {
  if (!due) return <span>-</span>;
  const date = new Date(due);
  const now = new Date();
  let color = '#2563eb';
  if (!complete && date < new Date(now.getFullYear(), now.getMonth(), now.getDate())) color = '#ef4444';
  else if (!complete && date <= new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2)) color = '#f59e42';
  return <span style={{ background: color + '22', color, padding: '0.25em 0.7em', borderRadius: '1em', fontWeight: 600, fontSize: '0.95em' }}>{date.toLocaleDateString()}</span>;
}

function AssigneeAvatar({ user }) {
  if (!user) return <span className="avatar avatar-unassigned">?</span>;
  const initials = user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : user.email[0].toUpperCase();
  return <span className="avatar" title={user.full_name || user.email}>{initials}</span>;
}

function TaskFormModal({ open, onClose, onSave, initialData, users, projects }) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [dueDate, setDueDate] = useState(initialData?.due_date || '');
  const [priority, setPriority] = useState(initialData?.priority || 'medium');
  const [assignedTo, setAssignedTo] = useState(initialData?.assigned_to || '');
  const [projectId, setProjectId] = useState(initialData?.project_id || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(initialData?.title || '');
      setDescription(initialData?.description || '');
      setDueDate(initialData?.due_date || '');
      setPriority(initialData?.priority || 'medium');
      setAssignedTo(initialData?.assigned_to || '');
      setProjectId(initialData?.project_id || '');
      setError('');
    }
  }, [open, initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) return setError('Title is required');
    onSave({ title, description, due_date: dueDate, priority, assigned_to: assignedTo, project_id: projectId });
  };

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2>{initialData ? 'Edit Task' : 'Add Task'}</h2>
        <form onSubmit={handleSubmit} className="modal-form">
          <input className="modal-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" required />
          <textarea className="modal-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={3} />
          <input className="modal-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          <select className="modal-input" value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <select className="modal-input" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
            <option value="">Unassigned</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
          </select>
          <select className="modal-input" value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">No Project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {error && <div className="auth-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="modal-btn cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="modal-btn primary">{initialData ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState({ status: 'all', priority: 'all', project: 'all', assignee: 'all', due: 'all' });
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    setError('');
    const [{ data: tasks, error: tasksError }, { data: users, error: usersError }, { data: projects, error: projectsError }] = await Promise.all([
      supabase.from('tasks').select('*').order('due_date', { ascending: true }),
      supabase.from('profiles').select('id, full_name, email'),
      supabase.from('projects').select('id, name'),
    ]);
    if (tasksError || usersError || projectsError) setError(tasksError?.message || usersError?.message || projectsError?.message);
    else {
      setTasks(tasks);
      setUsers(users);
      setProjects(projects);
    }
    setLoading(false);
  }

  async function logActivity({ action, taskId, details }) {
    if (!user) return;
    await supabase.from('activity_log').insert({
      user_id: user.id,
      task_id: taskId,
      action,
      details,
      created_at: new Date().toISOString(),
    });
  }

  async function handleAddOrEdit(taskData) {
    setError('');
    const cleanData = {
      ...taskData,
      assigned_to: taskData.assigned_to || null,
      project_id: taskData.project_id || null,
    };
    let result;
    if (editTask) {
      result = await supabase.from('tasks').update(cleanData).eq('id', editTask.id);
      if (!result.error) {
        await logActivity({ action: 'edited task', taskId: editTask.id, details: `Edited: ${cleanData.title}` });
      }
    } else {
      result = await supabase.from('tasks').insert([{ ...cleanData, is_complete: false }]);
      if (!result.error && result.data && result.data[0]) {
        await logActivity({ action: 'created task', taskId: result.data[0].id, details: `Created: ${cleanData.title}` });
      }
    }
    if (result.error) setError(result.error.message);
    else {
      setShowModal(false);
      setEditTask(null);
      fetchAll();
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this task?')) return;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) {
      await logActivity({ action: 'deleted task', taskId: id, details: 'Task deleted' });
      fetchAll();
    } else setError(error.message);
  }

  async function handleToggleComplete(task) {
    const { error } = await supabase.from('tasks').update({ is_complete: !task.is_complete }).eq('id', task.id);
    if (!error) {
      await logActivity({ action: task.is_complete ? 'marked incomplete' : 'completed task', taskId: task.id, details: task.title });
      fetchAll();
    } else setError(error.message);
  }

  // Filtering
  let filteredTasks = tasks;
  if (filter.status !== 'all') filteredTasks = filteredTasks.filter(t => filter.status === 'complete' ? t.is_complete : !t.is_complete);
  if (filter.priority !== 'all') filteredTasks = filteredTasks.filter(t => t.priority === filter.priority);
  if (filter.project !== 'all') filteredTasks = filteredTasks.filter(t => t.project_id === filter.project);
  if (filter.assignee !== 'all') filteredTasks = filteredTasks.filter(t => t.assigned_to === filter.assignee);
  if (filter.due !== 'all') {
    const today = new Date();
    today.setHours(0,0,0,0);
    filteredTasks = filteredTasks.filter(t => {
      if (!t.due_date) return false;
      const due = new Date(t.due_date);
      due.setHours(0,0,0,0);
      if (filter.due === 'overdue') return !t.is_complete && due < today;
      if (filter.due === 'today') return due.getTime() === today.getTime();
      if (filter.due === 'upcoming') return due > today;
      return true;
    });
  }
  if (search.trim()) {
    const s = search.trim().toLowerCase();
    filteredTasks = filteredTasks.filter(t =>
      t.title.toLowerCase().includes(s) ||
      (t.description && t.description.toLowerCase().includes(s))
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tasks</h1>
      <button className="add-task-btn" onClick={() => { setShowModal(true); setEditTask(null); }}>+ Add Task</button>
      <div className="task-search-filters">
        <input
          className="modal-input"
          style={{ maxWidth: 260, marginRight: 12 }}
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
          <option value="all">All</option>
          <option value="incomplete">Incomplete</option>
          <option value="complete">Complete</option>
        </select>
        <select value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}>
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <select value={filter.project} onChange={e => setFilter(f => ({ ...f, project: e.target.value }))}>
          <option value="all">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filter.assignee} onChange={e => setFilter(f => ({ ...f, assignee: e.target.value }))}>
          <option value="all">All Assignees</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </select>
        <select value={filter.due} onChange={e => setFilter(f => ({ ...f, due: e.target.value }))}>
          <option value="all">All Due Dates</option>
          <option value="overdue">Overdue</option>
          <option value="today">Due Today</option>
          <option value="upcoming">Upcoming</option>
        </select>
      </div>
      {error && <div className="auth-error">{error}</div>}
      <div className="task-table-wrapper">
        <table className="task-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Project</th>
              <th>Due</th>
              <th>Priority</th>
              <th>Assigned</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}>Loading tasks...</td></tr>
            ) : filteredTasks.length === 0 ? (
              <tr><td colSpan={7}>No tasks found.</td></tr>
            ) : filteredTasks.map(task => (
              <tr key={task.id}
                  onDoubleClick={() => navigate(`/tasks/${task.id}`)}
                  style={{ cursor: 'pointer' }}
              >
                <td>{task.title}</td>
                <td>{projects.find(p => p.id === task.project_id)?.name || '-'}</td>
                <td><DueBadge due={task.due_date} complete={task.is_complete} /></td>
                <td><PriorityBadge priority={task.priority} /></td>
                <td><AssigneeAvatar user={users.find(u => u.id === task.assigned_to)} /></td>
                <td>
                  <button className="status-btn" onClick={() => handleToggleComplete(task)}>
                    {task.is_complete ? '✅' : '⬜'}
                  </button>
                </td>
                <td>
                  <button className="edit-btn" onClick={() => { setEditTask(task); setShowModal(true); }}>Edit</button>
                  <button className="delete-btn" onClick={() => handleDelete(task.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TaskFormModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditTask(null); }}
        onSave={handleAddOrEdit}
        initialData={editTask}
        users={users}
        projects={projects}
      />
    </div>
  );
} 