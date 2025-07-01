import React, { useState, useEffect } from 'react';

export default function ProjectFormModal({ open, onClose, onSave, initialData, users }) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [assignees, setAssignees] = useState(initialData?.assignees || []);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setDescription(initialData?.description || '');
      setAssignees(initialData?.assignees || []);
      setError('');
    }
  }, [open, initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name) return setError('Project name is required');
    onSave({ name, description, assignees });
  };

  if (!open) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={initialData ? 'Edit Project' : 'Add Project'}>
      <div className="modal-card">
        <h2>{initialData ? 'Edit Project' : 'Add Project'}</h2>
        <form onSubmit={handleSubmit} className="modal-form">
          <label htmlFor="project-name" className="modal-label">Project Name</label>
          <input id="project-name" className="modal-input" value={name} onChange={e => setName(e.target.value)} placeholder="Project Name" required aria-label="Project Name" />
          <label htmlFor="project-description" className="modal-label">Description</label>
          <textarea id="project-description" className="modal-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={3} aria-label="Description" />
          <label htmlFor="project-assignees" className="modal-label">Assign Users</label>
          <select id="project-assignees" className="modal-input" multiple value={assignees} onChange={e => setAssignees(Array.from(e.target.selectedOptions, o => o.value))} aria-label="Assign Users">
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
          </select>
          {error && <div className="auth-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="modal-btn cancel" onClick={onClose} aria-label="Cancel">Cancel</button>
            <button type="submit" className="modal-btn primary" aria-label={initialData ? 'Update Project' : 'Add Project'}>{initialData ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </div>
    </div>
  );
} 