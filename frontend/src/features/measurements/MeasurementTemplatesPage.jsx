import { useEffect, useState } from 'react';
import { measurementTemplatesAPI } from '../../services/api';
import { getApiError } from '../auth/auth.api';
import '../../styles/customer.css';

const blankField = () => ({ key: '', label: '', type: 'number', unit: '', required: false, options: [] });

export default function MeasurementTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [name, setName] = useState('');
  const [fields, setFields] = useState([blankField()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => measurementTemplatesAPI.list().then((response) => setTemplates(response.data.data.templates)).catch((requestError) => setError(getApiError(requestError, 'Unable to load templates')));
  useEffect(() => { load(); }, []);
  const updateField = (index, key, value) => setFields((current) => current.map((field, fieldIndex) => fieldIndex === index ? { ...field, [key]: value } : field));
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try { await measurementTemplatesAPI.create({ name, fields: fields.map((field) => ({ ...field, options: field.optionsText ? field.optionsText.split(',').map((item) => item.trim()).filter(Boolean) : [] })) }); setName(''); setFields([blankField()]); load(); }
    catch (requestError) { setError(getApiError(requestError, 'Unable to create template')); }
    finally { setSaving(false); }
  };
  const archive = async (id) => { await measurementTemplatesAPI.delete(id); load(); };

  return <div className="customer-page"><div className="customer-page-header"><div><p className="section-kicker">Configuration</p><h1>Measurement templates</h1><p className="customer-meta">Build reusable fit profiles for every garment family.</p></div></div>
    {error && <div className="customer-alert">{error}</div>}
    <div className="template-layout"><form className="customer-form" onSubmit={submit}><h2>New template</h2><label>Template name<input value={name} onChange={(event) => setName(event.target.value)} required /></label>{fields.map((field, index) => <div className="template-field" key={index}><div className="template-field-heading"><strong>Field {index + 1}</strong>{fields.length > 1 && <button type="button" className="text-button" onClick={() => setFields((current) => current.filter((_, fieldIndex) => fieldIndex !== index))}>Remove</button>}</div><div className="customer-form-grid"><label>Key<input value={field.key} onChange={(event) => updateField(index, 'key', event.target.value)} placeholder="chest" required /></label><label>Label<input value={field.label} onChange={(event) => updateField(index, 'label', event.target.value)} placeholder="Chest" required /></label><label>Type<select value={field.type} onChange={(event) => updateField(index, 'type', event.target.value)}><option value="number">Number</option><option value="text">Text</option><option value="select">Select</option><option value="boolean">Boolean</option></select></label><label>Unit<input value={field.unit} onChange={(event) => updateField(index, 'unit', event.target.value)} placeholder="inch" /></label>{field.type === 'select' && <label className="field-wide">Options <span className="field-hint">Comma separated</span><input value={field.optionsText || ''} onChange={(event) => updateField(index, 'optionsText', event.target.value)} required /></label>}<label className="checkbox-label"><input type="checkbox" checked={field.required} onChange={(event) => updateField(index, 'required', event.target.checked)} /> Required</label></div></div>)}<div className="form-actions"><button type="button" className="btn btn-small" onClick={() => setFields((current) => [...current, blankField()])}>Add field</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create template'}</button></div></form><section className="template-list"><h2>Active templates</h2>{templates.length === 0 ? <p className="empty-copy">No templates yet.</p> : templates.map((template) => <article className="template-card" key={template._id}><div><strong>{template.name}</strong><span>{template.fields.length} fields</span></div><button className="text-button" onClick={() => archive(template._id)}>Archive</button></article>)}</section></div>
  </div>;
}
