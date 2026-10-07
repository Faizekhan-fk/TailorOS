import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getApiError } from '../auth/auth.api';
import { useCreateCustomer, useUpdateCustomer } from './customers.hooks';
import '../../styles/customer.css';

const customerFormSchema = z.object({
  name: z.string().trim().min(2, 'Enter a customer name').max(120, 'Name must be 120 characters or fewer'),
  phone: z.string().trim().min(3, 'Enter a phone number').max(30, 'Phone must be 30 characters or fewer'),
  whatsapp: z.string().trim().max(30, 'WhatsApp must be 30 characters or fewer'),
  email: z.string().trim().email('Enter a valid email address').or(z.literal('')),
  gender: z.enum(['', 'male', 'female', 'other', 'prefer_not_to_say']),
  address: z.string().trim().max(500, 'Address must be 500 characters or fewer'),
  tags: z.string().max(1250, 'Tags are too long').superRefine((value, context) => {
    const tags = value.split(',').map((tag) => tag.trim()).filter(Boolean);
    if (tags.length > 30) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Use 30 tags or fewer' });
    }
    if (tags.some((tag) => tag.length > 40)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Each tag must be 40 characters or fewer' });
    }
  }),
  notes: z.string().trim().max(2000, 'Notes must be 2,000 characters or fewer'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
}).transform((values) => ({
  ...values,
  email: values.email || undefined,
  whatsapp: values.whatsapp || undefined,
  gender: values.gender || undefined,
  address: values.address || undefined,
  tags: [...new Set(values.tags.split(',').map((tag) => tag.trim()).filter(Boolean))],
}));

const formatAddress = (address) => {
  if (typeof address === 'string') return address;
  if (address && typeof address === 'object') {
    return [address.street, address.city, address.state, address.zipCode, address.country].filter(Boolean).join(', ');
  }
  return '';
};

export default function CustomerForm({ customer, onCancel, onSaved }) {
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer(customer?._id);
  const mutation = customer ? updateMutation : createMutation;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: customer?.name || [customer?.firstName, customer?.lastName].filter(Boolean).join(' '),
      phone: customer?.phone || '',
      whatsapp: customer?.whatsapp || '',
      email: customer?.email || '',
      gender: customer?.gender || '',
      address: formatAddress(customer?.address),
      tags: customer?.tags?.join(', ') || '',
      notes: customer?.notes || '',
      status: customer?.status || 'ACTIVE',
    },
  });

  const submit = async (values) => {
    try {
      const response = await mutation.mutateAsync(values);
      onSaved?.(response.data.customer);
    } catch (error) {
      setError('root.server', { message: getApiError(error, 'Unable to save customer') });
    }
  };

  const fieldError = (name) => errors[name] && (
    <span className="customer-field-error" role="alert">{errors[name].message}</span>
  );

  return (
    <form className="customer-form" onSubmit={handleSubmit(submit)} noValidate>
      {errors.root?.server && <div className="customer-alert" role="alert">{errors.root.server.message}</div>}
      <div className="customer-form-grid">
        <label>
          Full name <span aria-hidden="true">*</span>
          <input autoComplete="name" aria-invalid={Boolean(errors.name)} {...register('name')} />
          {fieldError('name')}
        </label>
        <label>
          Phone <span aria-hidden="true">*</span>
          <input autoComplete="tel" aria-invalid={Boolean(errors.phone)} {...register('phone')} />
          {fieldError('phone')}
        </label>
        <label>
          WhatsApp
          <input autoComplete="tel" aria-invalid={Boolean(errors.whatsapp)} {...register('whatsapp')} />
          {fieldError('whatsapp')}
        </label>
        <label>
          Email
          <input type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register('email')} />
          {fieldError('email')}
        </label>
        <label>
          Gender
          <select {...register('gender')}>
            <option value="">Not specified</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </label>
        <label>
          Status
          <select {...register('status')}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
        <label className="field-wide">
          Address
          <textarea rows="2" aria-invalid={Boolean(errors.address)} {...register('address')} />
          {fieldError('address')}
        </label>
        <label className="field-wide">
          Tags <span className="field-hint">Separate tags with commas</span>
          <input aria-invalid={Boolean(errors.tags)} {...register('tags')} />
          {fieldError('tags')}
        </label>
        <label className="field-wide">
          Notes
          <textarea rows="4" aria-invalid={Boolean(errors.notes)} {...register('notes')} />
          {fieldError('notes')}
        </label>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-small" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
        <button className="btn btn-primary" type="submit" disabled={isSubmitting || mutation.isPending}>
          {isSubmitting || mutation.isPending ? 'Saving…' : customer ? 'Save changes' : 'Create customer'}
        </button>
      </div>
    </form>
  );
}
