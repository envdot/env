import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

function AuthOverlay() {
  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleOAuth = async (provider) => {
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          skipBrowserRedirect: true,
          redirectTo: 'http://127.0.0.1:17366/auth/callback',
        },
      });

      if (error) throw error;

      if (data?.url) {
        if (window.electronAPI?.supabaseAuth) {
          // In Electron: use IPC to handle OAuth in system browser with callback server
          const result = await window.electronAPI.supabaseAuth.oauthLogin(data.url);
          if (result.success && result.access_token) {
            await supabase.auth.setSession({
              access_token: result.access_token,
              refresh_token: result.refresh_token,
            });
          } else if (!result.success) {
            setError(result.error || 'OAuth login failed');
          }
        } else {
          // Fallback: open directly (development)
          window.open(data.url, '_blank');
        }
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="var(--accent)" />
            <text x="16" y="22" textAnchor="middle" fill="#0a0a0a" fontSize="18" fontWeight="700" fontFamily="var(--sans)">e</text>
          </svg>
          <span className="auth-logo-text">env</span>
        </div>

        <div className="auth-toggle">
          <button
            className={`auth-toggle-btn ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => { setMode('signin'); setError(''); }}
          >
            Sign in
          </button>
          <button
            className={`auth-toggle-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setError(''); }}
          >
            Sign up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleEmailAuth}>
          {mode === 'signup' && (
            <div className="auth-field">
              <label className="auth-label">Full name</label>
              <input
                type="text"
                className="auth-input"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              type="email"
              className="auth-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              type="password"
              className="auth-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            className="auth-btn auth-btn-primary"
            disabled={loading}
          >
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <div className="auth-oauth-buttons">
          <button
            className="auth-btn auth-btn-oauth"
            onClick={() => handleOAuth('google')}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <button
            className="auth-btn auth-btn-oauth"
            onClick={() => handleOAuth('github')}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M9 0C4.037 0 0 4.037 0 9c0 3.975 2.578 7.35 6.154 8.54.45.083.614-.195.614-.433 0-.213-.008-.78-.012-1.53-2.504.544-3.032-1.207-3.032-1.207-.41-1.04-1-1.317-1-1.317-.816-.558.062-.546.062-.546.903.063 1.378.927 1.378.927.802 1.374 2.104.977 2.617.747.081-.581.314-.977.571-1.201-1.999-.227-4.102-1-4.102-4.449 0-.983.351-1.786.927-2.416-.093-.228-.402-1.143.088-2.382 0 0 .756-.242 2.475.923A8.631 8.631 0 019 4.365c.765.004 1.535.103 2.254.303 1.718-1.165 2.473-.923 2.473-.923.491 1.24.182 2.154.089 2.382.578.63.926 1.433.926 2.416 0 3.458-2.106 4.219-4.112 4.441.323.278.611.828.611 1.668 0 1.204-.011 2.175-.011 2.471 0 .24.162.52.619.432C15.425 16.346 18 12.973 18 9c0-4.963-4.037-9-9-9z"/>
            </svg>
            Continue with GitHub
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthOverlay;
