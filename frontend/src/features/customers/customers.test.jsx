import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import CustomerForm from './CustomerForm';
import CustomerDetails from './CustomerDetails';
import CustomerTable from './CustomerTable';
import CustomersPage from './CustomersPage';
import { useAuthStore } from '../auth/auth.store';
import {
  useCreateCustomer,
  useCustomers,
  useDeleteCustomer,
  useUpdateCustomer,
} from './customers.hooks';

vi.mock('./customers.hooks', () => ({
  useCustomers: vi.fn(),
  useDeleteCustomer: vi.fn(),
  useCreateCustomer: vi.fn(),
  useUpdateCustomer: vi.fn(),
}));

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="current-search">{location.search}</output>;
};

const customer = {
  _id: 'customer-1',
  customerNumber: 'CUS-000001',
  name: 'Ayesha Khan',
  phone: '555-1000',
  whatsapp: '555-1001',
  email: 'ayesha@example.com',
  gender: 'female',
  status: 'ACTIVE',
  createdAt: '2025-01-01T00:00:00.000Z',
};

const renderInRouter = (element, initialEntry = '/customers') => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    {element}
    <LocationProbe />
  </MemoryRouter>
);

describe('customer feature', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { role: 'MANAGER', permissions: ['customers.view'] },
    });
    useCreateCustomer.mockReturnValue({ isPending: false, mutateAsync: vi.fn() });
    useUpdateCustomer.mockReturnValue({ isPending: false, mutateAsync: vi.fn() });
    useDeleteCustomer.mockReturnValue({ isPending: false, mutateAsync: vi.fn() });
    useCustomers.mockReturnValue({
      data: { customers: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isPending: false,
      isError: false,
      isSuccess: true,
      refetch: vi.fn(),
    });
  });

  afterEach(() => cleanup());

  it('renders customer table details and only authorized actions', () => {
    renderInRouter(<CustomerTable customers={[customer]} onDelete={vi.fn()} deleting={false} />);
    expect(screen.getByText('CUS-000001')).toBeTruthy();
    expect(screen.getByText('Ayesha Khan')).toBeTruthy();
    expect(screen.getByText('555-1001')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Deactivate' })).toBeNull();

    useAuthStore.setState({
      user: { role: 'MANAGER', permissions: ['customers.view', 'customers.update', 'customers.delete'] },
    });
    cleanup();
    renderInRouter(<CustomerTable customers={[customer]} onDelete={vi.fn()} deleting={false} />);
    expect(screen.getByRole('link', { name: 'Edit' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeTruthy();
  });

  it('renders the complete customer profile on the details page', () => {
    render(<CustomerDetails customer={{
      ...customer,
      address: 'Lahore',
      tags: ['VIP'],
      notes: 'Prefers slim fit',
    }} />);
    expect(screen.getByText('CUS-000001')).toBeTruthy();
    expect(screen.getByText('Lahore')).toBeTruthy();
    expect(screen.getByText('VIP')).toBeTruthy();
    expect(screen.getByText('Prefers slim fit')).toBeTruthy();
  });

  it('validates required fields before submitting the customer form', async () => {
    const mutation = { isPending: false, mutateAsync: vi.fn() };
    useCreateCustomer.mockReturnValue(mutation);
    const user = userEvent.setup();
    render(<CustomerForm onCancel={vi.fn()} onSaved={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Create customer' }));
    expect(await screen.findByText('Enter a customer name')).toBeTruthy();
    expect(mutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('submits normalized values and reports a successful create', async () => {
    const saved = { _id: 'customer-new' };
    const mutation = {
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue({ data: { customer: saved } }),
    };
    const onSaved = vi.fn();
    useCreateCustomer.mockReturnValue(mutation);
    const user = userEvent.setup();
    render(<CustomerForm onCancel={vi.fn()} onSaved={onSaved} />);

    await user.type(screen.getByLabelText(/Full name/), '  Ayesha Khan ');
    await user.type(screen.getByLabelText(/Phone/), '555-2000');
    await user.type(screen.getByLabelText(/Tags/), 'VIP, Regular');
    await user.click(screen.getByRole('button', { name: 'Create customer' }));

    await waitFor(() => expect(mutation.mutateAsync).toHaveBeenCalledOnce());
    expect(mutation.mutateAsync.mock.calls[0][0]).toMatchObject({
      name: 'Ayesha Khan',
      phone: '555-2000',
      tags: ['VIP', 'Regular'],
      status: 'ACTIVE',
    });
    expect(onSaved).toHaveBeenCalledWith(saved);
  });

  it('submits edits through the update mutation', async () => {
    const saved = { ...customer, notes: 'Altered hem length' };
    const mutation = {
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue({ data: { customer: saved } }),
    };
    const onSaved = vi.fn();
    useUpdateCustomer.mockReturnValue(mutation);
    const user = userEvent.setup();
    render(<CustomerForm customer={customer} onCancel={vi.fn()} onSaved={onSaved} />);

    await user.clear(screen.getByLabelText('Notes'));
    await user.type(screen.getByLabelText('Notes'), 'Altered hem length');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mutation.mutateAsync).toHaveBeenCalledOnce());
    expect(mutation.mutateAsync.mock.calls[0][0].notes).toBe('Altered hem length');
    expect(onSaved).toHaveBeenCalledWith(saved);
  });

  it('shows loading and API error states for the customer list', async () => {
    useCustomers.mockReturnValueOnce({
      data: undefined,
      isPending: true,
      isError: false,
      isSuccess: false,
    });
    renderInRouter(<CustomersPage />);
    expect(screen.getByText('Loading customers…')).toBeTruthy();
    cleanup();

    useCustomers.mockReturnValueOnce({
      data: undefined,
      isPending: false,
      isError: true,
      isSuccess: false,
      error: { response: { data: { message: 'Customer service unavailable' } } },
      refetch: vi.fn(),
    });
    renderInRouter(<CustomersPage />);
    expect(await screen.findByText('Customer service unavailable')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('does not request customer data when the user lacks view permission', () => {
    useAuthStore.setState({
      user: { role: 'TAILOR', permissions: ['customers.create'] },
    });
    renderInRouter(<CustomersPage />);
    expect(useCustomers).toHaveBeenCalledWith(expect.any(Object), false);
    expect(screen.getByRole('alert').textContent).toContain('do not have permission');
  });

  it('keeps customer filters synchronized with URL query parameters', async () => {
    useCustomers.mockReturnValue({
      data: { customers: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isPending: false,
      isError: false,
      isSuccess: true,
      refetch: vi.fn(),
    });
    renderInRouter(<CustomersPage />, '/customers?gender=male');
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'ACTIVE' } });
    await waitFor(() => expect(screen.getByTestId('current-search').textContent).toContain('status=ACTIVE'));
    expect(screen.getByTestId('current-search').textContent).toContain('gender=male');
  });
});
