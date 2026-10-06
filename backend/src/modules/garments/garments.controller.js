import Garment from '../../models/Garment.js';
import { scopedFilter } from '../../middleware/tenant.js';

export const createGarment = async (req, res, next) => {
  try {
    const { name, description, category, basePrice, estimatedDays, materials, specifications, image } = req.body;

    if (!name || !category || !basePrice) {
      return res.status(400).json({ error: 'Name, category, and base price are required' });
    }

    const garment = new Garment({
      shopId: req.tenantId,
      name,
      description,
      category,
      basePrice,
      estimatedDays,
      materials,
      specifications,
      image,
    });

    await garment.save();
    res.status(201).json({ success: true, garment });
  } catch (error) {
    next(error);
  }
};

export const getGarments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const skip = (page - 1) * limit;

    let query = scopedFilter(req, { isActive: true });
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Garment.countDocuments(query);
    const garments = await Garment.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      garments,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    next(error);
  }
};

export const getGarmentById = async (req, res, next) => {
  try {
    const garment = await Garment.findOne(scopedFilter(req, { _id: req.params.id }));

    if (!garment) {
      return res.status(404).json({ error: 'Garment not found' });
    }

    res.json({ success: true, garment });
  } catch (error) {
    next(error);
  }
};

export const updateGarment = async (req, res, next) => {
  try {
    const { name, description, category, basePrice, estimatedDays, materials, specifications, image, isActive } =
      req.body;

    const garment = await Garment.findOneAndUpdate(
      scopedFilter(req, { _id: req.params.id }),
      { name, description, category, basePrice, estimatedDays, materials, specifications, image, isActive },
      { new: true, runValidators: true }
    );

    if (!garment) {
      return res.status(404).json({ error: 'Garment not found' });
    }

    res.json({ success: true, message: 'Garment updated', garment });
  } catch (error) {
    next(error);
  }
};

export const deleteGarment = async (req, res, next) => {
  try {
    const garment = await Garment.findOneAndDelete(scopedFilter(req, { _id: req.params.id }));

    if (!garment) {
      return res.status(404).json({ error: 'Garment not found' });
    }

    res.json({ success: true, message: 'Garment deleted' });
  } catch (error) {
    next(error);
  }
};
