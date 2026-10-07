import mongoose from 'mongoose';
import Garment from '../../models/Garment.js';
import Order from '../../models/Order.js';
import ProductionJob from '../../models/ProductionJob.js';
import Tailor from '../../models/Tailor.js';
import { scopedFilter } from '../../middleware/tenant.js';
import { publishBusinessEvent } from '../../services/businessEvents.js';
import { invalidateShopMetrics } from '../../services/metricsCache.js';

const transitionMap = {
  queued: ['cutting', 'blocked'],
  cutting: ['sewing', 'blocked'],
  sewing: ['fitting', 'finishing', 'blocked'],
  fitting: ['sewing', 'finishing', 'blocked'],
  finishing: ['quality_check', 'blocked'],
  quality_check: ['finishing', 'ready', 'blocked'],
  ready: ['finishing'],
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const populateProductionJob = (query) => query
  .populate('orderId', 'orderNumber status totalAmount deliveryDate')
  .populate('garmentId', 'name category')
  .populate({ path: 'assignedTailor', populate: { path: 'user', select: 'name firstName lastName email' } })
  .populate('createdBy', 'name firstName lastName');

export const createJobsForOrder = async (req, order) => {
  if (['cancelled', 'delivered'].includes(order.status)) {
    const error = new Error('Production jobs cannot be generated for a delivered or cancelled order');
    error.status = 409;
    throw error;
  }
  if (!order.items?.length) {
    const error = new Error('Order has no items to send to production');
    error.status = 409;
    throw error;
  }

  const jobs = [];
  for (const [index, item] of order.items.entries()) {
    const garment = item.garment
      ? await Garment.findOne(scopedFilter(req, { _id: item.garment })).select('name')
      : null;
    const job = await ProductionJob.findOneAndUpdate(
      scopedFilter(req, { orderId: order._id, orderItemIndex: index }),
      {
        $setOnInsert: {
          shopId: req.tenantId,
          orderId: order._id,
          orderItemIndex: index,
          garmentId: item.garment || null,
          garmentName: garment?.name || `Order item ${index + 1}`,
          quantity: item.quantity || 1,
          dueDate: order.deliveryDate || null,
          createdBy: req.user.userId,
          stage: 'queued',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    jobs.push(job);
  }
  return jobs;
};

export const listProductionJobs = async (req, filters) => {
  const query = scopedFilter(req);
  if (filters.stage) query.stage = filters.stage;
  if (filters.orderId) query.orderId = filters.orderId;
  if (filters.assignedTailor) query.assignedTailor = filters.assignedTailor;
  if (filters.search) {
    const expression = new RegExp(escapeRegex(filters.search), 'i');
    query.$or = [{ garmentName: expression }];
  }
  const total = await ProductionJob.countDocuments(query);
  const jobs = await populateProductionJob(ProductionJob.find(query))
    .sort({ dueDate: 1, createdAt: 1 })
    .skip((filters.page - 1) * filters.limit)
    .limit(filters.limit)
    .lean();
  return {
    jobs,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
};

export const getProductionJob = (req, id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  return populateProductionJob(ProductionJob.findOne(scopedFilter(req, { _id: id }))).lean();
};

const syncOrderProductionStatus = async (req, orderId) => {
  const [order, jobs] = await Promise.all([
    Order.findOne(scopedFilter(req, { _id: orderId })),
    ProductionJob.find(scopedFilter(req, { orderId })),
  ]);
  if (!order || ['delivered', 'cancelled'].includes(order.status)) return;
  const progressed = jobs.some((job) => !['queued', 'cancelled'].includes(job.stage));
  const allReady = jobs.length > 0 && jobs.every((job) => ['ready', 'cancelled'].includes(job.stage));
  const status = allReady ? 'ready' : progressed ? 'in-progress' : 'pending';
  if (order.status !== status) {
    order.status = status;
    await order.save();
  }
};

export const updateProductionStage = async (req, id, input) => {
  if (!mongoose.isValidObjectId(id)) return null;
  const job = await ProductionJob.findOne(scopedFilter(req, { _id: id }));
  if (!job) return null;
  const closedOrder = await Order.exists(scopedFilter(req, {
    _id: job.orderId,
    status: { $in: ['delivered', 'cancelled'] },
  }));
  if (closedOrder) {
    const error = new Error('Production jobs for delivered or cancelled orders cannot be changed');
    error.status = 409;
    throw error;
  }
  if (job.stage === 'cancelled') {
    const error = new Error('Cancelled production jobs cannot be changed');
    error.status = 409;
    throw error;
  }

  let allowedStages;
  if (job.stage === 'blocked') {
    allowedStages = job.blockedFromStage ? [job.blockedFromStage] : [];
  } else {
    allowedStages = transitionMap[job.stage] || [];
  }
  if (!allowedStages.includes(input.stage)) {
    const error = new Error(`Cannot move a ${job.stage} job to ${input.stage}`);
    error.status = 409;
    throw error;
  }

  const previousStage = job.stage === 'blocked' ? job.blockedFromStage : job.stage;
  job.stage = input.stage;
  job.blockedFromStage = input.stage === 'blocked' ? previousStage : null;
  if (input.notes !== undefined) job.notes = input.notes;
  if (!job.startedAt && input.stage !== 'queued') job.startedAt = new Date();
  job.readyAt = input.stage === 'ready' ? new Date() : null;
  job.updatedBy = req.user.userId;
  await job.save();
  await syncOrderProductionStatus(req, job.orderId);
  await publishBusinessEvent({
    shopId: req.tenantId,
    type: 'production.stage_changed',
    title: 'Production stage updated',
    message: `${job.garmentName} moved to ${job.stage.replaceAll('_', ' ')}.`,
    resourceType: 'production_job',
    resourceId: job._id,
  });
  await invalidateShopMetrics(req.tenantId);
  return populateProductionJob(ProductionJob.findById(job._id)).lean();
};

export const assignProductionJob = async (req, id, tailorId) => {
  if (!mongoose.isValidObjectId(id)) return null;
  const existingJob = await ProductionJob.findOne(scopedFilter(req, { _id: id })).select('orderId');
  if (!existingJob) return null;
  const closedOrder = await Order.exists(scopedFilter(req, {
    _id: existingJob.orderId,
    status: { $in: ['delivered', 'cancelled'] },
  }));
  if (closedOrder) {
    const error = new Error('Production jobs for delivered or cancelled orders cannot be assigned');
    error.status = 409;
    throw error;
  }
  if (tailorId) {
    const tailor = await Tailor.findOne(scopedFilter(req, { _id: tailorId, isAvailable: true }));
    if (!tailor) {
      const error = new Error('Available tailor not found in this shop');
      error.status = 404;
      throw error;
    }
  }
  const job = await ProductionJob.findOneAndUpdate(
    scopedFilter(req, { _id: id, stage: { $ne: 'cancelled' } }),
    { $set: { assignedTailor: tailorId, updatedBy: req.user.userId } },
    { new: true, runValidators: true }
  );
  if (!job) return null;
  return populateProductionJob(ProductionJob.findById(job._id)).lean();
};

export const cancelProductionForOrder = (req, orderId) => ProductionJob.updateMany(
  scopedFilter(req, { orderId, stage: { $ne: 'cancelled' } }),
  { $set: { stage: 'cancelled', blockedFromStage: null, updatedBy: req.user.userId } }
);
