import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole, AuthenticatedRequest, createNotification, logAudit } from '../auth.js';

const router = Router();

// List approved and active restaurants (Public/Customer)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, city, search } = req.query;
    let query = `
      SELECT r.*, rc.name_ar as category_name_ar, rc.name_fr as category_name_fr, rc.icon as category_icon
      FROM restaurants r
      JOIN restaurant_categories rc ON r.category_id = rc.id
      WHERE r.is_active = 1
    `;
    const params: any[] = [];

    if (category) {
      query += ' AND (rc.slug = ? OR rc.id = ?)';
      params.push(category, category);
    }

    if (city) {
      query += ' AND r.city LIKE ?';
      params.push(`%${city}%`);
    }

    if (search) {
      query += ' AND (r.name LIKE ? OR r.description_ar LIKE ? OR r.description_fr LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY r.rating DESC, r.review_count DESC';

    const restaurants = await db.all(query, params);
    res.json({ success: true, count: restaurants.length, restaurants });
  } catch (error) {
    console.error('Fetch restaurants error:', error);
    res.status(500).json({ success: false, error: 'Could not fetch restaurants' });
  }
});

// List restaurant categories
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await db.all('SELECT * FROM restaurant_categories ORDER BY id ASC');
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch categories' });
  }
});

// Single restaurant details + products + reviews
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const restaurant = await db.get(
      `SELECT r.*, rc.name_ar as category_name_ar, rc.name_fr as category_name_fr
       FROM restaurants r
       JOIN restaurant_categories rc ON r.category_id = rc.id
       WHERE r.id = ?`,
      [req.params.id]
    );

    if (!restaurant) {
      res.status(404).json({ success: false, error: 'Restaurant not found' });
      return;
    }

    // Products grouped by category
    const products = await db.all(
      `SELECT p.*, pc.name_ar as category_name_ar, pc.name_fr as category_name_fr, pc.icon as category_icon
       FROM products p
       JOIN product_categories pc ON p.category_id = pc.id
       WHERE p.restaurant_id = ?
       ORDER BY pc.sort_order ASC, p.id ASC`,
      [req.params.id]
    );

    // Reviews
    const reviews = await db.all(
      `SELECT rev.*, u.full_name as customer_name
       FROM reviews rev
       JOIN users u ON rev.customer_id = u.id
       WHERE rev.restaurant_id = ?
       ORDER BY rev.created_at DESC LIMIT 20`,
      [req.params.id]
    );

    res.json({
      success: true,
      restaurant,
      products,
      reviews
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch restaurant details' });
  }
});

// Restaurant Owner: Submit Restaurant Application
router.post('/apply', requireAuth, requireRole('RESTAURANT_OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ownerId = req.user!.id;
    const {
      restaurant_name,
      description_ar,
      description_fr,
      phone,
      address,
      city,
      category_id,
      logo_url,
      cover_url,
      opening_hours
    } = req.body;

    if (!restaurant_name || !phone || !address || !city || !category_id) {
      res.status(400).json({ success: false, error: 'Required fields missing' });
      return;
    }

    // Check if pending application already exists
    const existingPending = await db.get(
      'SELECT id FROM restaurant_applications WHERE owner_id = ? AND status = "PENDING"',
      [ownerId]
    );

    if (existingPending) {
      res.status(400).json({
        success: false,
        error: 'You already have a pending restaurant application / لديك طلب تسجيل قيد المراجعة حالياً'
      });
      return;
    }

    const result = await db.run(
      `INSERT INTO restaurant_applications
       (owner_id, restaurant_name, description_ar, description_fr, phone, address, city, category_id, logo_url, cover_url, opening_hours, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        ownerId,
        restaurant_name,
        description_ar || restaurant_name,
        description_fr || restaurant_name,
        phone,
        address,
        city,
        category_id,
        logo_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        cover_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
        opening_hours || '10:00 - 23:00'
      ]
    );

    await logAudit(ownerId, 'SUBMIT_RESTAURANT_APPLICATION', 'restaurant_applications', result.lastID, `Application for ${restaurant_name}`);

    // Notify admins
    const admins = await db.all("SELECT id FROM users WHERE role = 'ADMIN'");
    for (const admin of admins) {
      await createNotification(
        admin.id,
        'طلب تسجيل مطعم جديد',
        'Nouvelle demande de restaurant',
        `تم تقديم طلب اعتماد جديد للمطعم: ${restaurant_name}`,
        `Nouvelle demande d'approbation reçue pour : ${restaurant_name}`,
        'NEW_RESTAURANT_APPLICATION',
        result.lastID
      );
    }

    res.status(201).json({
      success: true,
      applicationId: result.lastID,
      message: 'Application submitted successfully. Waiting for admin approval / تم إرسال الطلب بنجاح وهو قيد المراجعة'
    });
  } catch (error) {
    console.error('Restaurant application error:', error);
    res.status(500).json({ success: false, error: 'Could not submit application' });
  }
});

// Restaurant Owner: Get my application status
router.get('/my/application', requireAuth, requireRole('RESTAURANT_OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const application = await db.get(
      `SELECT ra.*, rc.name_ar as category_name_ar, rc.name_fr as category_name_fr
       FROM restaurant_applications ra
       LEFT JOIN restaurant_categories rc ON ra.category_id = rc.id
       WHERE ra.owner_id = ?
       ORDER BY ra.id DESC LIMIT 1`,
      [req.user!.id]
    );

    const restaurant = await db.get('SELECT * FROM restaurants WHERE owner_id = ?', [req.user!.id]);

    res.json({
      success: true,
      application: application || null,
      restaurant: restaurant || null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch application' });
  }
});

export default router;
