import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { customersAPI } from '../../services/api';
import { getApiError } from '../auth/auth.api';
import '../../styles/customer.css';

const customerSchema = z.object({
  name: z.string().trim().min(2, 'Enter the customer name'),
  phone: z.string().trim().min(3, 'Enter a phone number'),
  email: z.string().trim().email('Enter a valid email').or(z.literal('')),
  whatsapp: z.string().trim().max(30).optional(),
  gender: z.string().optional(),
  tags: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export default function CustomerForm({ customer }) {
  const [form, setForm] = useState({ name: customer?.name || [customer?.firstName, customer?.lastName].filter(Boolean).join(' '), phone: customer?.phone || '', email: customer?.email || '', whatsapp: customer?.whatsapp || '', gender: customer?.gender || '', tags: customer?.tags?.join(', ') || '', notes: customer?.notes || '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const parsed = customerSchema.safeParse(form);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setSaving(true); setError('');
    try {
      const payload = { ...parsed.data, tags: form.tags ? form.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [] };
      const [firstName, ...lastParts] = payload.name.trim().split(/\s+/);
      const customerPayload = { ...payload, firstName, lastName: lastParts.join(' ') || firstName };
      delete customerPayload.name;
      const response = customer ? await customersAPI.update(customer._id, customerPayload) : await customersAPI.create(customerPayload);
      navigate(`/customers/${response.data.customer._id}`);
    } catch (requestError) { setError(getApiError(requestError, 'Unable to save customer')); }
    finally { setSaving(false); }
  };

  return <div className="customer-page"><div className="customer-page-header"><div><Link to="/customers" className="back-link">Customers</Link><h1>{customer ? 'Edit customer' : 'New customer'}</h1></div></div><form className="customer-form" onSubmit={submit}>{error && <div className="customer-alert" role="alert">{error}</div>}<div className="customer-form-grid"><label>Full name<input value={form.name} onChange={update('name')} required /></label><label>Phone<input value={form.phone} onChange={update('phone')} required /></label><label>Email<input type="email" value={form.email} onChange={update('email')} /></label><label>WhatsApp<input value={form.whatsapp} onChange={update('whatsapp')} /></label><label>Gender<select value={form.gender} onChange={update('gender')}><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option></select></label><label>Tags <span className="field-hint">Comma separated</span><input value={form.tags} onChange={update('tags')} /></label><label className="field-wide">Notes<textarea value={form.notes} onChange={update('notes')} rows="5" /></label></div><div className="form-actions"><Link to="/customers" className="btn btn-small">Cancel</Link><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : customer ? 'Save changes' : 'Create customer'}</button></div></form></div>;
}
