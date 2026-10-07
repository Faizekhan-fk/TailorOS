export default function CustomerFilters({ search, status, gender, tag, sortBy, sortOrder, onChange }) {
  return (
    <section className="customers-filters" aria-label="Filter customers">
      <label>
        <span>Search</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onChange('search', event.target.value)}
          placeholder="Name, customer #, phone, WhatsApp, email"
        />
      </label>
      <label>
        <span>Status</span>
        <select value={status} onChange={(event) => onChange('status', event.target.value)}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </label>
      <label>
        <span>Gender</span>
        <select value={gender} onChange={(event) => onChange('gender', event.target.value)}>
          <option value="">All genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </select>
      </label>
      <label>
        <span>Tag</span>
        <input
          value={tag}
          onChange={(event) => onChange('tag', event.target.value)}
          placeholder="e.g. VIP"
          maxLength={40}
        />
      </label>
      <label>
        <span>Sort by</span>
        <select value={sortBy} onChange={(event) => onChange('sortBy', event.target.value)}>
          <option value="createdAt">Date created</option>
          <option value="name">Name</option>
          <option value="customerNumber">Customer number</option>
          <option value="status">Status</option>
        </select>
      </label>
      <label>
        <span>Direction</span>
        <select value={sortOrder} onChange={(event) => onChange('sortOrder', event.target.value)}>
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </label>
    </section>
  );
}
