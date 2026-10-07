import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customersAPI, measurementTemplatesAPI } from '../../services/api';
import { getApiError } from '../auth/auth.api';
import Can from '../auth/Can';
import { hasPermission } from '../auth/permissions';
import { useAuthStore } from '../auth/auth.store';
import CustomerDetails from './CustomerDetails';
import { customerKeys, useCustomer, useDeleteCustomer } from './customers.hooks';
import '../../styles/customer.css';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canViewCustomer = hasPermission(user, 'customers.view');
  const customerQuery = useCustomer(id, canViewCustomer);
  const canViewMeasurements = hasPermission(user, 'measurements.view');
  const canCreateMeasurements = hasPermission(user, 'measurements.create');
  const deleteMutation = useDeleteCustomer();
  const [templateId, setTemplateId] = useState('');
  const [values, setValues] = useState({});
  const [measurementError, setMeasurementError] = useState('');

  useEffect(() => {
    if (customerQuery.data) {
      setTemplateId(customerQuery.data.measurementTemplateId || '');
      setValues(customerQuery.data.measurements || {});
    }
  }, [customerQuery.data]);

  const templatesQuery = useQuery({
    queryKey: ['measurement-templates'],
    queryFn: async () => (await measurementTemplatesAPI.list()).data.data.templates,
    enabled: canViewMeasurements,
  });
  const profilesQuery = useQuery({
    queryKey: ['customer-measurements', id],
    queryFn: async () => (await customersAPI.measurementHistory(id)).data.data.profiles,
    enabled: canViewMeasurements && Boolean(customerQuery.data),
  });
  const measurementMutation = useMutation({
    mutationFn: ({ selectedTemplateId, measurementValues }) => (
      customersAPI.updateMeasurements(id, selectedTemplateId, measurementValues)
    ),
    onSuccess: (response) => {
      queryClient.setQueryData(customerKeys.detail(id), response.data.data.customer);
      queryClient.invalidateQueries({ queryKey: ['customer-measurements', id] });
      setMeasurementError('');
    },
    onError: (error) => setMeasurementError(getApiError(error, 'Unable to save measurements')),
  });
  const customer = customerQuery.data;
  const templates = templatesQuery.data || [];
  const profiles = profilesQuery.data || [];
  const selectedTemplateId = templateId || customer?.measurementTemplateId || templates[0]?._id || '';
  const template = templates.find((item) => item._id === selectedTemplateId);

  const saveMeasurements = (event) => {
    event.preventDefault();
    measurementMutation.mutate({ selectedTemplateId, measurementValues: values });
  };

  const deactivateCustomer = async () => {
    if (!window.confirm('Deactivate this customer? Historical records will be retained.')) return;
    try {
      await deleteMutation.mutateAsync(id);
      navigate('/customers');
    } catch (error) {
      setMeasurementError(getApiError(error, 'Unable to deactivate customer'));
    }
  };

  if (!canViewCustomer) {
    return <main className="customer-page"><div className="customer-alert" role="alert">You do not have permission to view customers.</div></main>;
  }
  if (customerQuery.isPending) {
    return <main className="customer-page"><p role="status">Loading customer…</p></main>;
  }
  if (customerQuery.isError) {
    return (
      <main className="customer-page">
        <div className="customer-alert" role="alert">{getApiError(customerQuery.error, 'Unable to load customer')}</div>
        <button type="button" onClick={() => customerQuery.refetch()}>Try again</button>
      </main>
    );
  }
  if (!customer) return <main className="customer-page"><div className="customer-alert" role="alert">Customer not found.</div></main>;

  return (
    <main className="customer-page">
      <header className="customer-page-header">
        <div>
          <Link to="/customers" className="back-link">Customers</Link>
          <h1>{customer.name || `${customer.firstName} ${customer.lastName}`}</h1>
          <p className="customer-meta">{customer.customerNumber} · {customer.status}</p>
        </div>
        <div className="form-actions">
          <Can permission="customers.update">
            <Link className="btn btn-small" to={`/customers/${id}/edit`}>Edit profile</Link>
          </Can>
          <Can permission="customers.delete">
            <button
              className="btn btn-small btn-danger"
              type="button"
              onClick={deactivateCustomer}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deactivating…' : 'Deactivate'}
            </button>
          </Can>
        </div>
      </header>

      {location.state?.message && <div className="customer-success" role="status">{location.state.message}</div>}
      {measurementError && <div className="customer-alert" role="alert">{measurementError}</div>}
      <CustomerDetails customer={customer} />

      <Can permission="measurements.view">
        <section className="measurement-panel">
          <div className="section-heading">
            <div><p className="section-kicker">Measurements</p><h2>Fit profile history</h2></div>
          </div>
          {templatesQuery.isPending && <p role="status">Loading measurement templates…</p>}
          {templatesQuery.isError && <div className="customer-alert" role="alert">{getApiError(templatesQuery.error, 'Unable to load measurement templates')}</div>}
          {profilesQuery.isError && <div className="customer-alert" role="alert">{getApiError(profilesQuery.error, 'Unable to load measurement history')}</div>}
          {templatesQuery.isSuccess && templates.length === 0 && <p className="empty-copy">No measurement templates are available yet.</p>}
          {templates.length > 0 && (
            <Can permission="measurements.create">
              <form onSubmit={saveMeasurements}>
                <div className="measurement-toolbar">
                  <label>
                    <span className="sr-only">Measurement template</span>
                    <select value={selectedTemplateId} onChange={(event) => setTemplateId(event.target.value)}>
                      {templates.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
                    </select>
                  </label>
                  <button className="btn btn-primary" disabled={measurementMutation.isPending || !template}>
                    {measurementMutation.isPending ? 'Saving version…' : 'Save new version'}
                  </button>
                </div>
                {template && (
                  <div className="measurement-grid">
                    {template.fields.map((field) => (
                      <label key={field.key}>
                        {field.label}{field.unit ? ` (${field.unit})` : ''}
                        {field.type === 'select' ? (
                          <select value={values[field.key] || ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} required={field.required}>
                            <option value="">Select</option>
                            {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        ) : field.type === 'boolean' ? (
                          <input type="checkbox" checked={Boolean(values[field.key])} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.checked }))} />
                        ) : (
                          <input
                            type={field.type === 'number' ? 'number' : 'text'}
                            value={values[field.key] ?? ''}
                            onChange={(event) => setValues((current) => ({ ...current, [field.key]: field.type === 'number' ? Number(event.target.value) : event.target.value }))}
                            required={field.required}
                          />
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </form>
            </Can>
          )}
          {profilesQuery.isSuccess && profiles.length === 0 && <p className="empty-copy">No measurements yet.</p>}
          {profiles.length > 0 && (
            <div className="profile-history">
              <p className="section-kicker">History</p>
              {profiles.map((profile) => (
                <div className="profile-row" key={profile._id}>
                  <span>Version {profile.version}</span>
                  <span>{profile.templateId?.name || 'Template'}</span>
                  <span>{new Date(profile.createdAt).toLocaleDateString()}</span>
                  {profile.isCurrent && <strong>Current</strong>}
                </div>
              ))}
            </div>
          )}
        </section>
      </Can>
    </main>
  );
}
