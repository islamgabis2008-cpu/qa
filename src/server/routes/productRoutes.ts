import { Router, Request, Response } from 'express';
import { db } from '../db.js';

const router = Router();

// Browse products across restaurants
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, search, restaurant_id } = req.query;

    let query = `
      SELECT p.*, r.name as restaurant_name, r.city as restaurant_city,
             pc.name_ar as category_name_ar, pc.name_fr as category_name_fr, pc.icon as category_icon
      FROM products p
      JOIN restaurants r ON p.restaurant_id = r.id
      JOIN product_categories pc ON p.category_id = pc.id
      WHERE p.is_available = 1 AND r.is_active = 1
    `;
    const params: any[] = [];

    if (category) {
      query += ' AND (pc.slug = ? OR pc.id = ?)';
      params.push(category, category);
    }

    if (restaurant_id) {
      query += ' AND p.restaurant_id = ?';
      params.push(restaurant_id);
    }

    if (search) {
      query += ' AND (p.name_ar LIKE ? OR p.name_fr LIKE ? OR p.description_ar LIKE ? OR p.description_fr LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY p.id DESC';

    const products = await db.all(query, params);
    res.json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch products' });
  }
});

// Product categories
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await db.all('SELECT * FROM product_categories ORDER BY sort_order ASC');
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch product categories' });
  }
});

// Single product
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const product = await db.get(
      `SELECT p.*, r.name as restaurant_name, r.id as restaurant_id, r.address as restaurant_address,
              pc.name_ar as category_name_ar, pc.name_fr as category_name_fr
       FROM products p
       JOIN restaurants r ON p.restaurant_id = r.id
       JOIN product_categories pc ON p.category_id = pc.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch product' });
  }
});

export default router;
