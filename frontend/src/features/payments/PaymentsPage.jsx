import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Can from '../auth/Can';
import { hasPermission } from '../auth/permissions';
import { useAuthStore } from '../auth/auth.store';
import { getApiError } from '../auth/auth.api';
import { paymentsAPI } from '../../services/api';
import '../../styles/commerce.css';

const money = (amount) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount || 0);
const customerName = (customer) => customer?.name
  || [customer?.firstName, customer?.lastName].filter(Boolean).join(' ')
  || 'Customer';

export default function PaymentsPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const canView = hasPermission(user, 'payments.view');
  const canCreate = hasPermission(user, 'payments.create');
  const canUpdate = hasPermission(user, 'payments.update');
  const canDelete = hasPermission(user, 'payments.delete');
  const [page, setPage] = useState(1);
  const [refundFor, setRefundFor] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [editFor, setEditFor] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const paymentsQuery = useQuery({
    queryKey: ['payments', localStorage.getItem('activeShopId') || user?.shopId, page],
    queryFn: async () => (await paymentsAPI.list({ page, limit: 20 })).data,
    enabled: canView,
  });
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['payments'] }),
    queryClient.invalidateQueries({ queryKey: ['orders'] }),
    queryClient.invalidateQueries({ queryKey: ['payment-orders'] }),
  ]);
  const refundMutation = useMutation({
    mutationFn: ({ id, amount }) => paymentsAPI.refund(id, { amount: Number(amount) }),
    onSuccess: async (response) => {
      setError('');
      setMessage(`Refund ${response.data.payment.receiptNumber} recorded.`);
      setRefundFor('');
      setRefundAmount('');
      await refresh();
    },
    onError: (requestError) => setError(getApiError(requestError, 'Unable to record refund')),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, changes }) => paymentsAPI.update(id, changes),
    onSuccess: async () => {
      setError('');
      setMessage('Payment notes updated.');
      setEditFor('');
      await refresh();
    },
    onError: (requestError) => setError(getApiError(requestError, 'Unable to update payment details')),
  });
  const voidMutation = useMutation({
    mutationFn: (id) => paymentsAPI.void(id),
    onSuccess: async () => {
      setError('');
      setMessage('Payment voided. The order balance has been recalculated.');
      await refresh();
    },
    onError: (requestError) => setError(getApiError(requestError, 'Unable to void payment')),
  });
  const data = paymentsQuery.data;
  const payments = data?.payments || [];
  const pagination = data?.pagination;

  const refund = (event, payment) => {
    event.preventDefault();
    setError('');
    refundMutation.mutate({ id: payment._id, amount: refundAmount });
  };

  const updateDetails = (event, payment) => {
    event.preventDefault();
    setError('');
    updateMutation.mutate({
      id: payment._id,
      changes: { reference: reference.trim(), notes: notes.trim() },
    });
  };

  const voidPayment = (payment) => {
    if (!window.confirm(`Void receipt ${payment.receiptNumber}? The payment record will be retained.`)) return;
    setError('');
    voidMutation.mutate(payment._id);
  };

  if (!canView) {
    return <main className="commerce-page"><div className="commerce-alert" role="alert">You do not have permission to view payments.</div></main>;
  }

  return (
    <main className="commerce-page">
      <header className="commerce-header">
        <div><p className="section-kicker">Finance</p><h1>Payments</h1><p>Record collections, issue refunds, and print receipts.</p></div>
        <Can permission="payments.create"><Link className="commerce-primary" to="/payments/new">Record payment</Link></Can>
      </header>

      {message && <div className="commerce-success" role="status">{message}</div>}
      {error && <div className="commerce-alert" role="alert">{error}</div>}
      {paymentsQuery.isPending && <div className="commerce-state" role="status">Loading payment ledger…</div>}
      {paymentsQuery.isError && (
        <div className="commerce-state commerce-state-error" role="alert">
          <p>{getApiError(paymentsQuery.error, 'Unable to load payment ledger')}</p>
          <button type="button" onClick={() => paymentsQuery.refetch()}>Try again</button>
        </div>
      )}
      {paymentsQuery.isSuccess && payments.length === 0 && (
        <div className="commerce-state"><h2>No payment records yet</h2><p>Payments and refunds recorded for your orders will appear here.</p></div>
      )}
      {payments.length > 0 && (
        <>
          <div className="commerce-table-wrap">
            <table className="commerce-table">
              <thead><tr><th>Receipt</th><th>Type</th><th>Order</th><th>Customer</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {payments.map((payment) => {
                  const refundable = payment.type === 'PAYMENT' && payment.status === 'POSTED'
                    ? Math.max(0, payment.amount - payment.refundedAmount)
                    : 0;
                  return (
                    <tr key={payment._id}>
                      <td><Link to={`/payments/${payment._id}`} className="commerce-link">{payment.receiptNumber}</Link></td>
                      <td><span className={`commerce-badge ${payment.type === 'REFUND' ? 'commerce-badge-refund' : ''}`}>{payment.type}</span></td>
                      <td>{payment.orderId?.orderNumber || '—'}</td>
                      <td>{customerName(payment.customerId)}</td>
                      <td className={payment.type === 'REFUND' ? 'commerce-negative' : ''}>{payment.type === 'REFUND' ? '−' : ''}{money(payment.amount)}</td>
                      <td>{payment.method.replaceAll('_', ' ')}</td>
                      <td><span className={`commerce-badge commerce-badge-${payment.status.toLowerCase()}`}>{payment.status}</span></td>
                      <td>{new Date(payment.paidAt).toLocaleDateString()}</td>
                      <td>
                        <div className="commerce-actions">
                          <Link to={`/payments/${payment._id}`} className="commerce-link">Receipt</Link>
                          {canCreate && refundable > 0 && (
                            <button type="button" className="commerce-link-button" onClick={() => { setRefundFor(refundFor === payment._id ? '' : payment._id); setRefundAmount(refundable.toFixed(2)); }}>
                              Refund
                            </button>
                          )}
                          {canUpdate && payment.type === 'PAYMENT' && payment.status === 'POSTED' && (
                            <button type="button" className="commerce-link-button" onClick={() => {
                              setEditFor(editFor === payment._id ? '' : payment._id);
                              setReference(payment.reference || '');
                              setNotes(payment.notes || '');
                            }}>
                              Edit details
                            </button>
                          )}
                          {canDelete && payment.type === 'PAYMENT' && payment.status === 'POSTED' && payment.refundedAmount === 0 && (
                            <button type="button" className="commerce-link-button commerce-danger-link" disabled={voidMutation.isPending} onClick={() => voidPayment(payment)}>Void</button>
                          )}
                        </div>
                        {refundFor === payment._id && (
                          <form className="commerce-inline-form" onSubmit={(event) => refund(event, payment)}>
                            <label>Refund amount
                              <input
                                type="number"
                                min="0.01"
                                max={refundable}
                                step="0.01"
                                required
                                value={refundAmount}
                                onChange={(event) => setRefundAmount(event.target.value)}
                              />
                            </label>
                            <button type="submit" className="commerce-primary" disabled={refundMutation.isPending}>
                              {refundMutation.isPending ? 'Saving…' : 'Confirm refund'}
                            </button>
                          </form>
                        )}
                        {editFor === payment._id && (
                          <form className="commerce-inline-form commerce-payment-edit" onSubmit={(event) => updateDetails(event, payment)}>
                            <label>Reference
                              <input maxLength="120" value={reference} onChange={(event) => setReference(event.target.value)} />
                            </label>
                            <label>Notes
                              <input maxLength="1000" value={notes} onChange={(event) => setNotes(event.target.value)} />
                            </label>
                            <button type="submit" className="commerce-primary" disabled={updateMutation.isPending}>
                              {updateMutation.isPending ? 'Saving…' : 'Save details'}
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <nav className="commerce-pagination" aria-label="Payment pages">
            <span>{pagination.total} records · Page {pagination.page} of {Math.max(1, pagination.totalPages)}</span>
            <div>
              <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>Previous</button>
              <button type="button" onClick={() => setPage((value) => value + 1)} disabled={page >= pagination.totalPages}>Next</button>
            </div>
          </nav>
        </>
      )}
    </main>
  );
}
