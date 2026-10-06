import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from './auth.store';
import '../../styles/auth.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error } = useAuthStore();

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await login({ email, password });
    if (result.success) navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel auth-brand-panel">
        <p className="auth-kicker">TailorOS / atelier operations</p>
        <h1>Make every fitting count.</h1>
        <p>Keep customers, craft, and delivery moving in one calm workspace.</p>
      </section>
      <section className="auth-panel auth-form-panel">
        <div className="auth-heading">
          <span className="brand-mark">T</span>
          <div><strong>TailorOS</strong><small>Shop management, finely measured.</small></div>
        </div>
        <h2>Welcome back</h2>
        <p className="auth-subtitle">Sign in to continue to your workspace.</p>
        {error && <div className="auth-alert" role="alert">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          <label>Password
            <span className="password-field">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide' : 'Show'}</button>
            </span>
          </label>
          <button className="auth-submit" type="submit" disabled={isLoading}>{isLoading ? 'Signing in...' : 'Sign in'}</button>
        </form>
        <p className="auth-switch">New to TailorOS? <Link to="/register">Create your shop account</Link></p>
      </section>
    </main>
  );
}
