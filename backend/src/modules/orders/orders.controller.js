import Order from '../../models/Order.js';
import Customer from '../../models/Customer.js';
import Garment from '../../models/Garment.js';
import User from '../../models/User.js';
import MeasurementProfile from '../../models/MeasurementProfile.js';
import { scopedFilter } from '../../middleware/tenant.js';

export const createOrder = async (req, res, next) => {
  try {
    const { customerId, items, totalAmount, deliveryDate, paymentMethod, notes } = req.body;

    if (!customerId || !items || !totalAmount) {
      return res.status(400).json({ error: 'Customer, items, and total amount are required' });
    }

    const customer = await Customer.findOne(scopedFilter(req, { _id: customerId }));
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found in this shop' });
    }

    const garmentIds = items.map((item) => item.garment).filter(Boolean);
    const garmentCount = await Garment.countDocuments(scopedFilter(req, { _id: { $in: garmentIds } }));
    if (garmentCount !== new Set(garmentIds.map(String)).size) {
      return res.status(400).json({ error: 'One or more garments do not belong to this shop' });
    }

    const currentProfile = customer.currentMeasurementProfileId
      ? await MeasurementProfile.findOne(scopedFilter(req, {
        _id: customer.currentMeasurementProfileId,
        customerId: customer._id,
      }))
      : null;
    const itemsWithSnapshots = [];
    for (const item of items) {
      const profile = item.measurementProfileId
        ? await MeasurementProfile.findOne(scopedFilter(req, { _id: item.measurementProfileId, customerId: customer._id }))
        : currentProfile;
      if (item.measurementProfileId && !profile) {
        return res.status(400).json({ error: 'Measurement profile does not belong to this customer' });
      }
      const itemWithSnapshot = { ...item };
      if (profile) {
        itemWithSnapshot.measurementProfileId = profile._id;
        itemWithSnapshot.measurementSnapshot = {
          profileId: profile._id,
          version: profile.version,
          templateId: profile.templateId,
          values: Object.fromEntries(profile.values),
          capturedAt: new Date(),
        };
      }
      itemsWithSnapshots.push(itemWithSnapshot);
    }

    const order = new Order({
      shopId: req.tenantId,
      customer: customerId,
      items: itemsWithSnapshots,
      totalAmount,
      deliveryDate,
      payment: { method: paymentMethod },
      notes,
      createdBy: req.user.userId,
    });

    await order.save();

    // Update customer stats
    customer.totalOrders += 1;
    customer.totalSpent += totalAmount;
    await customer.save();

    res.status(201).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, customerId } = req.query;
    const skip = (page - 1) * limit;

    let query = scopedFilter(req);
    if (status) query.status = status;
    if (customerId) query.customer = customerId;

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('customer', 'firstName lastName phone email')
      .populate('items.garment', 'name category')
      .populate('assignedTo', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne(scopedFilter(req, { _id: req.params.id }))
      .populate('customer')
      .populate('items.garment')
      .populate('assignedTo')
      .populate('createdBy');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

export const updateOrder = async (req, res, next) => {
  try {
    const { status, deliveryDate, assignedTo, payment, notes } = req.body;

    if (assignedTo && !(await User.exists(scopedFilter(req, { _id: assignedTo })))) {
      return res.status(400).json({ error: 'Assigned user does not belong to this shop' });
    }

    const order = await Order.findOneAndUpdate(
      scopedFilter(req, { _id: req.params.id }),
      { status, deliveryDate, assignedTo, payment, notes },
      { new: true, runValidators: true }
    )
      .populate('customer')
      .populate('items.garment')
      .populate('assignedTo');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true, message: 'Order updated', order });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findOneAndUpdate(
      scopedFilter(req, { _id: req.params.id }),
      { status: 'cancelled' },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true, message: 'Order cancelled', order });
  } catch (error) {
    next(error);
  }
};

export const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findOneAndDelete(scopedFilter(req, { _id: req.params.id }));

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true, message: 'Order deleted' });
  } catch (error) {
    next(error);
  }
};
