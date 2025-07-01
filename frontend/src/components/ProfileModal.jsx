import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function ProfileModal({ open, onClose }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user) return;
    async function fetchProfile() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (!error && data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setAvatarUrl(data.avatar_url || '');
      }
    }
    fetchProfile();
  }, [user]);

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    let newAvatarUrl = avatarUrl;
    if (file) {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) {
        setError('Failed to upload avatar.');
        setLoading(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      newAvatarUrl = publicUrlData?.publicUrl || '';
    }
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName, avatar_url: newAvatarUrl })
      .eq('id', user.id);
    if (updateError) setError(updateError.message);
    else {
      setSuccess('Profile updated!');
      setAvatarUrl(newAvatarUrl);
      setFile(null);
    }
    setLoading(false);
  }

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ minWidth: 340 }}>
        <h2>Profile</h2>
        <form onSubmit={handleSave} className="modal-form">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', marginBottom: 8 }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 32, marginBottom: 8 }}>
                {profile?.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
              </div>
            )}
            <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
          </div>
          <input
            className="modal-input"
            placeholder="Full Name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
          />
          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}
          <div className="modal-actions">
            <button type="button" className="modal-btn cancel" onClick={onClose}>Close</button>
            <button type="submit" className="modal-btn primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
} 