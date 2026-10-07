import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Can from '../auth/Can';
import { hasPermission } from '../auth/permissions';
import { useAuthStore } from '../auth/auth.store';
import { getApiError } from '../auth/auth.api';
import CustomerFilters from './CustomerFilters';
import CustomerTable from './CustomerTable';
import { useCustomers, useDeleteCustomer } from './customers.hooks';
import '../../styles/customers.css';

const validPage = (value) => {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

export default function CustomersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [actionError, setActionError] = useState('');
  const user = useAuthStore((state) => state.user);
  const page = validPage(searchParams.get('page'));
  const filters = useMemo(() => ({
    page,
    limit: 20,
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') || undefined,
    gender: searchParams.get('gender') || undefined,
    tag: searchParams.get('tag') || undefined,
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: searchParams.get('sortOrder') || 'desc',
  }), [page, searchParams]);
  const canView = hasPermission(user, 'customers.view');
  const customersQuery = useCustomers(filters, canView);
  const deleteMutation = useDeleteCustomer();
  const customers = customersQuery.data?.customers || [];
  const pagination = customersQuery.data?.pagination;

  useEffect(() => {
    setSearchInput(searchParams.get('search') || '');
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput !== (searchParams.get('search') || '')) {
        const next = new URLSearchParams(searchParams);
        if (searchInput.trim()) next.set('search', searchInput.trim());
        else next.delete('search');
        next.delete('page');
        setSearchParams(next, { replace: true });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, searchParams, setSearchParams]);

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (key !== 'search' && searchInput.trim()) next.set('search', searchInput.trim());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setSearchParams(next);
  };

  const updatePage = (nextPage) => {
    const next = new URLSearchParams(searchParams);
    if (nextPage > 1) next.set('page', String(nextPage));
    else next.delete('page');
    setSearchParams(next);
  };

  const deactivate = async (customer) => {
    if (!window.confirm(`Deactivate ${customer.name || customer.customerNumber}?`)) return;
    setActionError('');
    try {
      await deleteMutation.mutateAsync(customer._id);
    } catch (error) {
      setActionError(getApiError(error, 'Unable to deactivate customer'));
    }
  };

  return (
    <main className="customers-page">
      <header className="customers-header">
        <div>
          <p className="section-kicker">Workspace</p>
          <h1>Customers</h1>
          <p>Manage customer profiles and contact details for your shop.</p>
        </div>
        <Can permission="customers.create">
          <Link to="/customers/new" className="btn btn-primary">Add customer</Link>
        </Can>
      </header>

      {!canView ? (
        <div className="customers-state" role="alert">You do not have permission to view customers.</div>
      ) : (
        <>
          <CustomerFilters
            search={searchInput}
            status={searchParams.get('status') || ''}
            gender={searchParams.get('gender') || ''}
            tag={searchParams.get('tag') || ''}
            sortBy={searchParams.get('sortBy') || 'createdAt'}
            sortOrder={searchParams.get('sortOrder') || 'desc'}
            onChange={(key, value) => key === 'search' ? setSearchInput(value) : updateFilter(key, value)}
          />

          {actionError && <div className="customer-alert" role="alert">{actionError}</div>}
          {customersQuery.isPending && <div className="customers-state" role="status">Loading customers…</div>}
          {customersQuery.isError && (
            <div className="customers-state customers-state-error" role="alert">
              <p>{getApiError(customersQuery.error, 'Unable to load customers')}</p>
              <button type="button" onClick={() => customersQuery.refetch()}>Try again</button>
            </div>
          )}
          {customersQuery.isSuccess && customers.length === 0 && (
            <div className="customers-state">
              <h2>No customers found</h2>
              <p>Try a different search or filter, or add your first customer.</p>
              <Can permission="customers.create">
                <Link to="/customers/new" className="btn btn-primary">Add customer</Link>
              </Can>
            </div>
          )}
          {customers.length > 0 && (
            <>
              <CustomerTable
                customers={customers}
                onDelete={deactivate}
                deleting={deleteMutation.isPending}
              />
              <nav className="customers-pagination" aria-label="Customer pages">
                <span>{pagination.total} customer{pagination.total === 1 ? '' : 's'} · Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</span>
                <div>
                  <button type="button" onClick={() => updatePage(page - 1)} disabled={page <= 1}>Previous</button>
                  <button type="button" onClick={() => updatePage(page + 1)} disabled={!pagination.totalPages || page >= pagination.totalPages}>Next</button>
                </div>
              </nav>
            </>
          )}
        </>
      )}
    </main>
  );
}
