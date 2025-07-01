import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const NOTE_COLORS = ['yellow', 'pink', 'blue', 'green', 'purple', 'orange'];
const COLOR_MAP = {
  yellow: 'bg-yellow-100',
  pink: 'bg-pink-100',
  blue: 'bg-blue-100',
  green: 'bg-green-100',
  purple: 'bg-purple-100',
  orange: 'bg-orange-100',
};

function NoteModal({ open, onClose, onSave, initialData }) {
  const [content, setContent] = useState(initialData?.content || '');
  const [color, setColor] = useState(initialData?.color || 'yellow');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setContent(initialData?.content || '');
      setColor(initialData?.color || 'yellow');
      setError('');
    }
  }, [open, initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return setError('Note cannot be empty');
    onSave({ content, color });
  };

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ minWidth: 320, maxWidth: 400 }}>
        <h2 className="text-xl font-bold mb-2">{initialData ? 'Edit Note' : 'Add Note'}</h2>
        <form onSubmit={handleSubmit} className="modal-form">
          <textarea
            className="modal-input"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write your note..."
            rows={4}
            required
          />
          <div className="flex gap-2 mb-2">
            {NOTE_COLORS.map(c => (
              <button
                type="button"
                key={c}
                className={`w-7 h-7 rounded-full border-2 ${color === c ? 'border-blue-600' : 'border-transparent'} ${COLOR_MAP[c]}`}
                style={{ outline: color === c ? '2px solid #2563eb' : 'none' }}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>
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

export default function StickyNotes() {
  const { user } = useAuth() || {};
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editNote, setEditNote] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchNotes();
    // eslint-disable-next-line
  }, [user]);

  async function fetchNotes() {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setNotes(data);
    setLoading(false);
  }

  async function handleAddOrEdit(noteData) {
    setError('');
    if (editNote) {
      const { error } = await supabase.from('notes').update(noteData).eq('id', editNote.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('notes').insert({ ...noteData, user_id: user.id });
      if (error) setError(error.message);
    }
    setShowModal(false);
    setEditNote(null);
    fetchNotes();
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this note?')) return;
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) setError(error.message);
    else fetchNotes();
  }

  return (
    <div className="max-w-6xl w-full mx-auto mt-4 p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Sticky Notes</h1>
        <button className="add-task-btn" onClick={() => { setShowModal(true); setEditNote(null); }}>+ Add Note</button>
      </div>
      {error && <div className="auth-error mb-4">{error}</div>}
      {loading ? (
        <div>Loading notes...</div>
      ) : (
        <div className="sticky-notes-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {notes.length === 0 && <div className="text-gray-400 col-span-full">No notes yet. Click "+ Add Note" to create one!</div>}
          {notes.map(note => (
            <div
              key={note.id}
              className={`sticky-note-card p-4 rounded-xl shadow relative ${COLOR_MAP[note.color] || 'bg-yellow-100'}`}
              style={{ minHeight: 120 }}
            >
              <div className="absolute top-2 right-2 flex gap-1">
                <button className="action-btn" title="Edit" onClick={() => { setEditNote(note); setShowModal(true); }}>🖉</button>
                <button className="action-btn delete" title="Delete" onClick={() => handleDelete(note.id)}>🗑️</button>
              </div>
              <div className="mb-2 whitespace-pre-line break-words text-gray-800" style={{ minHeight: 60 }}>{note.content}</div>
              <div className="text-xs text-gray-500 mt-2">{new Date(note.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
      <NoteModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditNote(null); }}
        onSave={handleAddOrEdit}
        initialData={editNote}
      />
    </div>
  );
} 