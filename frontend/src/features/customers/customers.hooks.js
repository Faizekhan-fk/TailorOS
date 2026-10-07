import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customersApi } from './customers.api';
import { useAuthStore } from '../auth/auth.store';

const currentScope = () => {
  const user = useAuthStore.getState().user;
  const userId = user?.id || user?._id || 'anonymous';
  const shopId = localStorage.getItem('activeShopId') || user?.shopId || 'unassigned';
  return `${userId}:${shopId}`;
};

export const customerKeys = {
  all: () => ['customers', currentScope()],
  lists: () => [...customerKeys.all(), 'list'],
  list: (filters) => [...customerKeys.lists(), filters],
  detail: (id) => [...customerKeys.all(), 'detail', id],
};

export function useCustomers(filters, enabled = true) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: async () => (await customersApi.list(filters)).data,
    enabled,
  });
}

export function useCustomer(id, enabled = true) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: async () => (await customersApi.get(id)).data.customer,
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customer) => customersApi.create(customer),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.all() }),
  });
}

export function useUpdateCustomer(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customer) => customersApi.update(id, customer),
    onSuccess: (response) => {
      queryClient.setQueryData(customerKeys.detail(id), response.data.customer);
      return queryClient.invalidateQueries({ queryKey: customerKeys.all() });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => customersApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.all() }),
  });
}
