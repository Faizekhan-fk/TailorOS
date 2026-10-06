import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getApiError } from '../features/auth/auth.api';
import '../styles/resource.css';

export default function ResourceForm({ title, api, fields, initialValues = {}, redirectPath }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((field) => [field.name, initialValues[field.name] ?? field.defaultValue ?? ''])));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const update = (name) => (event) => setValues((current) => ({ ...current, [name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const payload = {};
      fields.forEach((field) => {
        const value = values[field.name];
        if (value !== '' && value !== undefined) payload[field.name] = field.number ? Number(value) : value;
      });
      const response = await api.create(payload);
      navigate(`${redirectPath}/${response.data.customer?._id || response.data.garment?._id || response.data.order?._id || response.data.item?._id || response.data.supplier?._id || response.data.tailor?._id}`);
    } catch (requestError) { setError(getApiError(requestError, 'Unable to save record')); }
    finally { setSaving(false); }
  };

  return <main className="resource-page"><div className="resource-header"><div><Link to={redirectPath} className="back-link">Back to {title}</Link><h1>Add {title.slice(0, -1)}</h1></div></div><form className="resource-form" onSubmit={submit}>{error && <div className="resource-alert" role="alert">{error}</div>}<div className="resource-form-grid">{fields.map((field) => <label key={field.name}>{field.label}{field.type === 'select' ? <select value={values[field.name]} onChange={update(field.name)} required={field.required}><option value="">Select</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : field.type === 'textarea' ? <textarea value={values[field.name]} onChange={update(field.name)} rows="4" required={field.required} /> : <input type={field.type || 'text'} value={values[field.name]} onChange={update(field.name)} required={field.required} min={field.min} step={field.step} />}</label>)}</div><div className="form-actions"><Link to={redirectPath} className="btn btn-small">Cancel</Link><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create'}</button></div></form></main>;
}
