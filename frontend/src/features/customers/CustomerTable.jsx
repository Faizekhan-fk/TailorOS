import { Link } from 'react-router-dom';
import Can from '../auth/Can';

const displayName = (customer) => customer.name
  || [customer.firstName, customer.lastName].filter(Boolean).join(' ')
  || 'Unnamed customer';

const formatGender = (gender) => gender
  ? gender.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
  : '—';

const formatDate = (date) => date
  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(date))
  : '—';

export default function CustomerTable({ customers, onDelete, deleting }) {
  return (
    <div className="customers-table-wrap">
      <table className="customers-table">
        <thead>
          <tr>
            <th scope="col">Customer #</th>
            <th scope="col">Name</th>
            <th scope="col">Phone</th>
            <th scope="col">WhatsApp</th>
            <th scope="col">Gender</th>
            <th scope="col">Status</th>
            <th scope="col">Created</th>
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer._id}>
              <td className="customer-number">{customer.customerNumber}</td>
              <td>
                <Link className="customer-name" to={`/customers/${customer._id}`}>
                  {displayName(customer)}
                </Link>
                <span className="customer-email">{customer.email || 'No email'}</span>
              </td>
              <td>{customer.phone || '—'}</td>
              <td>{customer.whatsapp || '—'}</td>
              <td>{formatGender(customer.gender)}</td>
              <td><span className={`customer-status customer-status-${customer.status?.toLowerCase()}`}>{customer.status}</span></td>
              <td>{formatDate(customer.createdAt)}</td>
              <td>
                <div className="customer-row-actions">
                  <Link className="customer-action" to={`/customers/${customer._id}`}>View</Link>
                  <Can permission="customers.update">
                    <Link className="customer-action" to={`/customers/${customer._id}/edit`}>Edit</Link>
                  </Can>
                  <Can permission="customers.delete">
                    <button
                      className="customer-action customer-action-danger"
                      type="button"
                      disabled={deleting}
                      onClick={() => onDelete(customer)}
                    >
                      Deactivate
                    </button>
                  </Can>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
