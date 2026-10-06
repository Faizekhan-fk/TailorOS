import { useMemo, useState } from 'react'

const navigation = [
  { label: 'Overview', icon: '⌂' },
  { label: 'Orders', icon: '▤', count: '24' },
  { label: 'Customers', icon: '♙' },
  { label: 'Production', icon: '✂' },
  { label: 'Inventory', icon: '▦' },
]

const orders = [
  { id: '#TL-2048', customer: 'Amara Okafor', garment: 'Bridal gown', due: 'Today, 4:00 PM', status: 'In fitting', tone: 'amber', initials: 'AO' },
  { id: '#TL-2045', customer: 'David Mensah', garment: 'Three-piece suit', due: 'Tomorrow', status: 'Cutting', tone: 'blue', initials: 'DM' },
  { id: '#TL-2041', customer: 'Nadia Bello', garment: 'Silk kaftan set', due: 'Wed, 12 Jun', status: 'Ready', tone: 'green', initials: 'NB' },
  { id: '#TL-2038', customer: 'Theo Williams', garment: 'Linen shirt', due: 'Thu, 13 Jun', status: 'Awaiting fabric', tone: 'rose', initials: 'TW' },
]

const activity = [
  { title: 'Order #TL-2041 marked ready', detail: 'Nadia Bello · 12 min ago', icon: '✓', tone: 'green' },
  { title: 'New customer added', detail: 'Sade Adeyemi · 48 min ago', icon: '+', tone: 'blue' },
  { title: 'Low stock: Italian wool', detail: 'Inventory · 1 hr ago', icon: '!', tone: 'amber' },
]

function StatCard({ label, value, change, detail, icon, tone }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div className="stat-copy">
        <p>{label}</p>
        <strong>{value}</strong>
        <span className={change.startsWith('+') ? 'positive' : 'muted'}>{change}</span>
        <small>{detail}</small>
      </div>
    </article>
  )
}

export default function Home() {
  const [activeNav, setActiveNav] = useState('Overview')
  const [activeFilter, setActiveFilter] = useState('All orders')
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()
    return orders.filter((order) => {
      const matchesSearch = !query || `${order.id} ${order.customer} ${order.garment}`.toLowerCase().includes(query)
      const matchesFilter = activeFilter === 'All orders' || order.status === activeFilter
      return matchesSearch && matchesFilter
    })
  }, [activeFilter, search])

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="brand-lockup">
          <span className="brand-mark">T</span>
          <span>tailor<span>OS</span></span>
        </div>
        <div className="workspace-switcher">
          <div className="workspace-avatar">SS</div>
          <div><strong>Stitch & Stone</strong><span>Accra studio</span></div>
          <span className="chevron">⌄</span>
        </div>
        <p className="nav-label">Workspace</p>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <button className={activeNav === item.label ? 'nav-item active' : 'nav-item'} key={item.label} onClick={() => { setActiveNav(item.label); setMenuOpen(false) }}>
              <span className="nav-icon">{item.icon}</span><span>{item.label}</span>{item.count && <b>{item.count}</b>}
            </button>
          ))}
        </nav>
        <p className="nav-label">Manage</p>
        <nav className="main-nav" aria-label="Management navigation">
          <button className="nav-item" onClick={() => setActiveNav('Payments')}><span className="nav-icon">◌</span><span>Payments</span></button>
          <button className="nav-item" onClick={() => setActiveNav('Reports')}><span className="nav-icon">▥</span><span>Reports</span></button>
          <button className="nav-item" onClick={() => setActiveNav('Settings')}><span className="nav-icon">⚙</span><span>Settings</span></button>
        </nav>
        <div className="sidebar-footer"><div className="user-avatar">KA</div><div><strong>Kofi A.</strong><span>Studio manager</span></div><button aria-label="More user options">•••</button></div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
          <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{activeNav}</strong></div>
          <div className="topbar-actions">
            <label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders, customers..." /></label>
            <button className="icon-button" aria-label="Notifications"><span className="notification-dot" />♧</button>
            <div className="topbar-user"><div className="user-avatar">KA</div><span>Kofi A.</span><b>⌄</b></div>
          </div>
        </header>

        <div className="page-body">
          <section className="page-heading">
            <div><p className="eyebrow">Tuesday, 11 June 2024</p><h1>Good morning, Kofi <span>✦</span></h1><p className="heading-subtitle">Here&apos;s what&apos;s happening in your studio today.</p></div>
            <button className="primary-button" onClick={() => setShowModal(true)}><span>＋</span> New order</button>
          </section>

          <section className="stats-grid" aria-label="Business overview">
            <StatCard label="Revenue this month" value="₵48,250" change="+12.8%" detail="vs. last month" icon="₵" tone="coral" />
            <StatCard label="Active orders" value="24" change="+4" detail="since last week" icon="↗" tone="blue" />
            <StatCard label="Ready for pickup" value="08" change="Due today" detail="3 customers notified" icon="✓" tone="green" />
            <StatCard label="On-time completion" value="94.2%" change="+2.4%" detail="vs. last month" icon="◷" tone="purple" />
          </section>

          <section className="content-grid">
            <article className="panel orders-panel">
              <div className="panel-header"><div><h2>Recent orders</h2><p>Keep your production line moving.</p></div><button className="text-button">View all <span>→</span></button></div>
              <div className="filter-row">{['All orders', 'In fitting', 'Cutting', 'Ready'].map((filter) => <button key={filter} className={activeFilter === filter ? 'filter-chip active' : 'filter-chip'} onClick={() => setActiveFilter(filter)}>{filter}</button>)}</div>
              <div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Due date</th><th>Status</th><th /></tr></thead><tbody>{filteredOrders.map((order) => <tr key={order.id}><td><strong className="order-id">{order.id}</strong><span className="order-type">{order.garment}</span></td><td><div className="customer-cell"><span className={`customer-avatar ${order.tone}`}>{order.initials}</span><strong>{order.customer}</strong></div></td><td><span className="due-date">{order.due}</span></td><td><span className={`status-pill ${order.tone}`}><i />{order.status}</span></td><td><button className="row-menu" aria-label={`More options for ${order.id}`}>•••</button></td></tr>)}</tbody></table>{filteredOrders.length === 0 && <p className="empty-state">No orders match that search.</p>}</div>
            </article>
            <aside className="right-column">
              <article className="panel production-panel"><div className="panel-header"><div><h2>Production flow</h2><p>24 active orders</p></div><button className="more-button" aria-label="Production options">•••</button></div><div className="progress-track"><div className="progress-segment coral" /><div className="progress-segment blue" /><div className="progress-segment amber" /><div className="progress-segment green" /></div><div className="production-list"><div><span><i className="dot coral" />Cutting</span><strong>06</strong></div><div><span><i className="dot blue" />In sewing</span><strong>09</strong></div><div><span><i className="dot amber" />In fitting</span><strong>05</strong></div><div><span><i className="dot green" />Finishing</span><strong>04</strong></div></div></article>
              <article className="panel activity-panel"><div className="panel-header"><div><h2>Recent activity</h2><p>Latest updates from your team</p></div><button className="more-button" aria-label="Activity options">•••</button></div><div className="activity-list">{activity.map((item) => <div className="activity-item" key={item.title}><span className={`activity-icon ${item.tone}`}>{item.icon}</span><div><strong>{item.title}</strong><span>{item.detail}</span></div></div>)}</div><button className="activity-link">View activity log <span>→</span></button></article>
            </aside>
          </section>
        </div>
      </main>
      {showModal && <div className="modal-backdrop" role="presentation" onClick={() => setShowModal(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="new-order-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" aria-label="Close" onClick={() => setShowModal(false)}>×</button><p className="eyebrow">Quick action</p><h2 id="new-order-title">Start a new order</h2><p className="modal-copy">Order creation will connect to your customer and garment records when those modules are enabled.</p><label>Customer<input placeholder="Search customers" /></label><label>Garment type<select defaultValue=""><option value="" disabled>Select a garment</option><option>Bridal gown</option><option>Three-piece suit</option><option>Kaftan set</option></select></label><button className="primary-button full-width" onClick={() => setShowModal(false)}>Continue <span>→</span></button></section></div>}
    </div>
  )
}
