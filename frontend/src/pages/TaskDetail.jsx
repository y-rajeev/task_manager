import React, { useEffect, useState, useRef } from 'react';
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
  const [newSubtask, setNewSubtask] = useState('');
  const [subtaskLoading, setSubtaskLoading] = useState(false);
  const commentsEndRef = useRef(null);
  const [file, setFile] = useState(null);
  const [fileUploading, setFileUploading] = useState(false);

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

  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  function getInitials(name, email) {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return '?';
  }

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  async function handleDeleteComment(commentId, commentsTable) {
    if (!window.confirm('Delete this comment?')) return;
    const { error } = await supabase.from(commentsTable).delete().eq('id', commentId);
    if (!error) {
      setComments(comments => comments.filter(c => c.id !== commentId));
    }
  }

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

  async function handleAddSubtask(e) {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    setSubtaskLoading(true);
    const { error } = await supabase.from('subtasks').insert({
      task_id: taskId,
      title: newSubtask.trim(),
      is_done: false,
    });
    setSubtaskLoading(false);
    if (!error) {
      setNewSubtask('');
      // Refetch subtasks
      const { data: subtasks } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId);
      setSubtasks(subtasks || []);
    }
  }

  async function handleToggleSubtask(id, current) {
    const { error } = await supabase
      .from('subtasks')
      .update({ is_done: !current })
      .eq('id', id);
    if (!error) {
      setSubtasks(subtasks =>
        subtasks.map(st => st.id === id ? { ...st, is_done: !current } : st)
      );
    }
  }

  async function handleFileUpload(e) {
    e.preventDefault();
    if (!file || !user) return;
    setFileUploading(true);
    const ext = file.name.split('.').pop();
    const filePath = `${taskId}/${Date.now()}_${file.name}`;
    // Upload to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage.from('task-files').upload(filePath, file);
    if (storageError) {
      setError(storageError.message);
      setFileUploading(false);
      return;
    }
    // Get public URL (or signed URL if private)
    const { data: publicUrlData } = supabase.storage.from('task-files').getPublicUrl(filePath);
    const fileUrl = publicUrlData?.publicUrl || '';
    // Insert metadata into attachments table
    const { error: dbError } = await supabase.from('attachments').insert({
      task_id: taskId,
      file_url: fileUrl,
      file_name: file.name,
      uploaded_by: user.id,
    });
    setFileUploading(false);
    setFile(null);
    if (!dbError) {
      // Refetch attachments
      const { data: attachments } = await supabase
        .from('attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('uploaded_at', { ascending: false });
      setAttachments(attachments || []);
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12">
      <div className="task-detail-card">
        <h1>Task Detail</h1>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {!loading && !error && task && (
          <>
            <div className="task-detail-section mb-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="font-semibold text-xl">{task.title}</div>
                <span className={`task-badge status-badge ${task.is_complete ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{task.is_complete ? 'Complete' : 'Incomplete'}</span>
                <span className={`task-badge priority-badge ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{task.priority}</span>
              </div>
              <div className="text-sm text-gray-500 mb-1">Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</div>
              <div className="text-gray-700 mb-2">{task.description}</div>
            </div>
            <div className="task-detail-section mb-6">
              <div className="font-semibold text-lg mb-2">Subtasks</div>
              <ul className="subtasks-list">
                {subtasks.length === 0 && <li className="text-gray-400">No subtasks.</li>}
                {subtasks.map(st => (
                  <li key={st.id} className="subtask-item">
                    <input type="checkbox" checked={st.is_done} onChange={() => handleToggleSubtask(st.id, st.is_done)} />
                    <span className={st.is_done ? 'done' : ''}>{st.title}</span>
                  </li>
                ))}
              </ul>
              {user && (
                <form onSubmit={handleAddSubtask} className="flex gap-2 mt-2">
                  <input
                    className="modal-input flex-1"
                    placeholder="Add a subtask..."
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    disabled={subtaskLoading}
                  />
                  <button className="modal-btn primary" type="submit" disabled={subtaskLoading || !newSubtask.trim()}>
                    {subtaskLoading ? 'Adding...' : 'Add'}
                  </button>
                </form>
              )}
            </div>
            <div className="task-detail-section mb-6">
              <div className="font-semibold text-lg mb-2">Comments</div>
              <div className="space-y-3 mb-2">
                {comments.length === 0 && <div className="text-gray-400">No comments yet.</div>}
                {comments.map(c => {
                  const name = c.commented_by || c.profiles?.full_name;
                  const email = c.profiles?.email || c.commented_by;
                  const isOwn = user && (user.email === email);
                  const table = c.content !== undefined ? 'task_comments' : 'comments';
                  return (
                    <div key={c.id} className="comment-bubble">
                      <div className="comment-header">
                        <div className="comment-avatar">{getInitials(name, email)}</div>
                        <span className="font-semibold text-blue-700">{name || email || 'User'}</span>
                        <span className="comment-meta">&bull; {formatTime(c.created_at)}</span>
                        {isOwn && (
                          <button onClick={() => handleDeleteComment(c.id, table)} className="comment-delete">Delete</button>
                        )}
                      </div>
                      <div className="text-gray-800 ml-1">{c.content || c.comment_text}</div>
                    </div>
                  );
                })}
                <div ref={commentsEndRef} />
              </div>
              {user && (
                <form onSubmit={handleAddComment} className="comment-input-row">
                  <input
                    placeholder="Add a comment..."
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    disabled={commentLoading}
                  />
                  <button type="submit" disabled={commentLoading || !commentInput.trim()}>
                    {commentLoading ? 'Posting...' : 'Post'}
                  </button>
                </form>
              )}
              {!user && <div className="text-gray-400 text-sm mt-2">Login to comment.</div>}
            </div>
            <div className="task-detail-section">
              <div className="font-semibold text-lg mb-2">Attachments</div>
              <ul className="attachments-list">
                {attachments.length === 0 && <li className="text-gray-400">No attachments.</li>}
                {attachments.map(a => (
                  <li key={a.id} className="attachment-item">
                    <span role="img" aria-label="Attachment">📎</span>
                    <a href={a.file_url} target="_blank" rel="noopener noreferrer">{a.file_name || 'Attachment'}</a>
                    <span className="attachment-meta">({a.uploaded_at ? new Date(a.uploaded_at).toLocaleString() : ''})</span>
                  </li>
                ))}
              </ul>
              {user && (
                <form onSubmit={handleFileUpload} className="attachment-upload-row">
                  <input
                    type="file"
                    onChange={e => setFile(e.target.files[0])}
                    disabled={fileUploading}
                  />
                  <button type="submit" disabled={fileUploading || !file}>
                    {fileUploading ? 'Uploading...' : 'Upload'}
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 