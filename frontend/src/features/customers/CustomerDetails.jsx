const formatAddress = (address) => {
  if (typeof address === 'string') return address;
  if (address && typeof address === 'object') {
    return [address.street, address.city, address.state, address.zipCode, address.country].filter(Boolean).join(', ');
  }
  return 'Not provided';
};

const formatDate = (date) => date
  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(date))
  : '—';

export default function CustomerDetails({ customer }) {
  const fields = [
    ['Customer number', customer.customerNumber],
    ['Phone', customer.phone],
    ['WhatsApp', customer.whatsapp || 'Not provided'],
    ['Email', customer.email || 'Not provided'],
    ['Gender', customer.gender?.replaceAll('_', ' ') || 'Not provided'],
    ['Status', customer.status],
    ['Address', formatAddress(customer.address)],
    ['Created', formatDate(customer.createdAt)],
  ];

  return (
    <>
      <dl className="customer-details-grid">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || 'Not provided'}</dd>
          </div>
        ))}
      </dl>
      <section className="customer-notes">
        <div><h2>Tags</h2><p>{customer.tags?.length ? customer.tags.join(', ') : 'No tags'}</p></div>
        <div><h2>Notes</h2><p>{customer.notes || 'No notes'}</p></div>
      </section>
    </>
  );
}
