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
