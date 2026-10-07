import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { hasPermission } from '../features/auth/permissions';
import { customersAPI, ordersAPI, garmentsAPI, inventoryAPI } from '../services/api';
import '../styles/dashboard.css';

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState({
    customers: 0,
    orders: 0,
    garments: 0,
    inventory: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [custRes, ordRes, garmRes, invRes] = await Promise.all([
          customersAPI.list(1, 1),
          ordersAPI.list(1, 1),
          garmentsAPI.list(1, 1),
          inventoryAPI.list(1, 1),
        ]);

        setStats({
          customers: custRes.data.pagination?.total || 0,
          orders: ordRes.data.pagination?.total || 0,
          garments: garmRes.data.pagination?.total || 0,
          inventory: invRes.data.pagination?.total || 0,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>TailorOS Dashboard</h1>
        <div className="user-info">
          <span>
            Welcome, {user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()}
          </span>
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="stats-grid">
          <StatCard label="Customers" value={stats.customers} icon="👥" />
          <StatCard label="Orders" value={stats.orders} icon="📦" />
          <StatCard label="Garments" value={stats.garments} icon="👔" />
          <StatCard label="Inventory" value={stats.inventory} icon="📊" />
        </div>

        <div className="quick-links">
          <h2>Quick Links</h2>
          <div className="links-grid">
            <a href="/customers" className="link-card">
              <span className="icon">👥</span>
              <span>Manage Customers</span>
            </a>
            <a href="/orders" className="link-card">
              <span className="icon">📦</span>
              <span>View Orders</span>
            </a>
            {hasPermission(user, 'payments.view') && (
              <a href="/payments" className="link-card">
                <span className="icon">💳</span>
                <span>Payments</span>
              </a>
            )}
            {hasPermission(user, 'production.view') && (
              <a href="/production" className="link-card">
                <span className="icon">🧵</span>
                <span>Production Board</span>
              </a>
            )}
            {hasPermission(user, 'purchases.view') && <a href="/purchases" className="link-card"><span className="icon">🧾</span><span>Purchases</span></a>}
            {hasPermission(user, 'expenses.view') && <a href="/expenses" className="link-card"><span className="icon">💸</span><span>Expenses</span></a>}
            {hasPermission(user, 'invoices.view') && <a href="/invoices" className="link-card"><span className="icon">📄</span><span>Invoices</span></a>}
            {hasPermission(user, 'notifications.view') && <a href="/notifications" className="link-card"><span className="icon">🔔</span><span>Notifications</span></a>}
            {hasPermission(user, 'reports.view') && <a href="/reports" className="link-card"><span className="icon">📑</span><span>Reports</span></a>}
            {hasPermission(user, 'analytics.view') && <a href="/analytics" className="link-card"><span className="icon">📈</span><span>Analytics</span></a>}
            {hasPermission(user, 'audit_logs.view') && <a href="/audit-logs" className="link-card"><span className="icon">🛡️</span><span>Audit log</span></a>}
            {hasPermission(user, 'customer_portal.view') && <a href="/portal/accounts" className="link-card"><span className="icon">🧑‍💻</span><span>Customer portal accounts</span></a>}
            {hasPermission(user, 'whatsapp.view') && <a href="/whatsapp" className="link-card"><span className="icon">💬</span><span>WhatsApp</span></a>}
            {hasPermission(user, 'barcodes.view') && <a href="/barcodes" className="link-card"><span className="icon">▦</span><span>Barcodes &amp; QR</span></a>}
            <a href="/garments" className="link-card">
              <span className="icon">👔</span>
              <span>Garment Types</span>
            </a>
            <a href="/inventory" className="link-card">
              <span className="icon">📊</span>
              <span>Inventory</span>
            </a>
            <a href="/suppliers" className="link-card">
              <span className="icon">🏭</span>
              <span>Suppliers</span>
            </a>
            <a href="/tailors" className="link-card">
              <span className="icon">✂️</span>
              <span>Tailors</span>
            </a>
            <a href="/measurements" className="link-card">
              <span className="icon">📏</span>
              <span>Measurement Templates</span>
            </a>
          </div>
        </div>

        {hasPermission(user, 'users.view') && (
          <div className="admin-section">
            <h2>Admin Tools</h2>
            <p>You have administrative access to all system features.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon}</span>
      <h3>{label}</h3>
      <p className="stat-value">{value}</p>
    </div>
  );
}
