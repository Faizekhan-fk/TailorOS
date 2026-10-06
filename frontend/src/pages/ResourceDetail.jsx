import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getApiError } from '../features/auth/auth.api';
import '../styles/resource.css';

export default function ResourceDetail({ title, api, getItem, fields, listPath }) {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { getItem(id).then((response) => setItem(response.data.customer || response.data.garment || response.data.order || response.data.item || response.data.supplier || response.data.tailor)).catch((requestError) => setError(getApiError(requestError, 'Unable to load record'))); }, [id, getItem]);
  if (error) return <main className="resource-page"><div className="resource-alert">{error}</div></main>;
  if (!item) return <main className="resource-page"><p>Loading...</p></main>;
  return <main className="resource-page"><div className="resource-header"><div><Link to={listPath} className="back-link">Back to {title}</Link><h1>{item.name || item.orderNumber || `${item.firstName || ''} ${item.lastName || ''}`.trim() || title.slice(0, -1)}</h1></div></div><section className="detail-grid">{fields.map((field) => <div className="detail-card" key={field.name}><span>{field.label}</span><strong>{String(item[field.name] ?? 'Not provided')}</strong></div>)}</section></main>;
}
