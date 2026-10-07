import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customerPortalAPI } from '../../services/api';
import { getApiError } from '../auth/auth.api';
import '../../styles/commerce.css';

const money = (amount) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount || 0);

export function CustomerPortalLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ shopId: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const change = (event) => setForm((value) => ({ ...value, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await customerPortalAPI.login(form);
      localStorage.setItem('portalAccessToken', data.accessToken);
      localStorage.setItem('portalCustomer', JSON.stringify(data.customer));
      navigate('/portal', { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to sign in to the customer portal'));
    } finally {
      setLoading(false);
    }
  };
  return <main className="commerce-page commerce-form-page">
    <header className="commerce-header"><div><p className="section-kicker">TailorOS</p><h1>Customer portal</h1><p>Sign in to view your fittings, orders, and invoices.</p></div></header>
    {error && <div className="commerce-alert" role="alert">{error}</div>}
    <form className="commerce-form" onSubmit={submit}>
      <label>Shop ID<input name="shopId" required value={form.shopId} onChange={change} autoComplete="organization" /></label>
      <label>Email<input name="email" type="email" required value={form.email} onChange={change} autoComplete="email" /></label>
      <label>Password<input name="password" type="password" required value={form.password} onChange={change} autoComplete="current-password" /></label>
      <button className="commerce-primary" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
      <Link className="commerce-back" to="/login">Staff sign in</Link>
    </form>
  </main>;
}

export function CustomerPortalHome() {
  const navigate = useNavigate();
  const customer = JSON.parse(localStorage.getItem('portalCustomer') || 'null');
  const profile = useQuery({ queryKey: ['portal-me'], queryFn: async () => (await customerPortalAPI.profile()).data.customer });
  const orders = useQuery({ queryKey: ['portal-orders'], queryFn: async () => (await customerPortalAPI.orders()).data.orders });
  const invoices = useQuery({ queryKey: ['portal-invoices'], queryFn: async () => (await customerPortalAPI.invoices()).data.invoices });
  const measurements = useQuery({ queryKey: ['portal-measurements'], queryFn: async () => (await customerPortalAPI.measurements()).data.profiles });
  const logout = () => {
    localStorage.removeItem('portalAccessToken');
    localStorage.removeItem('portalCustomer');
    navigate('/portal/login', { replace: true });
  };
  if (!localStorage.getItem('portalAccessToken')) return <main className="commerce-page"><div className="commerce-alert">Sign in to your customer portal. <Link to="/portal/login">Go to sign in</Link></div></main>;
  const name = profile.data?.name || [profile.data?.firstName, profile.data?.lastName].filter(Boolean).join(' ') || customer?.name || 'Customer';
  return <main className="commerce-page">
    <header className="commerce-header"><div><p className="section-kicker">{customer?.shopName || 'TailorOS'}</p><h1>Hello, {name}</h1><p>Check your order progress, measurements, and invoices.</p></div><button className="commerce-secondary" type="button" onClick={logout}>Sign out</button></header>
    <section className="commerce-report-grid">
      <article className="commerce-report-card"><h2>My orders</h2>{orders.isPending && <p>Loading…</p>}{orders.isError && <p className="commerce-negative">{getApiError(orders.error, 'Orders are unavailable')}</p>}{orders.data?.length ? orders.data.map((order) => <div className="commerce-portal-row" key={order._id}><strong>{order.orderNumber}</strong><span>{order.status}</span><span>Due {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'not set'}</span><span>{money(order.totalAmount)}</span></div>) : orders.isSuccess && <p>No orders yet.</p>}</article>
      <article className="commerce-report-card"><h2>My invoices</h2>{invoices.isPending && <p>Loading…</p>}{invoices.isError && <p className="commerce-negative">{getApiError(invoices.error, 'Invoices are unavailable')}</p>}{invoices.data?.length ? invoices.data.map((invoice) => <div className="commerce-portal-row" key={invoice._id}><strong>{invoice.invoiceNumber}</strong><span>{invoice.status}</span><span>Balance {money(Math.max(0, invoice.total - invoice.paidAmount))}</span></div>) : invoices.isSuccess && <p>No invoices yet.</p>}</article>
      <article className="commerce-report-card"><h2>My measurements</h2>{measurements.isPending && <p>Loading…</p>}{measurements.isError && <p className="commerce-negative">{getApiError(measurements.error, 'Measurements are unavailable')}</p>}{measurements.data?.length ? measurements.data.map((measurement) => <div className="commerce-portal-row" key={measurement._id}><strong>{measurement.templateId?.name || 'Measurement profile'}</strong><span>Version {measurement.version}</span><span>{new Date(measurement.createdAt).toLocaleDateString()}</span></div>) : measurements.isSuccess && <p>No saved measurements yet.</p>}</article>
    </section>
  </main>;
}
