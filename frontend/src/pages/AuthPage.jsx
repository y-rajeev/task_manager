import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { data, error: signupError } = await supabase.auth.signUp({ email, password });
      if (signupError) throw signupError;
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: fullName })
          .eq('id', data.user.id);
        if (profileError) throw profileError;
      }
      setMessage('Check your email for confirmation link!');
      setTimeout(() => {
        setMode('login');
        setMessage('');
      }, 2000);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-card">
      <div className="auth-title">{mode === 'login' ? 'Login' : 'Sign Up'}</div>
      <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="auth-form">
        {mode === 'signup' && (
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="auth-input"
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="auth-input"
          required
        />
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="auth-input"
            required
            style={{ paddingRight: '2.5rem' }}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            style={{
              position: 'absolute',
              right: '0.7rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '1.8rem',
              width: '2rem',
            }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              // Eye-off SVG
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#64748b" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0 1 12 19c-5 0-9-4.03-9-7 0-1.13.53-2.37 1.44-3.54m2.1-2.1C7.8 5.51 9.81 5 12 5c5 0 9 4.03 9 7 0 1.13-.53 2.37-1.44 3.54a8.98 8.98 0 0 1-2.1 2.1M15 12a3 3 0 0 0-3-3m0 0a3 3 0 0 0-3 3m3-3v.01M3 3l18 18" /></svg>
            ) : (
              // Eye SVG
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#64748b" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 0c0 2.97-4 7-9 7s-9-4.03-9-7c0-2.97 4-7 9-7s9 4.03 9 7Z" /></svg>
            )}
          </button>
        </div>
        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}
        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? (mode === 'login' ? 'Logging in...' : 'Signing up...') : (mode === 'login' ? 'Login' : 'Sign Up')}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        {mode === 'login' ? (
          <>
            Don&apos;t have an account?{' '}
            <button type="button" style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setMode('signup'); setError(''); setMessage(''); }}>
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button type="button" style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setMode('login'); setError(''); setMessage(''); }}>
              Login
            </button>
          </>
        )}
      </div>
    </div>
  );
} 