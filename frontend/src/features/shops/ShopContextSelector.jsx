import { useEffect, useState } from 'react';
import { shopsAPI } from '../../services/api';
import { useAuthStore } from '../auth/auth.store';

const ACTIVE_SHOP_KEY = 'activeShopId';

export default function ShopContextSelector() {
  const user = useAuthStore((state) => state.user);
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState(
    () => localStorage.getItem(ACTIVE_SHOP_KEY) || ''
  );
  const [error, setError] = useState('');
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isSuperAdmin) {
      localStorage.removeItem(ACTIVE_SHOP_KEY);
      setSelectedShopId('');
      setShops([]);
      setError('');
      return;
    }

    let cancelled = false;
    shopsAPI.list()
      .then(({ data }) => {
        if (cancelled) return;
        const availableShops = data.data.shops;
        setShops(availableShops);
        const savedShopId = localStorage.getItem(ACTIVE_SHOP_KEY);
        if (savedShopId && availableShops.some((shop) => shop.id === savedShopId)) {
          setSelectedShopId(savedShopId);
        } else {
          localStorage.removeItem(ACTIVE_SHOP_KEY);
          setSelectedShopId('');
        }
        setError('');
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.response?.data?.message || 'Unable to load shops');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  if (!isSuperAdmin) return null;

  const handleChange = (event) => {
    const shopId = event.target.value;
    if (shopId) localStorage.setItem(ACTIVE_SHOP_KEY, shopId);
    else localStorage.removeItem(ACTIVE_SHOP_KEY);
    setSelectedShopId(shopId);
  };

  const shopNameCounts = shops.reduce((counts, shop) => {
    counts.set(shop.name, (counts.get(shop.name) || 0) + 1);
    return counts;
  }, new Map());

  return (
    <section
      aria-label="Shop context"
      style={{
        alignItems: 'center',
        background: '#fff8e7',
        borderBottom: '1px solid #ead9a8',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.65rem 1rem',
      }}
    >
      <label htmlFor="active-shop" style={{ fontWeight: 600 }}>Working shop</label>
      <select
        id="active-shop"
        value={selectedShopId}
        onChange={handleChange}
        disabled={!shops.length}
        style={{ minWidth: '14rem', padding: '0.4rem' }}
      >
        <option value="">
          {shops.length ? 'Select a shop before making changes' : 'No active shops available'}
        </option>
        {shops.map((shop) => (
          <option key={shop.id} value={shop.id}>
            {shopNameCounts.get(shop.name) > 1 ? `${shop.name} (${shop.id.slice(-6)})` : shop.name}
          </option>
        ))}
      </select>
      {error && <span role="alert">{error}</span>}
    </section>
  );
}
