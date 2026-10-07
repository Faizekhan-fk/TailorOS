import { useAuthStore } from './auth.store';
import { hasPermission } from './permissions';

export default function Can({ permission, children, fallback = null }) {
  const user = useAuthStore((state) => state.user);
  return hasPermission(user, permission) ? children : fallback;
}
