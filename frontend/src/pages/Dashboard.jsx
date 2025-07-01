import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function isToday(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  const date = new Date(dateStr);
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isOverdue(dateStr, isComplete) {
  if (!dateStr || isComplete) return false;
  const today = new Date();
  const date = new Date(dateStr);
  return date < today.setHours(0,0,0,0);
}

export default function Dashboard() {
  const { user } = useAuth() || {};
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError('');
      const [{ data: tasks, error: tasksError }, { data: projects, error: projectsError }] = await Promise.all([
        supabase.from('tasks').select('*').order('due_date', { ascending: true }),
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
      ]);
      if (tasksError || projectsError) setError(tasksError?.message || projectsError?.message);
      else {
        setTasks(tasks);
        setProjects(projects);
      }
      setLoading(false);
      setLoadingProjects(false);
    }
    async function fetchComments() {
      setLoadingComments(true);
      // Fetch recent project and task comments (last 5)
      const [{ data: projectComments }, { data: taskComments }] = await Promise.all([
        supabase.from('project_comments').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('task_comments').select('*').order('created_at', { ascending: false }).limit(5),
      ]);
      setComments([
        ...(projectComments || []).map(c => ({ ...c, type: 'project' })),
        ...(taskComments || []).map(c => ({ ...c, type: 'task' })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5));
      setLoadingComments(false);
    }
    fetchAll();
    fetchComments();
  }, []);

  const myTasks = user ? tasks.filter(t => t.assigned_to === user.id) : [];
  const overdueTasks = tasks.filter(t => isOverdue(t.due_date, t.is_complete));
  const completedTasks = tasks.filter(t => t.is_complete);
  const todaysTasks = tasks.filter(t => isToday(t.due_date));
  const activeProjects = projects.filter(p => p.status === 'active');

  return (
    <div className="max-w-6xl w-full mx-auto mt-4 p-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button className="add-task-btn" onClick={() => navigate('/tasks')}>+ Add Task</button>
      </div>
      {user && <div className="mb-8 text-lg font-semibold text-gray-700">Welcome, {user.email}!</div>}
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <div className="dashboard-widgets grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        <div className="dashboard-widget-card flex flex-col items-center p-6 rounded-xl shadow bg-white">
          <div className="text-sm text-gray-500 mb-1">My Tasks</div>
          <div className="text-4xl font-extrabold text-blue-700 mb-1">{myTasks.length}</div>
          <button className="dashboard-view-btn" onClick={() => navigate('/tasks')}>View All</button>
        </div>
        <div className="dashboard-widget-card flex flex-col items-center p-6 rounded-xl shadow bg-white">
          <div className="text-sm text-gray-500 mb-1">Overdue Tasks</div>
          <div className="text-4xl font-extrabold text-red-600 mb-1">{overdueTasks.length}</div>
          <button className="dashboard-view-btn" onClick={() => navigate('/tasks')}>View All</button>
        </div>
        <div className="dashboard-widget-card flex flex-col items-center p-6 rounded-xl shadow bg-white">
          <div className="text-sm text-gray-500 mb-1">Completed Tasks</div>
          <div className="text-4xl font-extrabold text-green-600 mb-1">{completedTasks.length}</div>
          <button className="dashboard-view-btn" onClick={() => navigate('/tasks')}>View All</button>
        </div>
        <div className="dashboard-widget-card flex flex-col items-center p-6 rounded-xl shadow bg-white">
          <div className="text-sm text-gray-500 mb-1">Active Projects</div>
          <div className="text-4xl font-extrabold text-indigo-600 mb-1">{activeProjects.length}</div>
          <button className="dashboard-view-btn" onClick={() => navigate('/projects')}>View All</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="dashboard-section-card p-6 rounded-xl shadow bg-white">
          <div className="font-semibold text-lg mb-3">Today's Tasks</div>
          {loading ? <div>Loading...</div> : (
            <ul className="space-y-2">
              {todaysTasks.length === 0 && <li className="text-gray-400">No tasks for today.</li>}
              {todaysTasks.map(task => (
                <li key={task.id} className="flex items-center gap-3 p-2 rounded hover:bg-blue-50">
                  <span className={`task-badge ${task.is_complete ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{task.is_complete ? 'Complete' : 'Incomplete'}</span>
                  <span className={`priority-badge ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{task.priority}</span>
                  <span className="flex-1 font-semibold">{task.title}</span>
                  <button className="action-btn" onClick={() => navigate(`/tasks/${task.id}`)}>View</button>
                  {!task.is_complete && <button className="action-btn" onClick={async () => {
                    await supabase.from('tasks').update({ is_complete: true }).eq('id', task.id);
                    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, is_complete: true } : t));
                  }}>Mark Complete</button>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="dashboard-section-card p-6 rounded-xl shadow bg-white">
          <div className="font-semibold text-lg mb-3">Recent Activity</div>
          {loadingComments ? <div>Loading...</div> : (
            <ul className="space-y-2">
              {comments.length === 0 && <li className="text-gray-400">No recent activity.</li>}
              {comments.map(c => (
                <li key={c.id} className="p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-blue-700">{c.commented_by || c.user_id || 'User'}</span>
                    <span className="text-xs text-gray-400 ml-2">&bull; {new Date(c.created_at).toLocaleString()}</span>
                    <span className="text-xs text-gray-400 ml-2">[{c.type === 'project' ? 'Project' : 'Task'}]</span>
                  </div>
                  <div className="text-gray-800 ml-1">{c.content || c.comment_text}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
} 