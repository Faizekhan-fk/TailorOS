import { Router } from 'express';
import Shop from '../../models/Shop.js';
import { requireAuth, authorize } from '../../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const shops = await Shop.find({ status: 'ACTIVE' })
      .select('_id name')
      .sort({ name: 1 })
      .lean();

    return res.json({
      success: true,
      message: 'Shops loaded',
      data: { shops: shops.map(({ _id, name }) => ({ id: String(_id), name })) },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
