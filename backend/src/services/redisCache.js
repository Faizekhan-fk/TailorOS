import { getRedis } from '../config/redis.js';

export const readCache = async (key) => {
  const value = await getRedis().get(key);
  return value ? JSON.parse(value) : null;
};

export const writeCache = async (key, value, ttlSeconds = 60) => {
  await getRedis().set(key, JSON.stringify(value), { EX: ttlSeconds });
};

export const deleteCacheByPrefix = async (prefix) => {
  const redis = getRedis();
  for await (const keys of redis.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
    if (keys.length) await redis.del(keys);
  }
};
