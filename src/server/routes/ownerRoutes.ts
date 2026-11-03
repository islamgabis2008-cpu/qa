import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole, AuthenticatedRequest, createNotification, logAudit } from '../auth.js';

const router = Router();

// Middleware helper to ensure owner has an approved restaurant
async function getOwnerRestaurant(ownerId: number) {
  return db.get('SELECT * FROM restaurants WHERE owner_id = ?', [ownerId]);
}

// Get Owner Restaurant Details & Verification Status
router.get('/restaurant', requireAuth, requireRole('RESTAURANT_OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ownerId = req.user!.id;
    const restaurant = await getOwnerRestaurant(ownerId);
    const application = await db.get(
      `SELECT ra.*, rc.name_ar as category_name_ar, rc.name_fr as category_name_fr
       FROM restaurant_applications ra
       LEFT JOIN restaurant_categories rc ON ra.category_id = rc.id
       WHERE ra.owner_id = ?
       ORDER BY ra.id DESC LIMIT 1`,
      [ownerId]
    );

    res.json({
      success: true,
      restaurant: restaurant || null,
      application: application || null,
      isApproved: !!restaurant && restaurant.is_active === 1
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch owner restaurant' });
  }
});

// Update Owner Restaurant Settings (Hours, Delvery toggle, description)
router.put('/restaurant', requireAuth, requireRole('RESTAURANT_OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ownerId = req.user!.id;
    const restaurant = await getOwnerRestaurant(ownerId);
    if (!restaurant) {
      res.status(403).json({ success: false, error: 'Your restaurant has not been approved yet' });
      return;
    }

    const {
      name,
      description_ar,
      description_fr,
      phone,
      address,
      city,
      opening_hours,
      is_active,
      is_delivering,
      logo_url,
      cover_url
    } = req.body;

    await db.run(
      `UPDATE restaurants SET
         name = COALESCE(?, name),
         description_ar = COALESCE(?, description_ar),
         description_fr = COALESCE(?, description_fr),
         phone = COALESCE(?, phone),
         address = COALESCE(?, address),
         city = COALESCE(?, city),
         opening_hours = COALESCE(?, opening_hours),
         is_active = COALESCE(?, is_active),
         is_delivering = COALESCE(?, is_delivering),
         logo_url = COALESCE(?, logo_url),
         cover_url = COALESCE(?, cover_url),
         updated_at = datetime('now')
       WHERE id = ?`,
      [
        name,
        description_ar,
        description_fr,
        phone,
        address,
        city,
        opening_hours,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        is_delivering !== undefined ? (is_delivering ? 1 : 0) : null,
        logo_url,
        cover_url,
        restaurant.id
      ]
    );

    const updated = await getOwnerRestaurant(ownerId);
    res.json({ success: true, restaurant: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not update restaurant details' });
  }
});

// Owner Products CRUD
router.get('/products', requireAuth, requireRole('RESTAURANT_OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurant = await getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(403).json({ success: false, error: 'Approved restaurant required' });
      return;
    }

    const products = await db.all(
      `SELECT p.*, pc.name_ar as category_name_ar, pc.name_fr as category_name_fr
       FROM products p
       JOIN product_categories pc ON p.category_id = pc.id
       WHERE p.restaurant_id = ?
       ORDER BY p.id DESC`,
      [restaurant.id]
    );

    res.json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch products' });
  }
});

router.post('/products', requireAuth, requireRole('RESTAURANT_OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurant = await getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(403).json({ success: false, error: 'Approved restaurant required' });
      return;
    }

    const { category_id, name_ar, name_fr, description_ar, description_fr, price, image_url, is_available = 1 } = req.body;

    if (!category_id || !name_ar || !name_fr || price === undefined || price < 0) {
      res.status(400).json({ success: false, error: 'Product name, category and positive price are required' });
      return;
    }

    const result = await db.run(
      `INSERT INTO products (restaurant_id, category_id, name_ar, name_fr, description_ar, description_fr, price, image_url, is_available)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        restaurant.id,
        category_id,
        name_ar,
        name_fr,
        description_ar || name_ar,
        description_fr || name_fr,
        parseFloat(price),
        image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
        is_available ? 1 : 0
      ]
    );

    await logAudit(req.user!.id, 'CREATE_PRODUCT', 'products', result.lastID, `Created product ${name_fr}`);

    res.status(201).json({ success: true, productId: result.lastID, message: 'Product created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not create product' });
  }
});

router.put('/products/:id', requireAuth, requireRole('RESTAURANT_OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurant = await getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(403).json({ success: false, error: 'Approved restaurant required' });
      return;
    }

    const { category_id, name_ar, name_fr, description_ar, description_fr, price, image_url, is_available } = req.body;

    await db.run(
      `UPDATE products SET
         category_id = COALESCE(?, category_id),
         name_ar = COALESCE(?, name_ar),
         name_fr = COALESCE(?, name_fr),
         description_ar = COALESCE(?, description_ar),
         description_fr = COALESCE(?, description_fr),
         price = COALESCE(?, price),
         image_url = COALESCE(?, image_url),
         is_available = COALESCE(?, is_available),
         updated_at = datetime('now')
       WHERE id = ? AND restaurant_id = ?`,
      [
        category_id,
        name_ar,
        name_fr,
        description_ar,
        description_fr,
        price !== undefined ? parseFloat(price) : null,
        image_url,
        is_available !== undefined ? (is_available ? 1 : 0) : null,
        req.params.id,
        restaurant.id
      ]
    );

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not update product' });
  }
});

router.patch('/products/:id/toggle', requireAuth, requireRole('RESTAURANT_OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurant = await getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(403).json({ success: false, error: 'Approved restaurant required' });
      return;
    }

    const product = await db.get('SELECT id, is_available FROM products WHERE id = ? AND restaurant_id = ?', [req.params.id, restaurant.id]);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    const newStatus = product.is_available === 1 ? 0 : 1;
    await db.run('UPDATE products SET is_available = ?, updated_at = datetime("now") WHERE id = ?', [newStatus, product.id]);

    res.json({ success: true, is_available: newStatus });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not toggle product availability' });
  }
});

router.delete('/products/:id', requireAuth, requireRole('RESTAURANT_OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurant = await getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(403).json({ success: false, error: 'Approved restaurant required' });
      return;
    }

    await db.run('DELETE FROM products WHERE id = ? AND restaurant_id = ?', [req.params.id, restaurant.id]);
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not delete product' });
  }
});

// Incoming & Active Orders for Owner
router.get('/orders', requireAuth, requireRole('RESTAURANT_OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurant = await getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(403).json({ success: false, error: 'Approved restaurant required' });
      return;
    }

    const orders = await db.all(
      `SELECT o.*, c.full_name as customer_name, c.phone as customer_phone,
              courier.full_name as courier_name, courier.phone as courier_phone,
              (SELECT count(*) FROM order_items WHERE order_id = o.id) as total_items
       FROM orders o
       JOIN users c ON o.customer_id = c.id
       LEFT JOIN users courier ON o.courier_id = courier.id
       WHERE o.restaurant_id = ?
       ORDER BY o.created_at DESC`,
      [restaurant.id]
    );

    // Fetch items for each order
    for (const order of orders) {
      order.items = await db.all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    }

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch restaurant orders' });
  }
});

// Accept Order
router.post('/orders/:id/accept', requireAuth, requireRole('RESTAURANT_OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurant = await getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(403).json({ success: false, error: 'Approved restaurant required' });
      return;
    }

    const order = await db.get('SELECT * FROM orders WHERE id = ? AND restaurant_id = ?', [req.params.id, restaurant.id]);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    if (order.status !== 'PENDING') {
      res.status(400).json({ success: false, error: `Cannot accept order in status ${order.status}` });
      return;
    }

    await db.transaction(async () => {
      await db.run('UPDATE orders SET status = "ACCEPTED", updated_at = datetime("now") WHERE id = ?', [order.id]);
      await db.run(
        'INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_user_id, notes) VALUES (?, "PENDING", "ACCEPTED", ?, "Commande acceptée par le restaurant")',
        [order.id, req.user!.id]
      );
    });

    await createNotification(
      order.customer_id,
      'تم قبول طلبك من المطعم',
      'Commande acceptée',
      `وافق المطعم على طلبك #${order.order_number} وبدأ في إعداده فوراً`,
      `Votre commande #${order.order_number} a été acceptée et passe en cuisine.`,
      'ORDER_ACCEPTED',
      order.id
    );

    res.json({ success: true, message: 'Order accepted / تم قبول الطلب بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not accept order' });
  }
});

// Reject Order with Reason
router.post('/orders/:id/reject', requireAuth, requireRole('RESTAURANT_OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurant = await getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(403).json({ success: false, error: 'Approved restaurant required' });
      return;
    }

    const { reason } = req.body;
    if (!reason) {
      res.status(400).json({ success: false, error: 'Rejection reason is required / يرجى ذكر سبب رفض الطلب' });
      return;
    }

    const order = await db.get('SELECT * FROM orders WHERE id = ? AND restaurant_id = ?', [req.params.id, restaurant.id]);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    await db.transaction(async () => {
      await db.run(
        'UPDATE orders SET status = "REJECTED", rejection_reason = ?, updated_at = datetime("now") WHERE id = ?',
        [reason, order.id]
      );
      await db.run(
        'INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_user_id, notes) VALUES (?, ?, "REJECTED", ?, ?)',
        [order.id, order.status, req.user!.id, `Refusé par le restaurant: ${reason}`]
      );
    });

    await createNotification(
      order.customer_id,
      'نعتذر، تم رفض طلبك',
      'Commande refusée',
      `تم رفض طلبك #${order.order_number} للسبب التالي: ${reason}`,
      `Votre commande #${order.order_number} a été refusée pour la raison : ${reason}`,
      'ORDER_REJECTED',
      order.id
    );

    res.json({ success: true, message: 'Order rejected and customer notified / تم رفض الطلب وإشعار الزبون' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not reject order' });
  }
});

// Mark Order PREPARING
router.post('/orders/:id/preparing', requireAuth, requireRole('RESTAURANT_OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurant = await getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(403).json({ success: false, error: 'Approved restaurant required' });
      return;
    }

    const order = await db.get('SELECT * FROM orders WHERE id = ? AND restaurant_id = ?', [req.params.id, restaurant.id]);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    await db.transaction(async () => {
      await db.run('UPDATE orders SET status = "PREPARING", updated_at = datetime("now") WHERE id = ?', [order.id]);
      await db.run(
        'INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_user_id, notes) VALUES (?, ?, "PREPARING", ?, "Préparation des plats en cuisine")',
        [order.id, order.status, req.user!.id]
      );
    });

    await createNotification(
      order.customer_id,
      'الوجبة قيد التحضير في المطبخ',
      'Repas en préparation',
      `الشيف في ${restaurant.name} يقوم بتحضير وجبتك الساخنة الآن`,
      `Le chef prépare actuellement votre repas avec soin.`,
      'ORDER_PREPARING',
      order.id
    );

    res.json({ success: true, message: 'Order marked PREPARING' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not update order status' });
  }
});

// Mark Order READY -> Dispatches Delivery Task to Couriers
router.post('/orders/:id/ready', requireAuth, requireRole('RESTAURANT_OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurant = await getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(403).json({ success: false, error: 'Approved restaurant required' });
      return;
    }

    const order = await db.get('SELECT * FROM orders WHERE id = ? AND restaurant_id = ?', [req.params.id, restaurant.id]);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    await db.transaction(async () => {
      // 1. Update order status to READY
      await db.run('UPDATE orders SET status = "READY", updated_at = datetime("now") WHERE id = ?', [order.id]);

      // 2. Insert status history
      await db.run(
        'INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_user_id, notes) VALUES (?, ?, "READY", ?, "Commande prête pour ramassage par coursier")',
        [order.id, order.status, req.user!.id]
      );

      // 3. Create or update delivery task
      const existingDelivery = await db.get('SELECT id FROM deliveries WHERE order_id = ?', [order.id]);
      if (!existingDelivery) {
        await db.run(
          `INSERT INTO deliveries (order_id, restaurant_id, customer_id, pickup_address, delivery_address, delivery_fee, delivery_fee_status, proposed_fee_by, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE')`,
          [order.id, restaurant.id, order.customer_id, restaurant.address, order.delivery_address, order.delivery_fee, order.delivery_fee_status || 'PENDING_AGREEMENT', order.proposed_fee_by || null]
        );
      }
    });

    // Notify customer
    await createNotification(
      order.customer_id,
      'طلبك جاهز للتسليم',
      'Commande prête',
      `وجبتك جاهزة للتسليم وجاري البحث عن مندوب توصيل لنقلها إليك`,
      `Votre repas est prêt en cuisine et attend la prise en charge par un coursier.`,
      'ORDER_READY',
      order.id
    );

    // Broadcast notification to online approved couriers
    const onlineCouriers = await db.all(
      `SELECT u.id FROM users u
       JOIN courier_profiles cp ON u.id = cp.user_id
       WHERE u.role = 'COURIER' AND cp.is_approved = 1 AND cp.is_online = 1`
    );

    for (const courier of onlineCouriers) {
      await createNotification(
        courier.id,
        'مهمة توصيل جديدة متاحة',
        'Nouvelle livraison disponible',
        `طلب #${order.order_number} جاهز في ${restaurant.name} - عمولة التوصيل ${order.delivery_fee} دج`,
        `Course disponible : ${restaurant.name} -> ${order.delivery_address} (${order.delivery_fee} DZD)`,
        'NEW_DELIVERY_TASK',
        order.id
      );
    }

    res.json({
      success: true,
      message: 'Order marked READY. Delivery task dispatched to couriers! / الطلب جاهز وتم إرسال مهمة التوصيل إلى المناديب'
    });
  } catch (error) {
    console.error('Ready order error:', error);
    res.status(500).json({ success: false, error: 'Could not mark order ready' });
  }
});

// Sales Statistics for Owner Dashboard
router.get('/stats', requireAuth, requireRole('RESTAURANT_OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurant = await getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(403).json({ success: false, error: 'Approved restaurant required' });
      return;
    }

    const totalOrders = await db.get<{ count: number }>(
      'SELECT count(*) as count FROM orders WHERE restaurant_id = ?',
      [restaurant.id]
    );

    const completedOrders = await db.get<{ count: number; total_sales: number }>(
      `SELECT count(*) as count, COALESCE(SUM(subtotal), 0) as total_sales
       FROM orders
       WHERE restaurant_id = ? AND status = 'DELIVERED'`,
      [restaurant.id]
    );

    const pendingOrders = await db.get<{ count: number }>(
      `SELECT count(*) as count FROM orders WHERE restaurant_id = ? AND status IN ('PENDING', 'ACCEPTED', 'PREPARING', 'READY')`,
      [restaurant.id]
    );

    const topProducts = await db.all(
      `SELECT oi.product_name_fr, oi.product_name_ar, sum(oi.quantity) as total_sold, sum(oi.total_price) as revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.restaurant_id = ? AND o.status = 'DELIVERED'
       GROUP BY oi.product_name_fr
       ORDER BY total_sold DESC
       LIMIT 5`,
      [restaurant.id]
    );

    res.json({
      success: true,
      stats: {
        totalOrders: totalOrders?.count || 0,
        completedOrders: completedOrders?.count || 0,
        totalSales: completedOrders?.total_sales || 0,
        pendingOrders: pendingOrders?.count || 0,
        averageRating: restaurant.rating,
        reviewCount: restaurant.review_count,
        topProducts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch sales stats' });
  }
});

// -------------------- OWNER ADVERTISEMENTS CRUD --------------------
router.get('/advertisements', requireAuth, requireRole('RESTAURANT_OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurant = await getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(403).json({ success: false, error: 'Approved restaurant required' });
      return;
    }

    const ads = await db.all(
      `SELECT a.*, r.name as restaurant_name, r.logo_url as restaurant_logo
       FROM advertisements a
       JOIN restaurants r ON a.restaurant_id = r.id
       WHERE a.restaurant_id = ?
       ORDER BY a.id DESC`,
      [restaurant.id]
    );

    res.json({ success: true, count: ads.length, advertisements: ads });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch advertisements' });
  }
});

router.post('/advertisements', requireAuth, requireRole('RESTAURANT_OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurant = await getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(403).json({ success: false, error: 'Approved restaurant required' });
      return;
    }

    const {
      title_ar,
      title_fr,
      description_ar,
      description_fr,
      image_url,
      target_location = 'ALL',
      placement = 'HERO',
      badge_text,
      discount_percentage = 0,
      product_id
    } = req.body;

    if (!title_ar || !image_url) {
      res.status(400).json({ success: false, error: 'Ad title and image are required / عنوان الإعلان وصورته مطلوبان' });
      return;
    }

    const result = await db.run(
      `INSERT INTO advertisements
       (restaurant_id, title_ar, title_fr, description_ar, description_fr, image_url, target_location, placement, badge_text, discount_percentage, product_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        restaurant.id,
        title_ar,
        title_fr || title_ar,
        description_ar || '',
        description_fr || description_ar || '',
        image_url,
        target_location || 'ALL',
        placement || 'HERO',
        badge_text || '',
        parseInt(discount_percentage) || 0,
        product_id || null
      ]
    );

    await logAudit(req.user!.id, 'CREATE_AD', 'advertisements', result.lastID, `Created ad ${title_ar} targeting ${target_location}`);

    res.status(201).json({ success: true, adId: result.lastID, message: 'Ad created successfully / تم إنشاء ونشر الإعلان بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not create advertisement' });
  }
});

router.put('/advertisements/:id', requireAuth, requireRole('RESTAURANT_OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurant = await getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(403).json({ success: false, error: 'Approved restaurant required' });
      return;
    }

    const adId = req.params.id;
    const {
      title_ar,
      title_fr,
      description_ar,
      description_fr,
      image_url,
      target_location,
      placement,
      badge_text,
      discount_percentage,
      is_active
    } = req.body;

    await db.run(
      `UPDATE advertisements SET
         title_ar = COALESCE(?, title_ar),
         title_fr = COALESCE(?, title_fr),
         description_ar = COALESCE(?, description_ar),
         description_fr = COALESCE(?, description_fr),
         image_url = COALESCE(?, image_url),
         target_location = COALESCE(?, target_location),
         placement = COALESCE(?, placement),
         badge_text = COALESCE(?, badge_text),
         discount_percentage = COALESCE(?, discount_percentage),
         is_active = COALESCE(?, is_active),
         updated_at = datetime('now')
       WHERE id = ? AND restaurant_id = ?`,
      [
        title_ar,
        title_fr,
        description_ar,
        description_fr,
        image_url,
        target_location,
        placement,
        badge_text,
        discount_percentage !== undefined ? parseInt(discount_percentage) : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        adId,
        restaurant.id
      ]
    );

    res.json({ success: true, message: 'Ad updated successfully / تم تحديث الإعلان بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not update advertisement' });
  }
});

router.delete('/advertisements/:id', requireAuth, requireRole('RESTAURANT_OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurant = await getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(403).json({ success: false, error: 'Approved restaurant required' });
      return;
    }

    await db.run('DELETE FROM advertisements WHERE id = ? AND restaurant_id = ?', [req.params.id, restaurant.id]);
    res.json({ success: true, message: 'Ad deleted successfully / تم حذف الإعلان' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not delete advertisement' });
  }
});

// -------------------- CUSTOMER BROADCASTS / MESSAGES --------------------
router.get('/broadcasts', requireAuth, requireRole('RESTAURANT_OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurant = await getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(403).json({ success: false, error: 'Approved restaurant required' });
      return;
    }

    const broadcasts = await db.all(
      `SELECT * FROM customer_broadcasts WHERE restaurant_id = ? ORDER BY id DESC`,
      [restaurant.id]
    );

    res.json({ success: true, count: broadcasts.length, broadcasts });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch broadcasts' });
  }
});

router.post('/broadcasts', requireAuth, requireRole('RESTAURANT_OWNER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurant = await getOwnerRestaurant(req.user!.id);
    if (!restaurant) {
      res.status(403).json({ success: false, error: 'Approved restaurant required' });
      return;
    }

    const {
      title_ar,
      title_fr,
      message_ar,
      message_fr,
      target_audience = 'ALL',
      target_location = 'ALL',
      discount_code
    } = req.body;

    if (!title_ar || !message_ar) {
      res.status(400).json({ success: false, error: 'Title and message are required / عنوان الرسالة ومحتواها مطلوبان' });
      return;
    }

    // Determine recipient customers
    let targetCustomers: { id: number }[] = [];
    if (target_audience === 'PAST_CUSTOMERS') {
      targetCustomers = await db.all(
        `SELECT DISTINCT customer_id as id
         FROM orders
         WHERE restaurant_id = ? AND customer_id IS NOT NULL`,
        [restaurant.id]
      );
    } else {
      if (target_location && target_location !== 'ALL') {
        targetCustomers = await db.all(
          `SELECT DISTINCT u.id
           FROM users u
           LEFT JOIN addresses a ON u.id = a.user_id
           WHERE u.role = 'CUSTOMER' AND (a.city LIKE ? OR a.district LIKE ?)`,
          [`%${target_location}%`, `%${target_location}%`]
        );
        if (targetCustomers.length === 0) {
          targetCustomers = await db.all("SELECT id FROM users WHERE role = 'CUSTOMER'");
        }
      } else {
        targetCustomers = await db.all("SELECT id FROM users WHERE role = 'CUSTOMER'");
      }
    }

    // Save broadcast record
    const result = await db.run(
      `INSERT INTO customer_broadcasts
       (restaurant_id, title_ar, title_fr, message_ar, message_fr, target_audience, target_location, discount_code, sent_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        restaurant.id,
        title_ar,
        title_fr || title_ar,
        message_ar,
        message_fr || message_ar,
        target_audience,
        target_location,
        discount_code || null,
        targetCustomers.length
      ]
    );

    // Create real in-app notifications for each customer
    for (const cust of targetCustomers) {
      const fullTitleAr = `📢 [${restaurant.name}] ${title_ar}`;
      const fullTitleFr = `📢 [${restaurant.name}] ${title_fr || title_ar}`;
      const promoSuffix = discount_code ? `\n🏷️ كود الخصم: ${discount_code}` : '';

      await createNotification(
        cust.id,
        fullTitleAr,
        fullTitleFr,
        `${message_ar}${promoSuffix}`,
        'PROMO_BROADCAST',
        restaurant.id
      );
    }

    await logAudit(
      req.user!.id,
      'SEND_BROADCAST',
      'customer_broadcasts',
      result.lastID,
      `Sent broadcast to ${targetCustomers.length} customers in ${target_location}`
    );

    res.status(201).json({
      success: true,
      broadcastId: result.lastID,
      sentCount: targetCustomers.length,
      message: `تم إرسال الرسالة بنجاح إلى ${targetCustomers.length} زبون!`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not send customer broadcast' });
  }
});

export default router;
