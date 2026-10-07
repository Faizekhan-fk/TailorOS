import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Can from '../auth/Can';
import { hasPermission } from '../auth/permissions';
import { useAuthStore } from '../auth/auth.store';
import { getApiError } from '../auth/auth.api';
import { ordersAPI, productionAPI, tailorsAPI } from '../../services/api';
import '../../styles/commerce.css';

const stages = ['queued', 'cutting', 'sewing', 'fitting', 'finishing', 'quality_check', 'ready', 'blocked'];
const allowedMoves = {
  queued: ['cutting', 'blocked'],
  cutting: ['sewing', 'blocked'],
  sewing: ['fitting', 'finishing', 'blocked'],
  fitting: ['sewing', 'finishing', 'blocked'],
  finishing: ['quality_check', 'blocked'],
  quality_check: ['finishing', 'ready', 'blocked'],
  ready: ['finishing'],
  blocked: [],
};
const stageLabel = (stage) => stage.replaceAll('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase());
const tailorName = (tailor) => tailor?.user?.name
  || [tailor?.user?.firstName, tailor?.user?.lastName].filter(Boolean).join(' ')
  || 'Unassigned';

export default function ProductionPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const canView = hasPermission(user, 'production.view');
  const canAssign = hasPermission(user, 'production.assign');
  const canCreateJobs = hasPermission(user, 'production.create');
  const canViewOrders = hasPermission(user, 'orders.view');
  const [stage, setStage] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const shopId = localStorage.getItem('activeShopId') || user?.shopId;
  const jobsQuery = useQuery({
    queryKey: ['production-jobs', shopId, stage, page],
    queryFn: async () => (await productionAPI.list({ page, limit: 20, ...(stage ? { stage } : {}) })).data,
    enabled: canView,
  });
  const tailorsQuery = useQuery({
    queryKey: ['available-tailors', shopId],
    queryFn: async () => (await tailorsAPI.list({ page: 1, limit: 100, available: true })).data.tailors,
    enabled: canView && canAssign,
  });
  const ordersQuery = useQuery({
    queryKey: ['production-orders', shopId],
    queryFn: async () => (await ordersAPI.list({ page: 1, limit: 100 })).data.orders,
    enabled: canView && canCreateJobs && canViewOrders,
  });
  const invalidateJobs = () => queryClient.invalidateQueries({ queryKey: ['production-jobs'] });
  const stageMutation = useMutation({
    mutationFn: ({ id, stage: nextStage }) => productionAPI.updateStage(id, { stage: nextStage }),
    onSuccess: async () => {
      setError('');
      setMessage('Production stage updated.');
      await invalidateJobs();
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (requestError) => setError(getApiError(requestError, 'Unable to update production stage')),
  });
  const assignMutation = useMutation({
    mutationFn: ({ id, tailorId }) => productionAPI.assign(id, tailorId || null),
    onSuccess: async () => {
      setError('');
      setMessage('Production assignment updated.');
      await invalidateJobs();
    },
    onError: (requestError) => setError(getApiError(requestError, 'Unable to update production assignment')),
  });
  const createJobsMutation = useMutation({
    mutationFn: (orderId) => productionAPI.createOrderJobs(orderId),
    onSuccess: async (response) => {
      setError('');
      setMessage(`${response.data.jobs.length} production job(s) are ready.`);
      await invalidateJobs();
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (requestError) => setError(getApiError(requestError, 'Unable to prepare production jobs')),
  });

  if (!canView) return <main className="commerce-page"><div className="commerce-alert" role="alert">You do not have permission to view production.</div></main>;
  const jobs = jobsQuery.data?.jobs || [];
  const orders = ordersQuery.data || [];
  const ordersToCheck = orders.filter((order) => !['cancelled', 'delivered'].includes(order.status));

  return (
    <main className="commerce-page">
      <header className="commerce-header">
        <div><p className="section-kicker">Workshop</p><h1>Production board</h1><p>Track each ordered garment from cutting through quality control.</p></div>
        <label className="commerce-filter">Filter stage
          <select aria-label="Filter by production stage" value={stage} onChange={(event) => { setStage(event.target.value); setPage(1); }}>
            <option value="">All stages</option>
            {stages.map((item) => <option key={item} value={item}>{stageLabel(item)}</option>)}
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </header>
      {message && <div className="commerce-success" role="status">{message}</div>}
      {error && <div className="commerce-alert" role="alert">{error}</div>}
      {jobsQuery.isPending && <p className="commerce-state" role="status">Loading production jobs…</p>}
      {jobsQuery.isError && <div className="commerce-state commerce-state-error" role="alert"><p>{getApiError(jobsQuery.error, 'Unable to load production jobs')}</p><button type="button" onClick={() => jobsQuery.refetch()}>Try again</button></div>}
      {jobsQuery.isSuccess && jobs.length === 0 && <div className="commerce-state"><h2>No production jobs found</h2><p>New orders automatically create a production job for each garment.</p></div>}

      {jobs.length > 0 && (
        <>
          <div className="commerce-job-grid">
            {jobs.map((job) => (
              <article className="commerce-job-card" key={job._id}>
              <header>
                <div><span className="commerce-job-order">{job.orderId?.orderNumber || 'Order'}</span><h2>{job.garmentId?.name || job.garmentName}</h2></div>
                <span className={`commerce-badge commerce-badge-stage-${job.stage}`}>{stageLabel(job.stage)}</span>
              </header>
              <p className="commerce-job-meta">Quantity: <strong>{job.quantity}</strong>{job.dueDate && <> · Due {new Date(job.dueDate).toLocaleDateString()}</>}</p>
              {job.notes && <p className="commerce-job-notes">{job.notes}</p>}
              <div className="commerce-job-controls">
                {job.stage !== 'cancelled' && (
                  <Can permission="production.update">
                    <label>Next stage
                      <select
                        aria-label={`Stage for ${job.garmentName}`}
                        value={job.stage}
                        disabled={stageMutation.isPending || job.stage === 'cancelled'}
                        onChange={(event) => {
                          if (allowedMoves[job.stage]?.includes(event.target.value)) {
                            stageMutation.mutate({ id: job._id, stage: event.target.value });
                          }
                        }}
                      >
                        {[job.stage, ...(job.stage === 'blocked' ? [job.blockedFromStage].filter(Boolean) : (allowedMoves[job.stage] || []))]
                          .map((option) => <option key={option} value={option}>{stageLabel(option)}</option>)}
                      </select>
                    </label>
                  </Can>
                )}
                {job.stage !== 'cancelled' && (
                  <Can permission="production.assign">
                    <label>Assigned tailor
                      <select
                        aria-label={`Tailor for ${job.garmentName}`}
                        value={job.assignedTailor?._id || ''}
                        disabled={assignMutation.isPending || tailorsQuery.isPending}
                        onChange={(event) => assignMutation.mutate({ id: job._id, tailorId: event.target.value })}
                      >
                        <option value="">Unassigned</option>
                        {(tailorsQuery.data || []).map((tailor) => <option key={tailor._id} value={tailor._id}>{tailorName(tailor)}</option>)}
                      </select>
                    </label>
                  </Can>
                )}
              </div>
              </article>
            ))}
          </div>
          <nav className="commerce-pagination" aria-label="Production pages">
            <span>{jobsQuery.data.pagination.total} jobs · Page {page} of {Math.max(1, jobsQuery.data.pagination.totalPages)}</span>
            <div>
              <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>Previous</button>
              <button type="button" onClick={() => setPage((value) => value + 1)} disabled={page >= jobsQuery.data.pagination.totalPages}>Next</button>
            </div>
          </nav>
        </>
      )}

      {canCreateJobs && canViewOrders && ordersQuery.isSuccess && ordersToCheck.length > 0 && (
        <section className="commerce-legacy-orders">
          <h2>Check or backfill production jobs</h2>
          <p>Ensure jobs exist for an order; already-created jobs are retained without duplicates.</p>
          <ul>{ordersToCheck.map((order) => (
            <li key={order._id}>
              <span><strong>{order.orderNumber}</strong> · {order.customer?.name || 'Customer'}</span>
              <button type="button" className="commerce-secondary" disabled={createJobsMutation.isPending} onClick={() => createJobsMutation.mutate(order._id)}>Ensure jobs</button>
            </li>
          ))}</ul>
        </section>
      )}
      {canAssign && tailorsQuery.isError && <div className="commerce-alert" role="alert">{getApiError(tailorsQuery.error, 'Unable to load available tailors')}</div>}
      {ordersQuery.isError && <div className="commerce-alert" role="alert">{getApiError(ordersQuery.error, 'Unable to load existing orders')}</div>}
    </main>
  );
}
