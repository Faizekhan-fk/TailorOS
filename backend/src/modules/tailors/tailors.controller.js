import Tailor from '../../models/Tailor.js';
import User from '../../models/User.js';
import { scopedFilter } from '../../middleware/tenant.js';

export const createTailor = async (req, res, next) => {
  try {
    const { userId, specialization, experience, bankDetails } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!(await User.exists(scopedFilter(req, { _id: userId })))) {
      return res.status(400).json({ error: 'User does not belong to this shop' });
    }

    const tailor = new Tailor({ shopId: req.tenantId, user: userId, specialization, experience, bankDetails });
    await tailor.save();
    res.status(201).json({ success: true, tailor });
  } catch (error) {
    next(error);
  }
};

export const getTailors = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, available } = req.query;
    const skip = (page - 1) * limit;

    let query = scopedFilter(req);
    if (available === 'true') query.isAvailable = true;

    const total = await Tailor.countDocuments(query);
    const tailors = await Tailor.find(query)
      .populate('user', 'firstName lastName email phone')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ rating: -1 });

    res.json({ success: true, tailors, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    next(error);
  }
};

export const getTailorById = async (req, res, next) => {
  try {
    const tailor = await Tailor.findOne(scopedFilter(req, { _id: req.params.id })).populate('user');
    if (!tailor) return res.status(404).json({ error: 'Tailor not found' });
    res.json({ success: true, tailor });
  } catch (error) {
    next(error);
  }
};

export const updateTailor = async (req, res, next) => {
  try {
    const { userId, specialization, experience, rating, averageCompletionTime, currentWorkload, isAvailable, bankDetails } = req.body;
    if (userId && !(await User.exists(scopedFilter(req, { _id: userId })))) {
      return res.status(400).json({ error: 'User does not belong to this shop' });
    }
    const changes = Object.fromEntries(
      Object.entries({ user: userId, specialization, experience, rating, averageCompletionTime, currentWorkload, isAvailable, bankDetails })
        .filter(([, value]) => value !== undefined)
    );
    const tailor = await Tailor.findOneAndUpdate(
      scopedFilter(req, { _id: req.params.id }),
      changes,
      { new: true, runValidators: true }
    );
    if (!tailor) return res.status(404).json({ error: 'Tailor not found' });
    res.json({ success: true, message: 'Tailor updated', tailor });
  } catch (error) {
    next(error);
  }
};

export const deleteTailor = async (req, res, next) => {
  try {
    const tailor = await Tailor.findOneAndDelete(scopedFilter(req, { _id: req.params.id }));
    if (!tailor) return res.status(404).json({ error: 'Tailor not found' });
    res.json({ success: true, message: 'Tailor deleted' });
  } catch (error) {
    next(error);
  }
};
