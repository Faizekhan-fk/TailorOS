import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { whatsappAPI } from '../../services/api';
import { getApiError } from '../auth/auth.api';
import { useAuthStore } from '../auth/auth.store';
import '../../styles/commerce.css';

export default function WhatsAppPage() {
  const user = useAuthStore((state) => state.user);
  const cache = useQueryClient();
  const [customerId, setCustomerId] = useState('');
  const [consentSource, setConsentSource] = useState('');
  const [optedIn, setOptedIn] = useState(true);
  const [orderId, setOrderId] = useState('');
  const [parameters, setParameters] = useState('');
  const shopId = localStorage.getItem('activeShopId') || user?.shopId;
  const status = useQuery({ queryKey: ['whatsapp-status', shopId], queryFn: async () => (await whatsappAPI.status()).data });
  const messages = useQuery({ queryKey: ['whatsapp-messages', shopId], queryFn: async () => (await whatsappAPI.messages({ limit: 50 })).data });
  const consent = useMutation({
    mutationFn: () => whatsappAPI.consent(customerId, { optedIn, source: consentSource }),
    onSuccess: async () => {
      setConsentSource('');
      await cache.invalidateQueries({ queryKey: ['whatsapp-messages'] });
    },
  });
  const send = useMutation({
    mutationFn: () => whatsappAPI.send({
      customerId,
      ...(orderId ? { orderId } : {}),
      parameters: parameters.split('\n').map((value) => value.trim()).filter(Boolean),
    }),
    onSuccess: async () => {
      setParameters('');
      await cache.invalidateQueries({ queryKey: ['whatsapp-messages'] });
    },
  });
  const apiError = consent.error || send.error;

  return <main className="commerce-page">
    <header className="commerce-header"><div><p className="section-kicker">Customer messaging</p><h1>WhatsApp</h1><p>Record customer consent and send approved transactional order-update templates.</p></div></header>
    {apiError && <div className="commerce-alert" role="alert">{getApiError(apiError, 'WhatsApp request failed')}</div>}
    {status.isError && <div className="commerce-alert" role="alert">{getApiError(status.error, 'Unable to load WhatsApp status')}</div>}
    <section className="commerce-summary" aria-label="WhatsApp setup">
      <h2>Provider setup</h2>
      <p>{status.data?.configured ? 'Meta WhatsApp Cloud API is configured.' : 'Not configured. Add the Meta Cloud API credentials and approved template name to the backend environment.'}</p>
      <p>Approved template: <strong>{status.data?.template || 'Not configured'}</strong></p>
      <p>Outbound messages are queued and delivery state is updated from verified provider webhooks. Customer consent is required.</p>
    </section>
    <section className="commerce-form commerce-wide-form">
      <h2>Customer consent</h2>
      <label>Customer ID for consent<input required value={customerId} onChange={(event) => setCustomerId(event.target.value)} autoComplete="off" /></label>
      <label>Consent state<select value={String(optedIn)} onChange={(event) => setOptedIn(event.target.value === 'true')}><option value="true">Opted in</option><option value="false">Revoke consent</option></select></label>
      <label>Consent source<input required minLength="3" maxLength="120" placeholder="e.g. signed consent form" value={consentSource} onChange={(event) => setConsentSource(event.target.value)} /></label>
      <button className="commerce-primary commerce-fit" type="button" disabled={!customerId || !consentSource.trim() || consent.isPending} onClick={() => consent.mutate()}>{consent.isPending ? 'Saving…' : 'Save consent'}</button>
    </section>
    <section className="commerce-form commerce-wide-form">
      <h2>Send order update</h2>
      <p>Use only an approved Meta template. Enter one template body parameter per line in the template’s configured order.</p>
      <label>Customer ID for message<input required value={customerId} onChange={(event) => setCustomerId(event.target.value)} autoComplete="off" /></label>
      <label>Order ID (optional)<input value={orderId} onChange={(event) => setOrderId(event.target.value)} autoComplete="off" /></label>
      <label>Template parameters<textarea rows="3" maxLength="2560" value={parameters} onChange={(event) => setParameters(event.target.value)} placeholder={'Order number\nStatus'} /></label>
      <button className="commerce-primary commerce-fit" type="button" disabled={!customerId || !status.data?.configured || send.isPending} onClick={() => send.mutate()}>{send.isPending ? 'Queueing…' : 'Queue WhatsApp update'}</button>
    </section>
    <h2>Recent delivery attempts</h2>
    {messages.isPending && <p role="status">Loading messages…</p>}
    {messages.isError && <div className="commerce-alert" role="alert">{getApiError(messages.error, 'Unable to load WhatsApp messages')}</div>}
    {messages.data?.messages?.length > 0 && <div className="commerce-table-wrap"><table className="commerce-table"><thead><tr><th>Customer</th><th>Recipient</th><th>Template</th><th>Status</th><th>Created</th></tr></thead><tbody>
      {messages.data.messages.map((message) => <tr key={message._id}><td>{message.customerId?.name || `${message.customerId?.firstName || ''} ${message.customerId?.lastName || ''}`.trim() || message.customerId?.customerNumber || 'Customer'}</td><td>{message.recipientMasked}</td><td>{message.templateName}</td><td><span className="commerce-badge">{message.status}</span></td><td>{new Date(message.createdAt).toLocaleString()}</td></tr>)}
    </tbody></table></div>}
    {messages.data?.messages?.length === 0 && <p>No WhatsApp messages yet.</p>}
  </main>;
}
