import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WhatsAppPage from './WhatsAppPage';
import BarcodesPage from './BarcodesPage';
import { useAuthStore } from '../auth/auth.store';
import { barcodesAPI, whatsappAPI } from '../../services/api';

vi.mock('../../services/api', () => ({
  barcodesAPI: { generate: vi.fn(), resolve: vi.fn() },
  whatsappAPI: { status: vi.fn(), messages: vi.fn(), consent: vi.fn(), send: vi.fn() },
}));

const renderWithQuery = (element) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
};

describe('integration tools', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: { role: 'SHOP_OWNER', shopId: 'shop-1' } });
    whatsappAPI.status.mockResolvedValue({ data: { configured: false, template: null } });
    whatsappAPI.messages.mockResolvedValue({ data: { messages: [] } });
    whatsappAPI.consent.mockResolvedValue({ data: { success: true } });
    whatsappAPI.send.mockResolvedValue({ data: { success: true } });
    barcodesAPI.generate.mockResolvedValue({ data: '<svg></svg>', headers: { 'x-barcode-value': 'order:123:signature' } });
    barcodesAPI.resolve.mockResolvedValue({ data: { record: { type: 'order', label: 'ORD-1', data: { status: 'pending' } } } });
  });

  afterEach(() => cleanup());

  it('shows WhatsApp configuration and records a customer opt-in with its source', async () => {
    const user = userEvent.setup();
    renderWithQuery(<WhatsAppPage />);
    expect(await screen.findByText('Not configured. Add the Meta Cloud API credentials and approved template name to the backend environment.')).toBeTruthy();
    await user.type(screen.getByLabelText('Customer ID for consent'), '507f1f77bcf86cd799439011');
    await user.type(screen.getByLabelText('Consent source'), 'Signed consent form');
    await user.click(screen.getByRole('button', { name: 'Save consent' }));
    await waitFor(() => expect(whatsappAPI.consent).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      { optedIn: true, source: 'Signed consent form' },
    ));
    expect(screen.getByRole('button', { name: 'Queue WhatsApp update' }).disabled).toBe(true);
  });

  it('generates and resolves tenant barcode values', async () => {
    const user = userEvent.setup();
    renderWithQuery(<BarcodesPage />);
    await user.type(screen.getByLabelText('Record ID'), '507f1f77bcf86cd799439011');
    await user.click(screen.getByRole('button', { name: 'Generate label' }));
    expect(await screen.findByAltText('qr label for order')).toBeTruthy();
    expect(barcodesAPI.generate).toHaveBeenCalledWith('order', '507f1f77bcf86cd799439011', 'qr');
    fireEvent.change(screen.getByLabelText('Scanned code'), { target: { value: 'order:123:signature' } });
    await user.click(screen.getByRole('button', { name: 'Find record' }));
    expect(await screen.findByText('ORD-1')).toBeTruthy();
    expect(barcodesAPI.resolve).toHaveBeenCalledWith('order:123:signature');
  });
});
