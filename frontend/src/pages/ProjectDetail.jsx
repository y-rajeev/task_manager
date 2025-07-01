import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { user } = useAuth() || {};
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    async function fetchProjectAndTasks() {
      setLoading(true);
      setError('');
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (projectError) {
        setError(projectError.message);
        setLoading(false);
        return;
      }
      setProject(project);
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true });
      if (tasksError) setError(tasksError.message);
      else setTasks(tasks);
      setLoading(false);
    }
    async function fetchComments() {
      const { data, error } = await supabase
        .from('project_comments')
        .select('*, profiles(id, full_name, email)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (!error) setComments(data);
    }
    fetchProjectAndTasks();
    fetchComments();
  }, [projectId]);

  async function handleAddComment(e) {
    e.preventDefault();
    if (!commentInput.trim() || !user) return;
    setCommentLoading(true);
    const { error } = await supabase.from('project_comments').insert({
      project_id: projectId,
      user_id: user.id,
      content: commentInput.trim(),
    });
    setCommentLoading(false);
    if (!error) {
      setCommentInput('');
      // Refetch comments
      const { data } = await supabase
        .from('project_comments')
        .select('*, profiles(id, full_name, email)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      setComments(data);
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 p-4">
      <h1 className="text-2xl font-bold mb-4">Project Detail</h1>
      <div className="border rounded p-4">
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {!loading && !error && project && (
          <>
            <div className="mb-4">
              <div className="font-semibold text-lg">{project.name}</div>
              <div className="text-sm text-gray-500">Created: {new Date(project.created_at).toLocaleString()}</div>
              <div className="text-gray-700 mt-2 mb-2">{project.description}</div>
            </div>
            <div className="mb-6">
              <div className="font-semibold mb-2">Tasks</div>
              <ul>
                {tasks.length === 0 && <li>No tasks for this project.</li>}
                {tasks.map(task => (
                  <li key={task.id} className="mb-2">
                    {task.title}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6">
              <div className="font-semibold mb-2">Comments</div>
              <div className="mb-2">
                {comments.length === 0 && <div className="text-gray-400">No comments yet.</div>}
                {comments.map(c => (
                  <div key={c.id} className="mb-3 p-2 bg-gray-50 rounded">
                    <div className="text-sm text-gray-700 mb-1">
                      <span className="font-semibold">{c.profiles?.full_name || c.profiles?.email || 'User'}</span>
                      <span className="text-xs text-gray-400 ml-2">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-gray-800">{c.content}</div>
                  </div>
                ))}
              </div>
              {user && (
                <form onSubmit={handleAddComment} className="flex gap-2 mt-2">
                  <input
                    className="modal-input flex-1"
                    placeholder="Add a comment..."
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    disabled={commentLoading}
                  />
                  <button className="modal-btn primary" type="submit" disabled={commentLoading || !commentInput.trim()}>
                    {commentLoading ? 'Posting...' : 'Post'}
                  </button>
                </form>
              )}
              {!user && <div className="text-gray-400 text-sm mt-2">Login to comment.</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 