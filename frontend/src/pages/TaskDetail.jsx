import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function TaskDetail() {
  const { taskId } = useParams();
  const { user } = useAuth() || {};
  const [task, setTask] = useState(null);
  const [subtasks, setSubtasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    async function fetchTaskDetails() {
      setLoading(true);
      setError('');
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      if (taskError) {
        setError(taskError.message);
        setLoading(false);
        return;
      }
      setTask(task);
      const { data: subtasks, error: subtasksError } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId);
      if (subtasksError) setError(subtasksError.message);
      else setSubtasks(subtasks);
      // Try to fetch from 'task_comments', fallback to 'comments'
      let commentsData = [];
      let commentsError = null;
      let commentsTable = 'task_comments';
      let { data: comments, error: commentsErr } = await supabase
        .from('task_comments')
        .select('*, profiles(id, full_name, email)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (commentsErr) {
        // fallback to 'comments' table if 'task_comments' doesn't exist
        commentsTable = 'comments';
        ({ data: comments, error: commentsErr } = await supabase
          .from('comments')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: true }));
      }
      commentsData = comments || [];
      commentsError = commentsErr;
      if (commentsError) setError(commentsError.message);
      else setComments(commentsData);
      const { data: attachments, error: attachmentsError } = await supabase
        .from('attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('uploaded_at', { ascending: false });
      if (attachmentsError) setError(attachmentsError.message);
      else setAttachments(attachments);
      setLoading(false);
    }
    fetchTaskDetails();
  }, [taskId]);

  async function handleAddComment(e) {
    e.preventDefault();
    if (!commentInput.trim() || !user) return;
    setCommentLoading(true);
    // Try to insert into 'task_comments', fallback to 'comments'
    let error = null;
    let commentsTable = 'task_comments';
    let insertRes = await supabase.from('task_comments').insert({
      task_id: taskId,
      user_id: user.id,
      content: commentInput.trim(),
      commented_by: user.email,
    });
    if (insertRes.error) {
      commentsTable = 'comments';
      insertRes = await supabase.from('comments').insert({
        task_id: taskId,
        user_id: user.id,
        comment_text: commentInput.trim(),
        commented_by: user.email,
      });
    }
    error = insertRes.error;
    setCommentLoading(false);
    if (!error) {
      setCommentInput('');
      // Refetch comments
      let { data: comments, error: commentsErr } = await supabase
        .from(commentsTable)
        .select(commentsTable === 'task_comments' ? '*, profiles(id, full_name, email)' : '*, user_id')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      setComments(comments || []);
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 p-4">
      <div className="task-detail-card p-6 rounded-xl shadow bg-white">
        <h1 className="text-2xl font-bold mb-4">Task Detail</h1>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {!loading && !error && task && (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="font-semibold text-xl">{task.title}</div>
                <span className={`task-badge status-badge ${task.is_complete ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{task.is_complete ? 'Complete' : 'Incomplete'}</span>
                <span className={`task-badge priority-badge ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{task.priority}</span>
              </div>
              <div className="text-sm text-gray-500 mb-1">Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</div>
              <div className="text-gray-700 mb-2">{task.description}</div>
            </div>
            <div className="mb-6">
              <div className="font-semibold text-lg mb-2">Subtasks</div>
              <ul className="space-y-1">
                {subtasks.length === 0 && <li className="text-gray-400">No subtasks.</li>}
                {subtasks.map(st => (
                  <li key={st.id} className="flex items-center gap-2">
                    <input type="checkbox" checked={st.is_done} readOnly className="accent-blue-600" />
                    <span className={st.is_done ? 'line-through text-gray-400' : ''}>{st.title}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mb-6">
              <div className="font-semibold text-lg mb-2">Comments</div>
              <div className="space-y-3 mb-2">
                {comments.length === 0 && <div className="text-gray-400">No comments yet.</div>}
                {comments.map(c => (
                  <div key={c.id} className="comment-bubble bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-blue-700">{c.commented_by || c.profiles?.full_name || c.profiles?.email || 'User'}</span>
                      <span className="text-xs text-gray-400 ml-2">&bull; {new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-gray-800 ml-1">{c.content || c.comment_text}</div>
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
            <div>
              <div className="font-semibold text-lg mb-2">Attachments</div>
              <ul className="space-y-1">
                {attachments.length === 0 && <li className="text-gray-400">No attachments.</li>}
                {attachments.map(a => (
                  <li key={a.id} className="flex items-center gap-2">
                    <span role="img" aria-label="Attachment">📎</span>
                    <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">Attachment</a>
                    <span className="text-xs text-gray-400">({a.uploaded_at ? new Date(a.uploaded_at).toLocaleString() : ''})</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 