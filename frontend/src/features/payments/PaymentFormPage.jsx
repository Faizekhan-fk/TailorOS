import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersAPI, paymentsAPI } from '../../services/api';
import { getApiError } from '../auth/auth.api';
import { hasPermission } from '../auth/permissions';
import { useAuthStore } from '../auth/auth.store';
import '../../styles/commerce.css';

const balanceOf = (order) => Math.max(0, Number(order.totalAmount || 0) - Number(order.payment?.paidAmount || 0));

export default function PaymentFormPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const allowed = hasPermission(user, 'payments.create');
  const ordersQuery = useQuery({
    queryKey: ['payment-orders', localStorage.getItem('activeShopId') || user?.shopId],
    queryFn: async () => (await ordersAPI.list({ page: 1, limit: 100 })).data.orders,
    enabled: allowed,
  });
  const orders = ordersQuery.data || [];
  const selectedOrder = orders.find((order) => order._id === orderId);
  const mutation = useMutation({
    mutationFn: (data) => paymentsAPI.create(data),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
      await queryClient.invalidateQueries({ queryKey: ['payment-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigate(`/payments/${response.data.payment._id}`, { state: { message: 'Payment recorded successfully.' } });
    },
    onError: (requestError) => setError(getApiError(requestError, 'Unable to record payment')),
  });

  if (!allowed) return <main className="commerce-page"><div className="commerce-alert" role="alert">You do not have permission to record payments.</div></main>;

  const submit = (event) => {
    event.preventDefault();
    setError('');
    mutation.mutate({
      orderId,
      amount: Number(amount),
      method,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <main className="commerce-page commerce-form-page">
      <header className="commerce-header">
        <div><Link className="commerce-back" to="/payments">Payments</Link><h1>Record payment</h1><p>Payments cannot exceed the current order balance.</p></div>
      </header>
      {ordersQuery.isPending && <p className="commerce-state" role="status">Loading orders…</p>}
      {ordersQuery.isError && <div className="commerce-alert" role="alert">{getApiError(ordersQuery.error, 'Unable to load orders')}</div>}
      {error && <div className="commerce-alert" role="alert">{error}</div>}
      {ordersQuery.isSuccess && (
        <form className="commerce-form" onSubmit={submit}>
          <label>Order <span aria-hidden="true">*</span>
            <select value={orderId} onChange={(event) => { setOrderId(event.target.value); setAmount(''); }} required>
              <option value="">Select an order</option>
              {orders.map((order) => (
                <option key={order._id} value={order._id} disabled={order.status === 'cancelled' || balanceOf(order) <= 0}>
                  {order.orderNumber} · {order.customer?.name || [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ') || 'Customer'} · Balance {balanceOf(order).toFixed(2)}
                </option>
              ))}
            </select>
          </label>
          {selectedOrder && (
            <div className="commerce-order-summary">
              <span>Total <strong>{Number(selectedOrder.totalAmount).toFixed(2)}</strong></span>
              <span>Paid <strong>{Number(selectedOrder.payment?.paidAmount || 0).toFixed(2)}</strong></span>
              <span>Remaining <strong>{balanceOf(selectedOrder).toFixed(2)}</strong></span>
            </div>
          )}
          <label>Amount <span aria-hidden="true">*</span>
            <input type="number" min="0.01" max={selectedOrder ? balanceOf(selectedOrder) : undefined} step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} />
          </label>
          <label>Payment method <span aria-hidden="true">*</span>
            <select value={method} onChange={(event) => setMethod(event.target.value)} required>
              <option value="cash">Cash</option><option value="card">Card</option><option value="online">Online</option><option value="check">Check</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option>
            </select>
          </label>
          <label>Reference <span className="commerce-hint">Optional receipt / transaction reference</span>
            <input maxLength="120" value={reference} onChange={(event) => setReference(event.target.value)} />
          </label>
          <label>Notes
            <textarea maxLength="1000" rows="3" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <div className="commerce-form-actions">
            <Link className="commerce-secondary" to="/payments">Cancel</Link>
            <button className="commerce-primary" type="submit" disabled={mutation.isPending || !selectedOrder}>
              {mutation.isPending ? 'Recording…' : 'Record payment'}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
