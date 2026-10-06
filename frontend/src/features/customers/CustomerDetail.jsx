import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { customersAPI, measurementTemplatesAPI } from '../../services/api';
import { getApiError } from '../auth/auth.api';
import CustomerForm from './CustomerForm';
import '../../styles/customer.css';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [values, setValues] = useState({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([customersAPI.getById(id), measurementTemplatesAPI.list(), customersAPI.measurementHistory(id)]).then(([customerResponse, templateResponse, profileResponse]) => {
      const loadedCustomer = customerResponse.data.customer;
      setCustomer(loadedCustomer);
      setTemplates(templateResponse.data.data.templates);
      setProfiles(profileResponse.data.data.profiles);
      setTemplateId(loadedCustomer.measurementTemplateId || templateResponse.data.data.templates[0]?._id || '');
      setValues(loadedCustomer.measurements || {});
    }).catch((requestError) => setError(getApiError(requestError, 'Unable to load customer'))).finally(() => setLoading(false));
  }, [id]);

  const template = templates.find((item) => item._id === templateId);
  const setValue = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const saveMeasurements = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try { const response = await customersAPI.updateMeasurements(id, templateId, values); setCustomer(response.data.data.customer); setProfiles((current) => [response.data.data.profile, ...current]); }
    catch (requestError) { setError(getApiError(requestError, 'Unable to save measurements')); }
    finally { setSaving(false); }
  };
  const deleteCustomer = async () => {
    if (!window.confirm('Deactivate this customer?')) return;
    await customersAPI.delete(id); navigate('/customers');
  };

  if (loading) return <div className="customer-page"><p>Loading customer...</p></div>;
  if (!customer) return <div className="customer-page"><div className="customer-alert">{error || 'Customer not found'}</div></div>;

  return (
    <div className="customer-page">
      <div className="customer-page-header"><div><Link to="/customers" className="back-link">Customers</Link><h1>{customer.name || `${customer.firstName} ${customer.lastName}`}</h1><p className="customer-meta">{customer.customerNumber} · {customer.status}</p></div><div className="form-actions"><button className="btn btn-small" onClick={() => setEditing((value) => !value)}>{editing ? 'Close edit' : 'Edit profile'}</button><button className="btn btn-small btn-danger" onClick={deleteCustomer}>Deactivate</button></div></div>
      {error && <div className="customer-alert">{error}</div>}
      {editing ? <CustomerForm customer={customer} /> : <>
        <section className="customer-summary"><div><span>Phone</span><strong>{customer.phone}</strong></div><div><span>Email</span><strong>{customer.email || 'Not provided'}</strong></div><div><span>WhatsApp</span><strong>{customer.whatsapp || 'Not provided'}</strong></div><div><span>Tags</span><strong>{customer.tags?.join(', ') || 'None'}</strong></div></section>
        <section className="measurement-panel"><div className="section-heading"><div><p className="section-kicker">Measurements</p><h2>Current fit profile</h2></div></div>
          {templates.length === 0 ? <p className="empty-copy">Create a measurement template before recording a fit profile.</p> : <form onSubmit={saveMeasurements}><div className="measurement-toolbar"><select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>{templates.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving version...' : 'Save new version'}</button></div>{template && <div className="measurement-grid">{template.fields.map((field) => <label key={field.key}>{field.label}{field.unit ? ` (${field.unit})` : ''}{field.type === 'select' ? <select value={values[field.key] || ''} onChange={(event) => setValue(field.key, event.target.value)} required={field.required}><option value="">Select</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : field.type === 'boolean' ? <input type="checkbox" checked={Boolean(values[field.key])} onChange={(event) => setValue(field.key, event.target.checked)} /> : <input type={field.type === 'number' ? 'number' : 'text'} value={values[field.key] ?? ''} onChange={(event) => setValue(field.key, field.type === 'number' ? Number(event.target.value) : event.target.value)} required={field.required} />}</label>)}</div>}</form>}
          {profiles.length > 0 && <div className="profile-history"><p className="section-kicker">History</p>{profiles.map((profile) => <div className="profile-row" key={profile._id}><span>Version {profile.version}</span><span>{profile.templateId?.name || 'Template'}</span><span>{new Date(profile.createdAt).toLocaleDateString()}</span>{profile.isCurrent && <strong>Current</strong>}</div>)}</div>}
        </section>
      </>}
    </div>
  );
}
