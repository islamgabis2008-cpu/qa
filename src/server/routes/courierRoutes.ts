import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole, AuthenticatedRequest, createNotification, logAudit } from '../auth.js';

const router = Router();

// Courier Profile & Status
router.get('/profile', requireAuth, requireRole('COURIER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const courierId = req.user!.id;
    const profile = await db.get('SELECT * FROM courier_profiles WHERE user_id = ?', [courierId]);

    const activeDelivery = await db.get(
      `SELECT d.*, o.order_number, o.total_amount, o.subtotal, o.delivery_fee_status, o.proposed_fee_by, o.delivery_instructions, o.status as order_status,
              r.name as restaurant_name, r.phone as restaurant_phone, r.city as restaurant_city,
              r.latitude as restaurant_lat, r.longitude as restaurant_lng,
              c.full_name as customer_name, c.phone as customer_phone
       FROM deliveries d
       JOIN orders o ON d.order_id = o.id
       JOIN restaurants r ON d.restaurant_id = r.id
       JOIN users c ON d.customer_id = c.id
       WHERE d.courier_id = ? AND d.status IN ('ASSIGNED', 'PICKED_UP', 'ON_THE_WAY')
       LIMIT 1`,
      [courierId]
    );

    const earnings = await db.get<{ total_earnings: number; completed_count: number }>(
      `SELECT COALESCE(SUM(delivery_fee), 0) as total_earnings, count(*) as completed_count
       FROM deliveries
       WHERE courier_id = ? AND status = 'DELIVERED'`,
      [courierId]
    );

    res.json({
      success: true,
      profile,
      activeDelivery: activeDelivery || null,
      earnings: {
        total: earnings?.total_earnings || 0,
        completedCount: earnings?.completed_count || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch courier profile' });
  }
});

// Courier Toggle Online / Offline (Requires GPS Location to go online)
router.post('/toggle-online', requireAuth, requireRole('COURIER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const courierId = req.user!.id;
    const { latitude, longitude } = req.body;
    const profile = await db.get('SELECT * FROM courier_profiles WHERE user_id = ?', [courierId]);

    if (!profile) {
      res.status(404).json({ success: false, error: 'Courier profile not found' });
      return;
    }

    if (!profile.is_approved) {
      res.status(403).json({
        success: false,
        error: 'Your account is pending admin approval / حسابك قيد المراجعة والاعتماد من قبل الإدارة'
      });
      return;
    }

    const goingOnline = profile.is_online === 0;

    // Strict GPS requirement to work: must provide valid GPS coordinates to go online
    if (goingOnline) {
      if (latitude === undefined || longitude === undefined || latitude === null || longitude === null || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
        res.status(400).json({
          success: false,
          error: 'GPS location is required to go online and receive delivery tasks / يجب تفعيل خدمة تحديد الموقع الجغرافي (GPS) للعمل واستقبال الطلبات'
        });
        return;
      }

      await db.run(
        'UPDATE courier_profiles SET is_online = 1, current_latitude = ?, current_longitude = ?, last_location_update = datetime("now") WHERE user_id = ?',
        [Number(latitude), Number(longitude), courierId]
      );
    } else {
      await db.run('UPDATE courier_profiles SET is_online = 0 WHERE user_id = ?', [courierId]);
    }

    const newOnlineStatus = goingOnline ? 1 : 0;

    res.json({
      success: true,
      is_online: newOnlineStatus,
      coordinates: goingOnline ? { latitude: Number(latitude), longitude: Number(longitude) } : null,
      message: newOnlineStatus === 1
        ? 'You are now ONLINE with GPS active / أنت متصل الآن مع تحديد موقعك الجغرافي وجاهز لاستقبال الطلبات'
        : 'You are now OFFLINE / تم إيقاف استقبال الطلبات'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not toggle online status' });
  }
});

// Update Courier GPS Location in real time
router.post('/update-location', requireAuth, requireRole('COURIER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const courierId = req.user!.id;
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
      res.status(400).json({ success: false, error: 'Valid GPS latitude and longitude are required' });
      return;
    }

    await db.run(
      'UPDATE courier_profiles SET current_latitude = ?, current_longitude = ?, last_location_update = datetime("now") WHERE user_id = ?',
      [Number(latitude), Number(longitude), courierId]
    );

    res.json({
      success: true,
      latitude: Number(latitude),
      longitude: Number(longitude),
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not update courier location' });
  }
});

// Available delivery tasks (Pool of tasks ready for pickup)
router.get('/tasks', requireAuth, requireRole('COURIER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const courierId = req.user!.id;
    const profile = await db.get('SELECT * FROM courier_profiles WHERE user_id = ?', [courierId]);

    if (!profile || !profile.is_approved) {
      res.status(403).json({ success: false, error: 'Courier account not approved yet' });
      return;
    }

    const availableTasks = await db.all(
      `SELECT d.*, o.order_number, o.total_amount, o.subtotal, o.delivery_fee_status, o.proposed_fee_by, o.delivery_instructions,
              r.name as restaurant_name, r.phone as restaurant_phone, r.city as restaurant_city,
              r.latitude as restaurant_lat, r.longitude as restaurant_lng,
              c.full_name as customer_name, c.phone as customer_phone
       FROM deliveries d
       JOIN orders o ON d.order_id = o.id
       JOIN restaurants r ON d.restaurant_id = r.id
       JOIN users c ON d.customer_id = c.id
       WHERE d.status = 'AVAILABLE' AND d.courier_id IS NULL AND o.status = 'READY'
       ORDER BY d.created_at ASC`
    );

    res.json({ success: true, count: availableTasks.length, tasks: availableTasks });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch delivery tasks' });
  }
});

// Accept delivery task with strict database transaction race condition protection
router.post('/tasks/:id/accept', requireAuth, requireRole('COURIER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const courierId = req.user!.id;
    const deliveryId = req.params.id;

    const profile = await db.get('SELECT * FROM courier_profiles WHERE user_id = ?', [courierId]);
    if (!profile || !profile.is_approved) {
      res.status(403).json({ success: false, error: 'Account not approved to take deliveries' });
      return;
    }

    if (profile.is_online !== 1 || !profile.current_latitude || !profile.current_longitude) {
      res.status(400).json({
        success: false,
        error: 'You must be online with active GPS location to accept deliveries / يجب تشغيل موقعك الجغرافي (GPS) والاتصال للعمل وقبول الطلبات'
      });
      return;
    }

    // Check if courier already has an active incomplete delivery
    const existingActive = await db.get(
      `SELECT id FROM deliveries WHERE courier_id = ? AND status IN ('ASSIGNED', 'PICKED_UP', 'ON_THE_WAY')`,
      [courierId]
    );

    if (existingActive) {
      res.status(400).json({
        success: false,
        error: 'You already have an active delivery task. Complete it first / لديك مهمة توصيل جارية حالياً، يرجى إتمامها أولاً'
      });
      return;
    }

    // ATOMIC TRANSACTION: Check status and assign in one locked operation
    const result = await db.transaction(async () => {
      // Re-read inside transaction
      const delivery = await db.get<{ id: number; order_id: number; status: string; courier_id: number | null }>(
        'SELECT id, order_id, status, courier_id FROM deliveries WHERE id = ?',
        [deliveryId]
      );

      if (!delivery || delivery.status !== 'AVAILABLE' || delivery.courier_id !== null) {
        throw new Error('TASK_ALREADY_TAKEN');
      }

      // Assign courier to delivery
      await db.run(
        `UPDATE deliveries SET courier_id = ?, status = 'ASSIGNED' WHERE id = ?`,
        [courierId, delivery.id]
      );

      // Update order status to COURIER_ASSIGNED
      await db.run(
        `UPDATE orders SET courier_id = ?, status = 'COURIER_ASSIGNED', updated_at = datetime('now') WHERE id = ?`,
        [courierId, delivery.order_id]
      );

      // Log status history
      await db.run(
        `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_user_id, notes)
         VALUES (?, 'READY', 'COURIER_ASSIGNED', ?, 'Mission acceptée par le coursier')`,
        [delivery.order_id, courierId]
      );

      return delivery;
    });

    // Notify customer
    const order = await db.get('SELECT customer_id, order_number FROM orders WHERE id = ?', [result.order_id]);
    if (order) {
      await createNotification(
        order.customer_id,
        'تم تعيين مندوب توصيل لطلبك',
        'Coursier assigné à votre commande',
        `الكابتن ${req.user!.full_name} في طريقه لاستلام طلبك #${order.order_number}`,
        `Le coursier ${req.user!.full_name} a pris en charge votre commande et se dirige vers le restaurant.`,
        'COURIER_ASSIGNED',
        result.order_id
      );
    }

    await logAudit(courierId, 'ACCEPT_DELIVERY_TASK', 'deliveries', Number(deliveryId), 'Courier accepted delivery task');

    res.json({ success: true, message: 'Delivery task accepted / تم قبول مهمة التوصيل بنجاح' });
  } catch (error: any) {
    if (error.message === 'TASK_ALREADY_TAKEN') {
      res.status(409).json({
        success: false,
        error: 'This task was already accepted by another courier / تم أخذ هذه المهمة من قبل مندوب آخر للتو'
      });
      return;
    }
    console.error('Accept task error:', error);
    res.status(500).json({ success: false, error: 'Could not accept task' });
  }
});

// Mark task PICKED_UP (Courier collected food from restaurant)
router.post('/tasks/:id/pickup', requireAuth, requireRole('COURIER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const courierId = req.user!.id;
    const delivery = await db.get('SELECT * FROM deliveries WHERE id = ? AND courier_id = ?', [req.params.id, courierId]);

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Delivery task not found' });
      return;
    }

    await db.transaction(async () => {
      await db.run(
        `UPDATE deliveries SET status = 'PICKED_UP', pickup_at = datetime('now') WHERE id = ?`,
        [delivery.id]
      );
      await db.run(
        `UPDATE orders SET status = 'PICKED_UP', updated_at = datetime('now') WHERE id = ?`,
        [delivery.order_id]
      );
      await db.run(
        `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_user_id, notes)
         VALUES (?, 'COURIER_ASSIGNED', 'PICKED_UP', ?, 'Commande récupérée par le coursier au restaurant')`,
        [delivery.order_id, courierId]
      );
    });

    const order = await db.get('SELECT customer_id, order_number FROM orders WHERE id = ?', [delivery.order_id]);
    if (order) {
      await createNotification(
        order.customer_id,
        'تم استلام طلبك من المطعم',
        'Commande récupérée',
        `استلم المندوب وجبتك الساخنة من المطعم بنجاح`,
        `Le coursier a récupéré votre commande au restaurant.`,
        'ORDER_PICKED_UP',
        delivery.order_id
      );
    }

    res.json({ success: true, message: 'Order marked as PICKED_UP / تم استلام الطلب من المطعم' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not update status' });
  }
});

// Mark task ON_THE_WAY (Courier driving towards customer)
router.post('/tasks/:id/on-the-way', requireAuth, requireRole('COURIER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const courierId = req.user!.id;
    const delivery = await db.get('SELECT * FROM deliveries WHERE id = ? AND courier_id = ?', [req.params.id, courierId]);

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Delivery task not found' });
      return;
    }

    await db.transaction(async () => {
      await db.run(
        `UPDATE deliveries SET status = 'ON_THE_WAY' WHERE id = ?`,
        [delivery.id]
      );
      await db.run(
        `UPDATE orders SET status = 'ON_THE_WAY', updated_at = datetime('now') WHERE id = ?`,
        [delivery.order_id]
      );
      await db.run(
        `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_user_id, notes)
         VALUES (?, 'PICKED_UP', 'ON_THE_WAY', ?, 'Coursier en route vers le client')`,
        [delivery.order_id, courierId]
      );
    });

    const order = await db.get('SELECT customer_id, order_number FROM orders WHERE id = ?', [delivery.order_id]);
    if (order) {
      await createNotification(
        order.customer_id,
        'المندوب في الطريق إليك الآن',
        'Le coursier est en route !',
        `المندوب يقترب من عنوانك لتسليم وجبتك الشهية`,
        `Votre coursier est en route vers votre adresse de livraison.`,
        'ORDER_ON_THE_WAY',
        delivery.order_id
      );
    }

    res.json({ success: true, message: 'Order is ON_THE_WAY / المندوب في الطريق' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not update status' });
  }
});

// Mark task DELIVERED (Order completed, cash collected)
router.post('/tasks/:id/complete', requireAuth, requireRole('COURIER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const courierId = req.user!.id;
    const delivery = await db.get('SELECT * FROM deliveries WHERE id = ? AND courier_id = ?', [req.params.id, courierId]);

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Delivery task not found' });
      return;
    }

    await db.transaction(async () => {
      await db.run(
        `UPDATE deliveries SET status = 'DELIVERED', delivered_at = datetime('now') WHERE id = ?`,
        [delivery.id]
      );
      await db.run(
        `UPDATE orders SET status = 'DELIVERED', updated_at = datetime('now') WHERE id = ?`,
        [delivery.order_id]
      );
      await db.run(
        `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_user_id, notes)
         VALUES (?, 'ON_THE_WAY', 'DELIVERED', ?, 'Livraison effectuée avec succès et montant perçu en espèces (COD)')`,
        [delivery.order_id, courierId]
      );
    });

    const order = await db.get('SELECT customer_id, order_number, total_amount FROM orders WHERE id = ?', [delivery.order_id]);
    if (order) {
      await createNotification(
        order.customer_id,
        'تم تسليم الطلب بنجاح! بالصحة والعافية',
        'Commande livrée avec succès !',
        `تم تسليم طلبك #${order.order_number}. نرجو لك وجبة شهية! يرجى تقييم تجربتك.`,
        `Votre commande #${order.order_number} a été livrée. Bon appétit ! N'hésitez pas à laisser un avis.`,
        'ORDER_DELIVERED',
        delivery.order_id
      );
    }

    await logAudit(courierId, 'COMPLETE_DELIVERY', 'deliveries', delivery.id, `Completed delivery for order #${delivery.order_id}`);

    res.json({
      success: true,
      message: 'Delivery completed successfully! Cash collected / تم تسليم الطلب واستلام المبلغ بنجاح'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not complete delivery' });
  }
});

// Courier delivery history
router.get('/history', requireAuth, requireRole('COURIER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const courierId = req.user!.id;
    const deliveries = await db.all(
      `SELECT d.*, o.order_number, o.total_amount, r.name as restaurant_name, c.full_name as customer_name
       FROM deliveries d
       JOIN orders o ON d.order_id = o.id
       JOIN restaurants r ON d.restaurant_id = r.id
       JOIN users c ON d.customer_id = c.id
       WHERE d.courier_id = ?
       ORDER BY d.created_at DESC`,
      [courierId]
    );

    res.json({ success: true, count: deliveries.length, deliveries });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch history' });
  }
});

export default router;
