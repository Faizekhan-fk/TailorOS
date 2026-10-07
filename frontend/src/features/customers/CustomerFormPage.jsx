import { Link, useNavigate, useParams } from 'react-router-dom';
import { getApiError } from '../auth/auth.api';
import { hasPermission } from '../auth/permissions';
import { useAuthStore } from '../auth/auth.store';
import { useCustomer } from './customers.hooks';
import CustomerForm from './CustomerForm';
import '../../styles/customer.css';

export default function CustomerFormPage({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const permission = mode === 'edit' ? 'customers.update' : 'customers.create';
  const allowed = hasPermission(user, permission);
  const canViewCustomer = hasPermission(user, 'customers.view');
  const customerQuery = useCustomer(mode === 'edit' ? id : null, allowed && canViewCustomer);

  if (!allowed) {
    return <main className="customer-page"><div className="customer-alert" role="alert">You do not have permission to {mode === 'edit' ? 'update' : 'create'} customers.</div></main>;
  }
  if (mode === 'edit' && !canViewCustomer) {
    return <main className="customer-page"><div className="customer-alert" role="alert">You need customers.view permission to load and edit this customer.</div></main>;
  }

  if (mode === 'edit' && customerQuery.isPending) {
    return <main className="customer-page"><p role="status">Loading customer…</p></main>;
  }

  if (mode === 'edit' && customerQuery.isError) {
    return (
      <main className="customer-page">
        <div className="customer-alert" role="alert">{getApiError(customerQuery.error, 'Unable to load customer')}</div>
        <Link to={`/customers/${id}`}>Back to customer</Link>
      </main>
    );
  }

  if (mode === 'edit' && !customerQuery.data) {
    return <main className="customer-page"><div className="customer-alert" role="alert">Customer not found.</div></main>;
  }

  return (
    <main className="customer-page">
      <div className="customer-page-header">
        <div>
          <Link to={mode === 'edit' ? `/customers/${id}` : '/customers'} className="back-link">
            {mode === 'edit' ? 'Customer details' : 'Customers'}
          </Link>
          <h1>{mode === 'edit' ? 'Edit customer' : 'New customer'}</h1>
        </div>
      </div>
      <CustomerForm
        customer={customerQuery.data}
        onCancel={() => navigate(mode === 'edit' ? `/customers/${id}` : '/customers')}
        onSaved={(savedCustomer) => navigate(`/customers/${savedCustomer._id}`, {
          state: { message: `Customer ${mode === 'edit' ? 'updated' : 'created'} successfully.` },
        })}
      />
    </main>
  );
}
