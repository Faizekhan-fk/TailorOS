import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import {
  analyticsAPI, auditLogsAPI, customersAPI, expensesAPI, inventoryAPI, invoicesAPI,
  notificationsAPI, ordersAPI, paymentsAPI, purchasesAPI, reportsAPI, suppliersAPI,
} from '../../services/api';
import { getApiError } from '../auth/auth.api';
import { hasPermission } from '../auth/permissions';
import { useAuthStore } from '../auth/auth.store';
import '../../styles/commerce.css';

const shopKey = (user) => localStorage.getItem('activeShopId') || user?.shopId;
const money = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value || 0);
const fullName = (value) => value?.name || [value?.firstName, value?.lastName].filter(Boolean).join(' ') || '—';
const getData = (response, key) => response.data[key] || [];
const pageHeader = (kicker, title, description) => (
  <header className="commerce-header"><div><p className="section-kicker">{kicker}</p><h1>{title}</h1><p>{description}</p></div></header>
);
const ErrorBanner = ({ error }) => error ? <div className="commerce-alert" role="alert">{error}</div> : null;
const LoadingState = ({ query, label }) => query.isPending ? <p className="commerce-state" role="status">Loading {label}…</p>
  : query.isError ? <div className="commerce-alert" role="alert">{getApiError(query.error, `Unable to load ${label}`)}</div> : null;
const submitError = (mutation, fallback) => mutation.error ? getApiError(mutation.error, fallback) : '';

export function PurchasesPage() {
  const user = useAuthStore((state) => state.user);
  const cache = useQueryClient();
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ inventoryId: '', quantity: '1', unitPrice: '' }]);
  const supplierQuery = useQuery({ queryKey: ['suppliers', shopKey(user)], queryFn: async () => getData(await suppliersAPI.list({ page: 1, limit: 100 }), 'suppliers') });
  const inventoryQuery = useQuery({ queryKey: ['inventory', shopKey(user)], queryFn: async () => getData(await inventoryAPI.list({ page: 1, limit: 100 }), 'items') });
  const query = useQuery({ queryKey: ['purchases', shopKey(user)], queryFn: async () => (await purchasesAPI.list({ page: 1, limit: 100 })).data });
  const mutation = useMutation({
    mutationFn: (data) => purchasesAPI.create(data),
    onSuccess: async () => {
      setSupplierId(''); setNotes(''); setLines([{ inventoryId: '', quantity: '1', unitPrice: '' }]);
      await cache.invalidateQueries({ queryKey: ['purchases'] });
    },
  });
  const action = useMutation({
    mutationFn: ({ id, type }) => type === 'receive' ? purchasesAPI.receive(id) : purchasesAPI.cancel(id),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['purchases'] });
      await cache.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
  const addLine = () => setLines((items) => [...items, { inventoryId: '', quantity: '1', unitPrice: '' }]);
  const updateLine = (index, field, value) => setLines((items) => items.map((line, i) => i === index ? { ...line, [field]: value } : line));
  const submit = (event) => {
    event.preventDefault();
    mutation.mutate({
      supplierId,
      notes: notes || undefined,
      items: lines.map((line) => ({ inventoryId: line.inventoryId, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice) })),
    });
  };
  return <main className="commerce-page">
    {pageHeader('Procurement', 'Purchases', 'Create purchase orders and receive materials into stock.')}
    <ErrorBanner error={submitError(mutation, 'Unable to create purchase')} />
    <ErrorBanner error={submitError(action, 'Unable to update purchase')} />
    <form className="commerce-form commerce-wide-form" onSubmit={submit}>
      <h2>New purchase order</h2>
      <label>Supplier
        <select required value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
          <option value="">Select supplier</option>
          {(supplierQuery.data || []).filter((supplier) => supplier.isActive !== false).map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}
        </select>
      </label>
      {lines.map((line, index) => <div className="commerce-purchase-line" key={index}>
        <label>Inventory item
          <select required value={line.inventoryId} onChange={(event) => {
            const selected = inventoryQuery.data?.find((item) => item._id === event.target.value);
            updateLine(index, 'inventoryId', event.target.value);
            if (selected) updateLine(index, 'unitPrice', String(selected.unitPrice));
          }}>
            <option value="">Select material</option>
            {(inventoryQuery.data || []).map((item) => <option key={item._id} value={item._id}>{item.name} · {item.quantity} {item.unit} in stock</option>)}
          </select>
        </label>
        <label>Quantity<input type="number" min="0.001" step="0.001" required value={line.quantity} onChange={(event) => updateLine(index, 'quantity', event.target.value)} /></label>
        <label>Unit price<input type="number" min="0" step="0.01" required value={line.unitPrice} onChange={(event) => updateLine(index, 'unitPrice', event.target.value)} /></label>
        {lines.length > 1 && <button type="button" className="commerce-link-button commerce-danger-link" onClick={() => setLines((items) => items.filter((_, i) => i !== index))}>Remove</button>}
      </div>)}
      <button type="button" className="commerce-secondary commerce-fit" onClick={addLine}>Add item</button>
      <label>Notes<textarea rows="2" maxLength="2000" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      <button type="submit" className="commerce-primary commerce-fit" disabled={mutation.isPending}>{mutation.isPending ? 'Creating…' : 'Create purchase order'}</button>
    </form>
    <LoadingState query={query} label="purchases" />
    {query.data?.purchases?.length > 0 && <div className="commerce-table-wrap"><table className="commerce-table"><thead><tr><th>Purchase</th><th>Supplier</th><th>Items</th><th>Total</th><th>Status</th><th>Ordered</th><th>Action</th></tr></thead><tbody>
      {query.data.purchases.map((purchase) => <tr key={purchase._id}><td>{purchase.purchaseNumber}</td><td>{purchase.supplier?.name}</td><td>{purchase.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}</td><td>{money(purchase.totalAmount)}</td><td><span className="commerce-badge">{purchase.status}</span></td><td>{new Date(purchase.orderedAt).toLocaleDateString()}</td><td>{purchase.status === 'ORDERED' && <div className="commerce-actions"><button className="commerce-link-button" type="button" disabled={action.isPending} onClick={() => action.mutate({ id: purchase._id, type: 'receive' })}>Receive</button><button className="commerce-link-button commerce-danger-link" type="button" disabled={action.isPending} onClick={() => action.mutate({ id: purchase._id, type: 'cancel' })}>Cancel</button></div>}</td></tr>)}
    </tbody></table></div>}
  </main>;
}

const expenseCategories = ['rent', 'utilities', 'payroll', 'supplies', 'maintenance', 'transport', 'marketing', 'other'];
const methods = ['cash', 'card', 'online', 'check', 'bank_transfer', 'other'];
export function ExpensesPage() {
  const user = useAuthStore((state) => state.user);
  const cache = useQueryClient();
  const [form, setForm] = useState({ category: 'supplies', description: '', amount: '', spentAt: new Date().toISOString().slice(0, 10), paymentMethod: 'cash', reference: '', notes: '' });
  const query = useQuery({ queryKey: ['expenses', shopKey(user)], queryFn: async () => (await expensesAPI.list({ page: 1, limit: 100 })).data });
  const create = useMutation({ mutationFn: () => expensesAPI.create({ ...form, amount: Number(form.amount), spentAt: new Date(form.spentAt) }), onSuccess: async () => { setForm((value) => ({ ...value, description: '', amount: '', reference: '', notes: '' })); await cache.invalidateQueries({ queryKey: ['expenses'] }); } });
  const voidMutation = useMutation({ mutationFn: (id) => expensesAPI.void(id), onSuccess: () => cache.invalidateQueries({ queryKey: ['expenses'] }) });
  const change = (event) => setForm((value) => ({ ...value, [event.target.name]: event.target.value }));
  return <main className="commerce-page">
    {pageHeader('Finance', 'Expenses', 'Record, review, and void shop operating expenses.')}
    <ErrorBanner error={submitError(create, 'Unable to record expense')} /><ErrorBanner error={submitError(voidMutation, 'Unable to void expense')} />
    <form className="commerce-form commerce-grid-form" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
      <label>Category<select name="category" value={form.category} onChange={change}>{expenseCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Description<input name="description" minLength="2" maxLength="300" required value={form.description} onChange={change} /></label>
      <label>Amount<input name="amount" type="number" min="0.01" step="0.01" required value={form.amount} onChange={change} /></label>
      <label>Date<input name="spentAt" type="date" required value={form.spentAt} onChange={change} /></label>
      <label>Method<select name="paymentMethod" value={form.paymentMethod} onChange={change}>{methods.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></label>
      <label>Reference<input name="reference" maxLength="120" value={form.reference} onChange={change} /></label>
      <label className="commerce-span-all">Notes<textarea name="notes" maxLength="2000" rows="2" value={form.notes} onChange={change} /></label>
      <button className="commerce-primary commerce-fit" type="submit" disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Record expense'}</button>
    </form>
    <LoadingState query={query} label="expenses" />
    {query.data?.expenses?.length > 0 && <div className="commerce-table-wrap"><table className="commerce-table"><thead><tr><th>Date</th><th>Number</th><th>Category</th><th>Description</th><th>Amount</th><th>Method</th><th>Action</th></tr></thead><tbody>{query.data.expenses.map((expense) => <tr key={expense._id}><td>{new Date(expense.spentAt).toLocaleDateString()}</td><td>{expense.expenseNumber}</td><td>{expense.category}</td><td>{expense.description}</td><td>{money(expense.amount)}</td><td>{expense.paymentMethod.replaceAll('_', ' ')}</td><td><button type="button" className="commerce-link-button commerce-danger-link" disabled={voidMutation.isPending} onClick={() => voidMutation.mutate(expense._id)}>Void</button></td></tr>)}</tbody></table></div>}
  </main>;
}

export function InvoicesPage() {
  const user = useAuthStore((state) => state.user);
  const cache = useQueryClient();
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState('');
  const query = useQuery({ queryKey: ['invoices', shopKey(user)], queryFn: async () => (await invoicesAPI.list({ page: 1, limit: 100 })).data });
  const ordersQuery = useQuery({ queryKey: ['invoice-orders', shopKey(user)], queryFn: async () => getData(await ordersAPI.list({ page: 1, limit: 100 }), 'orders') });
  const create = useMutation({ mutationFn: () => invoicesAPI.create({ orderId }), onSuccess: async () => { setError(''); setOrderId(''); await cache.invalidateQueries({ queryKey: ['invoices'] }); }, onError: (requestError) => setError(getApiError(requestError, 'Unable to issue invoice')) });
  const invoiceId = useParams().id;
  const detail = useQuery({ queryKey: ['invoice', invoiceId], queryFn: async () => (await invoicesAPI.getById(invoiceId)).data.invoice, enabled: Boolean(invoiceId) });
  const voidInvoice = useMutation({ mutationFn: (id) => invoicesAPI.void(id), onSuccess: async () => { await cache.invalidateQueries({ queryKey: ['invoices'] }); await detail.refetch(); } });
  if (invoiceId) {
    if (detail.isPending) return <main className="commerce-page"><p className="commerce-state">Loading invoice…</p></main>;
    if (detail.isError) return <main className="commerce-page"><ErrorBanner error={getApiError(detail.error, 'Unable to load invoice')} /></main>;
    const invoice = detail.data;
    return <main className="commerce-page">
      <div className="commerce-receipt-toolbar"><Link to="/invoices" className="commerce-back no-print">← Invoices</Link><div className="commerce-actions no-print"><button type="button" className="commerce-primary" onClick={() => window.print()}>Print invoice</button>{invoice.status !== 'VOID' && hasPermission(user, 'invoices.delete') && <button type="button" className="commerce-secondary" onClick={() => voidInvoice.mutate(invoice._id)}>Void</button>}</div></div>
      <article className="commerce-receipt"><header><p className="section-kicker">TailorOS</p><h1>Invoice {invoice.invoiceNumber}</h1><span className="commerce-badge">{invoice.status}</span></header><p>Customer: {fullName(invoice.customerId)} · Order: {invoice.orderId?.orderNumber}</p>
        <div className="commerce-table-wrap"><table className="commerce-table"><thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>{invoice.items.map((item, index) => <tr key={`${item.name}-${index}`}><td>{item.name}</td><td>{item.quantity}</td><td>{money(item.unitPrice)}</td><td>{money(item.total)}</td></tr>)}</tbody></table></div>
        <dl><div><dt>Total</dt><dd>{money(invoice.total)}</dd></div><div><dt>Paid</dt><dd>{money(invoice.paidAmount)}</dd></div><div className="commerce-receipt-total"><dt>Balance</dt><dd>{money(Math.max(0, invoice.total - invoice.paidAmount))}</dd></div></dl>
      </article>
    </main>;
  }
  const invoicedIds = new Set((query.data?.invoices || []).map((invoice) => String(invoice.orderId?._id || invoice.orderId)));
  return <main className="commerce-page">
    {pageHeader('Billing', 'Invoices', 'Issue customer invoices from orders and print them for your records.')}
    <ErrorBanner error={error} />
    <form className="commerce-form commerce-inline-create" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
      <label>Order<select required value={orderId} onChange={(event) => setOrderId(event.target.value)}><option value="">Select an order</option>{(ordersQuery.data || []).filter((order) => order.status !== 'cancelled' && !invoicedIds.has(String(order._id))).map((order) => <option key={order._id} value={order._id}>{order.orderNumber} · {fullName(order.customer)} · {money(order.totalAmount)}</option>)}</select></label>
      <button type="submit" className="commerce-primary" disabled={create.isPending || !orderId}>{create.isPending ? 'Issuing…' : 'Issue invoice'}</button>
    </form>
    <LoadingState query={query} label="invoices" />
    {query.data?.invoices?.length > 0 && <div className="commerce-table-wrap"><table className="commerce-table"><thead><tr><th>Invoice</th><th>Order</th><th>Customer</th><th>Total</th><th>Paid</th><th>Status</th><th>Issued</th></tr></thead><tbody>{query.data.invoices.map((invoice) => <tr key={invoice._id}><td><Link className="commerce-link" to={`/invoices/${invoice._id}`}>{invoice.invoiceNumber}</Link></td><td>{invoice.orderId?.orderNumber}</td><td>{fullName(invoice.customerId)}</td><td>{money(invoice.total)}</td><td>{money(invoice.paidAmount)}</td><td>{invoice.status}</td><td>{new Date(invoice.issuedAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>}
  </main>;
}

export function NotificationsPage() {
  const user = useAuthStore((state) => state.user);
  const cache = useQueryClient();
  const [announcement, setAnnouncement] = useState({ title: '', message: '' });
  const [live, setLive] = useState(null);
  const query = useQuery({ queryKey: ['notifications', shopKey(user)], queryFn: async () => (await notificationsAPI.list({ page: 1, limit: 50 })).data });
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return undefined;
    const socket = io(window.location.origin, { auth: { token, shopId: shopKey(user) }, transports: ['websocket', 'polling'] });
    socket.on('notification:new', (notification) => {
      setLive(notification);
      cache.setQueryData(['notifications', shopKey(user)], (current) => current
        ? { ...current, notifications: [notification, ...current.notifications], unread: (current.unread || 0) + 1 }
        : current);
    });
    socket.on('connect_error', (socketError) => console.error('Notification socket connection failed:', socketError.message));
    return () => socket.disconnect();
  }, [cache, user]);
  const markRead = useMutation({ mutationFn: (id) => notificationsAPI.markRead(id), onSuccess: () => cache.invalidateQueries({ queryKey: ['notifications'] }) });
  const markAll = useMutation({ mutationFn: notificationsAPI.markAllRead, onSuccess: () => cache.invalidateQueries({ queryKey: ['notifications'] }) });
  const send = useMutation({ mutationFn: () => notificationsAPI.announce(announcement), onSuccess: () => setAnnouncement({ title: '', message: '' }) });
  return <main className="commerce-page">
    {pageHeader('Updates', 'Notifications', `Live shop updates${query.data ? ` · ${query.data.unread} unread` : ''}.`)}
    {live && <div className="commerce-success" role="status">Live: {live.title} — {live.message}</div>}
    {hasPermission(user, 'notifications.manage') && <form className="commerce-form commerce-inline-create" onSubmit={(event) => { event.preventDefault(); send.mutate(); }}><label>Announcement title<input required maxLength="160" value={announcement.title} onChange={(event) => setAnnouncement((v) => ({ ...v, title: event.target.value }))} /></label><label>Message<input required maxLength="1000" value={announcement.message} onChange={(event) => setAnnouncement((v) => ({ ...v, message: event.target.value }))} /></label><button className="commerce-primary" type="submit" disabled={send.isPending}>Send announcement</button></form>}
    <ErrorBanner error={submitError(send, 'Unable to queue announcement')} /><LoadingState query={query} label="notifications" />
    {query.data?.notifications?.length > 0 && <><button className="commerce-secondary commerce-fit" type="button" disabled={markAll.isPending} onClick={() => markAll.mutate()}>Mark all read</button><div className="commerce-notification-list">{query.data.notifications.map((notification) => <article key={notification._id} className={`commerce-notification ${notification.readAt ? '' : 'is-unread'}`}><div><span className="commerce-job-order">{new Date(notification.createdAt).toLocaleString()}</span><h2>{notification.title}</h2><p>{notification.message}</p></div>{!notification.readAt && <button className="commerce-link-button" type="button" disabled={markRead.isPending} onClick={() => markRead.mutate(notification._id)}>Mark read</button>}</article>)}</div></>}
  </main>;
}

export function ReportsPage() {
  const user = useAuthStore((state) => state.user);
  const [period, setPeriod] = useState(30);
  const to = new Date();
  const from = new Date(to.valueOf() - (period - 1) * 86400000);
  const params = useMemo(() => ({ from: from.toISOString(), to: to.toISOString() }), [period]);
  const financial = useQuery({ queryKey: ['report-financial', shopKey(user), params], queryFn: async () => (await reportsAPI.financial(params)).data.report });
  const production = useQuery({ queryKey: ['report-production', shopKey(user)], queryFn: async () => (await reportsAPI.production()).data.report });
  const report = financial.data;
  return <main className="commerce-page">
    <header className="commerce-header"><div><p className="section-kicker">Business intelligence</p><h1>Reports</h1><p>Financial and production summaries for your shop.</p></div><label className="commerce-filter">Period<select value={period} onChange={(event) => setPeriod(Number(event.target.value))}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 12 months</option></select></label></header>
    <LoadingState query={financial} label="financial report" /><LoadingState query={production} label="production report" />
    {report && <><section className="commerce-metric-grid">{[['Orders', report.orders.count], ['Order value', money(report.orders.total)], ['Collected', money(report.payments.total)], ['Refunds', money(report.refunds.total)], ['Received purchases', money(report.purchases.total)]].map(([label, value]) => <article className="commerce-metric" key={label}><span>{label}</span><strong>{value}</strong></article>)}</section><section className="commerce-report-card"><h2>Expenses by category</h2>{report.expenses.length ? <div className="commerce-table-wrap"><table className="commerce-table"><thead><tr><th>Category</th><th>Transactions</th><th>Total</th></tr></thead><tbody>{report.expenses.map((item) => <tr key={item._id}><td>{item._id}</td><td>{item.count}</td><td>{money(item.total)}</td></tr>)}</tbody></table></div> : <p>No expenses in this date range.</p>}</section></>}
    {production.data && <section className="commerce-report-card"><h2>Production workload</h2><p>Overdue jobs: <strong>{production.data.overdue}</strong></p><div className="commerce-chip-list">{production.data.stages.map((stage) => <span className="commerce-badge" key={stage._id}>{stage._id}: {stage.count}</span>)}</div></section>}
  </main>;
}

export function AnalyticsPage() {
  const user = useAuthStore((state) => state.user);
  const query = useQuery({ queryKey: ['analytics-overview', shopKey(user)], queryFn: async () => (await analyticsAPI.overview()).data.analytics });
  const data = query.data;
  return <main className="commerce-page">
    {pageHeader('At a glance', 'Analytics', 'Recent revenue, orders, expenses, and workshop load.')}
    <LoadingState query={query} label="analytics" />
    {data && <><section className="commerce-metric-grid">{[['Payments received', money(data.paid)], ['Expenses · 30 days', money(data.expenses30d)], ['Orders tracked', data.orders.reduce((sum, row) => sum + row.count, 0)], ['Open production jobs', data.openProduction.reduce((sum, row) => sum + row.count, 0)]].map(([label, value]) => <article className="commerce-metric" key={label}><span>{label}</span><strong>{value}</strong></article>)}</section><div className="commerce-report-grid"><section className="commerce-report-card"><h2>Orders by status</h2>{data.orders.map((row) => <p key={row._id}>{row._id}: <strong>{row.count}</strong> · {money(row.revenue)}</p>)}</section><section className="commerce-report-card"><h2>Orders · 30-day trend</h2>{data.orderTrend30d.map((row) => <p className="commerce-trend-row" key={row._id}><span>{row._id}</span><span>{row.count} orders</span><strong>{money(row.sales)}</strong></p>)}</section><section className="commerce-report-card"><h2>Production stages</h2><div className="commerce-chip-list">{data.openProduction.map((row) => <span className="commerce-badge" key={row._id}>{row._id}: {row.count}</span>)}</div></section></div></>}
  </main>;
}

export function AuditLogsPage() {
  const user = useAuthStore((state) => state.user);
  const [resource, setResource] = useState('');
  const query = useQuery({ queryKey: ['audit-logs', shopKey(user), resource], queryFn: async () => (await auditLogsAPI.list({ page: 1, limit: 100, ...(resource ? { resource } : {}) })).data });
  return <main className="commerce-page">
    <header className="commerce-header"><div><p className="section-kicker">Administration</p><h1>Audit logs</h1><p>Immutable records of API write actions, actor and result.</p></div><label className="commerce-filter">Resource<input value={resource} onChange={(event) => setResource(event.target.value)} placeholder="Filter by resource" /></label></header>
    <LoadingState query={query} label="audit logs" />
    {query.data?.logs?.length > 0 && <div className="commerce-table-wrap"><table className="commerce-table"><thead><tr><th>Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Resource ID</th><th>Result</th><th>Request</th></tr></thead><tbody>{query.data.logs.map((log) => <tr key={log._id}><td>{new Date(log.occurredAt).toLocaleString()}</td><td>{log.actorId?.name || log.actorId?.email || '—'}</td><td>{log.actorRole || '—'}</td><td>{log.action}</td><td>{log.resourceId || '—'}</td><td>{log.statusCode}</td><td>{log.requestId || '—'}</td></tr>)}</tbody></table></div>}
  </main>;
}

export function PortalAccountsPage() {
  const user = useAuthStore((state) => state.user);
  const cache = useQueryClient();
  const [customerId, setCustomerId] = useState('');
  const [password, setPassword] = useState('');
  const customers = useQuery({ queryKey: ['portal-customers', shopKey(user)], queryFn: async () => getData(await customersAPI.list({ page: 1, limit: 100 }), 'customers') });
  const accounts = useQuery({ queryKey: ['portal-accounts', shopKey(user)], queryFn: async () => (await customerPortalAPI.accounts()).data.accounts });
  const create = useMutation({ mutationFn: () => customerPortalAPI.createAccount({ customerId, password }), onSuccess: async () => { setCustomerId(''); setPassword(''); await cache.invalidateQueries({ queryKey: ['portal-accounts'] }); } });
  const update = useMutation({ mutationFn: ({ id, status }) => customerPortalAPI.updateAccount(id, { status }), onSuccess: () => cache.invalidateQueries({ queryKey: ['portal-accounts'] }) });
  return <main className="commerce-page">
    {pageHeader('Customer access', 'Portal accounts', 'Create or disable secure customer portal access. Share the portal URL and temporary password directly with the customer.')}
    <ErrorBanner error={submitError(create, 'Unable to create portal account')} /><ErrorBanner error={submitError(update, 'Unable to update portal account')} />
    <form className="commerce-form commerce-inline-create" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
      <label>Customer<select required value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Select customer with email</option>{(customers.data || []).filter((customer) => customer.email && customer.status === 'ACTIVE').map((customer) => <option value={customer._id} key={customer._id}>{fullName(customer)} · {customer.email}</option>)}</select></label>
      <label>Temporary password<input required type="password" minLength="12" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <button type="submit" className="commerce-primary" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create portal account'}</button>
    </form>
    <LoadingState query={accounts} label="portal accounts" />
    {accounts.data?.length > 0 && <div className="commerce-table-wrap"><table className="commerce-table"><thead><tr><th>Customer</th><th>Email</th><th>Status</th><th>Created</th><th>Action</th></tr></thead><tbody>{accounts.data.map((account) => <tr key={account._id}><td>{fullName(account.customerId)}</td><td>{account.email}</td><td>{account.status}</td><td>{new Date(account.createdAt).toLocaleDateString()}</td><td><button className="commerce-link-button" type="button" onClick={() => update.mutate({ id: account._id, status: account.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}>{account.status === 'ACTIVE' ? 'Disable' : 'Enable'}</button></td></tr>)}</tbody></table></div>}
  </main>;
}
