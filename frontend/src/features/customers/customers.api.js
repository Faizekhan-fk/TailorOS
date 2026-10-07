import { customersAPI } from '../../services/api';

export const customersApi = {
  list: (params) => customersAPI.list(params),
  get: (id) => customersAPI.getById(id),
  create: (customer) => customersAPI.create(customer),
  update: (id, customer) => customersAPI.update(id, customer),
  remove: (id) => customersAPI.delete(id),
};
