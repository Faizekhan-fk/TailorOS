import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import Can from '../auth/Can';
import { getApiError } from '../auth/auth.api';
import { paymentsAPI } from '../../services/api';
import '../../styles/commerce.css';

const money = (amount) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount || 0);
const customerName = (customer) => customer?.name
  || [customer?.firstName, customer?.lastName].filter(Boolean).join(' ')
  || 'Customer';

export default function PaymentReceiptPage() {
  const { id } = useParams();
  const location = useLocation();
  const paymentQuery = useQuery({
    queryKey: ['payment', id],
    queryFn: async () => (await paymentsAPI.getById(id)).data.payment,
  });
  if (paymentQuery.isPending) return <main className="commerce-page"><p className="commerce-state" role="status">Loading receipt…</p></main>;
  if (paymentQuery.isError) return <main className="commerce-page"><div className="commerce-alert" role="alert">{getApiError(paymentQuery.error, 'Unable to load payment receipt')}</div></main>;
  const payment = paymentQuery.data;
  const customer = payment.customerId;
  const order = payment.orderId;

  return (
    <main className="commerce-page">
      <div className="commerce-receipt-toolbar">
        <Link className="commerce-back" to="/payments">← Payments</Link>
        <button type="button" className="commerce-primary no-print" onClick={() => window.print()}>Print receipt</button>
      </div>
      {location.state?.message && <div className="commerce-success no-print" role="status">{location.state.message}</div>}
      <article className="commerce-receipt">
        <header><p className="section-kicker">TailorOS</p><h1>{payment.type === 'REFUND' ? 'Refund receipt' : 'Payment receipt'}</h1><span className={`commerce-badge commerce-badge-${payment.status.toLowerCase()}`}>{payment.status}</span></header>
        <dl>
          <div><dt>Receipt number</dt><dd>{payment.receiptNumber}</dd></div>
          <div><dt>Date</dt><dd>{new Date(payment.paidAt).toLocaleString()}</dd></div>
          <div><dt>Customer</dt><dd>{customerName(customer)}</dd></div>
          <div><dt>Order</dt><dd>{order?.orderNumber || '—'}</dd></div>
          <div><dt>Method</dt><dd>{payment.method.replaceAll('_', ' ')}</dd></div>
          <div><dt>Reference</dt><dd>{payment.reference || '—'}</dd></div>
          {payment.originalPaymentId && <div><dt>Original receipt</dt><dd>{payment.originalPaymentId.receiptNumber}</dd></div>}
          <div className="commerce-receipt-total"><dt>{payment.type === 'REFUND' ? 'Refund amount' : 'Amount received'}</dt><dd>{money(payment.amount)}</dd></div>
          {payment.notes && <div><dt>Notes</dt><dd>{payment.notes}</dd></div>}
        </dl>
      </article>
      <Can permission="payments.view"><Link className="commerce-back no-print" to={`/orders/${order?._id}`}>View order</Link></Can>
    </main>
  );
}
