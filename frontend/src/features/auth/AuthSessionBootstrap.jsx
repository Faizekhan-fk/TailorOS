import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi } from './auth.api';
import { useAuthStore } from './auth.store';

export default function AuthSessionBootstrap() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const { data } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => (await authApi.me()).data.data.user,
    enabled: Boolean(accessToken),
    retry: false,
  });

  useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

  return null;
}
