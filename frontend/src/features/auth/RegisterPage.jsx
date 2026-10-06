import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuthStore } from './auth.store';
import '../../styles/auth.css';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().trim().max(30, 'Phone number is too long').optional(),
  password: z.string().min(8, 'Use at least 8 characters'),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  path: ['confirmPassword'], message: 'Passwords do not match',
});

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [validationError, setValidationError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuthStore();

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = registerSchema.safeParse(form);
    if (!result.success) {
      setValidationError(result.error.issues[0].message);
      return;
    }
    setValidationError('');
    const response = await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
    if (response.success) navigate('/dashboard', { replace: true });
  };

  return (
    <main className="auth-shell auth-register-shell">
      <section className="auth-panel auth-brand-panel">
        <p className="auth-kicker">TailorOS / your new workroom</p>
        <h1>A sharper way to run the day.</h1>
        <p>Start with a private workspace for your team, customers, and orders.</p>
      </section>
      <section className="auth-panel auth-form-panel">
        <div className="auth-heading"><span className="brand-mark">T</span><div><strong>TailorOS</strong><small>Set up your workroom.</small></div></div>
        <h2>Create your account</h2>
        <p className="auth-subtitle">Your account starts with a shop owner workspace.</p>
        {(validationError || error) && <div className="auth-alert" role="alert">{validationError || error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <label>Full name<input value={form.name} onChange={update('name')} autoComplete="name" required /></label>
          <label>Email<input type="email" value={form.email} onChange={update('email')} autoComplete="email" required /></label>
          <label>Phone <span className="optional">Optional</span><input type="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" /></label>
          <label>Password
            <span className="password-field"><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={update('password')} autoComplete="new-password" required /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide' : 'Show'}</button></span>
          </label>
          <label>Confirm password<input type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={update('confirmPassword')} autoComplete="new-password" required /></label>
          <button className="auth-submit" type="submit" disabled={isLoading}>{isLoading ? 'Creating workspace...' : 'Create account'}</button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </section>
    </main>
  );
}
