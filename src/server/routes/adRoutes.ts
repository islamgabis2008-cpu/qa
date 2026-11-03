import { Router, Request, Response } from 'express';
import { db } from '../db.js';

const router = Router();

// Public: Get Active Advertisements with Location Filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const { city, placement } = req.query;

    let query = `
      SELECT a.*, r.name as restaurant_name, r.logo_url as restaurant_logo, r.city as restaurant_city, r.rating as restaurant_rating
      FROM advertisements a
      LEFT JOIN restaurants r ON a.restaurant_id = r.id
      WHERE a.is_active = 1 AND (a.restaurant_id IS NULL OR r.is_active = 1)
    `;
    const params: any[] = [];

    if (placement) {
      query += ' AND a.placement = ?';
      params.push(placement);
    }

    if (city && typeof city === 'string' && city !== 'all' && city.trim() !== '') {
      query += ` AND (a.target_location = 'ALL' OR a.target_location LIKE ? OR ? LIKE '%' || a.target_location || '%')`;
      params.push(`%${city}%`, city);
    }

    query += ' ORDER BY a.id DESC LIMIT 20';

    const ads = await db.all(query, params);

    res.json({ success: true, count: ads.length, advertisements: ads });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch advertisements' });
  }
});

// Track Ad Click
router.post('/:id/click', async (req: Request, res: Response) => {
  try {
    const adId = req.params.id;
    await db.run('UPDATE advertisements SET clicks_count = clicks_count + 1 WHERE id = ?', [adId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not track click' });
  }
});

// Track Ad Impression
router.post('/:id/view', async (req: Request, res: Response) => {
  try {
    const adId = req.params.id;
    await db.run('UPDATE advertisements SET views_count = views_count + 1 WHERE id = ?', [adId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not track view' });
  }
});

export default router;
