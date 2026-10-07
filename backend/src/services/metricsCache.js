import { deleteCacheByPrefix } from './redisCache.js';
import { isRedisReady } from '../config/redis.js';

export const invalidateShopMetrics = async (shopId) => {
  if (!isRedisReady()) return;
  try {
    await Promise.all([
      deleteCacheByPrefix(`report:financial:${shopId}:`),
      deleteCacheByPrefix(`report:production:${shopId}`),
      deleteCacheByPrefix(`analytics:overview:${shopId}`),
    ]);
  } catch (error) {
    console.error(`Could not invalidate cached reports for shop ${shopId}:`, error);
  }
};
