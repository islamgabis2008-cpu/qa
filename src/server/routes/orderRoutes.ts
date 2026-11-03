import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, AuthenticatedRequest, createNotification, logAudit } from '../auth.js';

const router = Router();

// Create new Order (Customer checkout)
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.user!.id;
    const { address_id, delivery_address, delivery_instructions } = req.body;

    // Get customer cart
    const cart = await db.get('SELECT * FROM carts WHERE user_id = ?', [customerId]);
    if (!cart) {
      res.status(400).json({ success: false, error: 'Cart is empty' });
      return;
    }

    const items = await db.all(
      `SELECT ci.quantity, ci.notes, p.id as product_id, p.restaurant_id, p.price,
              p.name_ar, p.name_fr, p.is_available, r.name as restaurant_name, r.is_active, r.is_delivering, r.owner_id
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       JOIN restaurants r ON p.restaurant_id = r.id
       WHERE ci.cart_id = ?`,
      [cart.id]
    );

    if (items.length === 0) {
      res.status(400).json({ success: false, error: 'Your cart is empty / سلتك فارغة' });
      return;
    }

    // Verify all items are from the same restaurant
    const restaurantId = items[0].restaurant_id;
    const hasDifferent = items.some(i => i.restaurant_id !== restaurantId);
    if (hasDifferent) {
      res.status(400).json({ success: false, error: 'All items must belong to the same restaurant' });
      return;
    }

    // Verify restaurant is active and delivering
    if (!items[0].is_active || !items[0].is_delivering) {
      res.status(400).json({ success: false, error: 'Restaurant is currently closed or not delivering' });
      return;
    }

    // Check availability of each item
    for (const item of items) {
      if (!item.is_available) {
        res.status(400).json({
          success: false,
          error: `Item "${item.name_fr}" (${item.name_ar}) is currently out of stock / غير متوفر حالياً`
        });
        return;
      }
    }

    // Determine delivery address
    let finalDeliveryAddress = delivery_address;
    if (!finalDeliveryAddress && address_id) {
      const addr = await db.get('SELECT * FROM addresses WHERE id = ? AND user_id = ?', [address_id, customerId]);
      if (addr) {
        finalDeliveryAddress = `${addr.title} - ${addr.city}, ${addr.district}, ${addr.street} ${addr.building ? `(${addr.building})` : ''} - Tél: ${addr.phone}`;
      }
    }

    if (!finalDeliveryAddress) {
      res.status(400).json({ success: false, error: 'Delivery address is required / يرجى تحديد عنوان التوصيل' });
      return;
    }

    // Server-side calculation of subtotal, delivery fee and total
    const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

    const minOrderRow = await db.get("SELECT value FROM platform_settings WHERE key = 'min_order_amount'");
    const minOrder = minOrderRow ? parseFloat(minOrderRow.value) : 400;
    if (subtotal < minOrder) {
      res.status(400).json({
        success: false,
        error: `Minimum order amount is ${minOrder} DZD / الحد الأدنى للطلب هو ${minOrder} دج`
      });
      return;
    }

    // Delivery fee is negotiated directly between customer and courier
    const { proposed_delivery_fee } = req.body;
    const proposedFee = proposed_delivery_fee !== undefined && !isNaN(Number(proposed_delivery_fee)) && Number(proposed_delivery_fee) >= 0
      ? Number(proposed_delivery_fee)
      : 0;
    const delivery_fee = proposedFee;
    const delivery_fee_status = proposedFee > 0 ? 'PROPOSED_BY_CUSTOMER' : 'PENDING_AGREEMENT';
    const proposed_fee_by = proposedFee > 0 ? 'CUSTOMER' : null;
    const total_amount = subtotal + delivery_fee;

    // Generate unique order number: DZ-YYYY-RANDOM
    const orderNumber = `DZ-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    // Execute atomic transaction for order creation
    const orderId = await db.transaction(async () => {
      // 1. Create order
      const orderRes = await db.run(
        `INSERT INTO orders
         (order_number, customer_id, restaurant_id, status, subtotal, delivery_fee, delivery_fee_status, proposed_fee_by, total_amount, payment_method, delivery_address, delivery_instructions)
         VALUES (?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, 'COD', ?, ?)`,
        [orderNumber, customerId, restaurantId, subtotal, delivery_fee, delivery_fee_status, proposed_fee_by, total_amount, finalDeliveryAddress, delivery_instructions || '']
      );

      const createdOrderId = orderRes.lastID;

      // 2. Insert item snapshots
      for (const item of items) {
        await db.run(
          `INSERT INTO order_items
           (order_id, product_id, product_name_ar, product_name_fr, quantity, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [createdOrderId, item.product_id, item.name_ar, item.name_fr, item.quantity, item.price, item.price * item.quantity]
        );
      }

      // 3. Record status history
      await db.run(
        `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_user_id, notes)
         VALUES (?, NULL, 'PENDING', ?, 'Commande passée par le client (Paiement à la livraison COD)')`,
        [createdOrderId, customerId]
      );

      // 4. Clear user cart
      await db.run('DELETE FROM cart_items WHERE cart_id = ?', [cart.id]);
      await db.run('UPDATE carts SET restaurant_id = NULL WHERE id = ?', [cart.id]);

      return createdOrderId;
    });

    // Notify restaurant owner
    const restaurantOwnerId = items[0].owner_id;
    await createNotification(
      restaurantOwnerId,
      'طلب جديد قيد الانتظار',
      'Nouvelle commande reçue',
      `طلب جديد #${orderNumber} بمبلغ ${total_amount} دج بانتظار موافقتك`,
      `Nouvelle commande #${orderNumber} (${total_amount} DZD) en attente d'acceptation`,
      'NEW_ORDER',
      orderId
    );

    // Notify customer
    await createNotification(
      customerId,
      'تم تأكيد إرسال طلبك بنجاح',
      'Commande envoyée avec succès',
      `طلبك #${orderNumber} تم إرساله إلى ${items[0].restaurant_name} وهو قيد المراجعة`,
      `Votre commande #${orderNumber} a été transmise à ${items[0].restaurant_name}`,
      'ORDER_CONFIRMATION',
      orderId
    );

    await logAudit(customerId, 'CREATE_ORDER', 'orders', orderId, `Order #${orderNumber} placed for ${total_amount} DZD (COD)`);

    res.status(201).json({
      success: true,
      orderId,
      orderNumber,
      total_amount,
      payment_method: 'COD',
      message: 'Order placed successfully! Cash on delivery. / تم تسجيل الطلب بنجاح، الدفع نقداً عند الاستلام'
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ success: false, error: 'Could not create order' });
  }
});

// Customer order history
router.get('/my', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await db.all(
      `SELECT o.*, r.name as restaurant_name, r.logo_url as restaurant_logo, r.phone as restaurant_phone,
              (SELECT count(*) FROM order_items WHERE order_id = o.id) as total_items,
              (SELECT rating FROM reviews WHERE order_id = o.id) as user_rating
       FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.customer_id = ?
       ORDER BY o.created_at DESC`,
      [req.user!.id]
    );

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch order history' });
  }
});

// Single Order details
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const order = await db.get(
      `SELECT o.*, r.name as restaurant_name, r.phone as restaurant_phone, r.address as restaurant_address,
              r.logo_url as restaurant_logo, r.city as restaurant_city,
              r.latitude as restaurant_lat, r.longitude as restaurant_lng,
              c.full_name as customer_name, c.phone as customer_phone,
              courier.full_name as courier_name, courier.phone as courier_phone,
              cp.vehicle_type, cp.vehicle_plate,
              cp.current_latitude as courier_lat, cp.current_longitude as courier_lng,
              cp.last_location_update as courier_location_time
       FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       JOIN users c ON o.customer_id = c.id
       LEFT JOIN users courier ON o.courier_id = courier.id
       LEFT JOIN courier_profiles cp ON courier.id = cp.user_id
       WHERE o.id = ?`,
      [orderId]
    );

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    // Role check: customer, restaurant owner, assigned courier, or admin
    const isOwner = userRole === 'RESTAURANT_OWNER' && (await db.get('SELECT id FROM restaurants WHERE id = ? AND owner_id = ?', [order.restaurant_id, userId]));
    const isCourier = userRole === 'COURIER' && (order.courier_id === userId || order.status === 'READY');
    const isCustomer = userRole === 'CUSTOMER' && order.customer_id === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isCourier && !isCustomer && !isAdmin) {
      res.status(403).json({ success: false, error: 'Unauthorized to view this order' });
      return;
    }

    const items = await db.all('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
    const history = await db.all(
      `SELECT osh.*, u.full_name as changed_by_name
       FROM order_status_history osh
       LEFT JOIN users u ON osh.changed_by_user_id = u.id
       WHERE osh.order_id = ?
       ORDER BY osh.timestamp ASC`,
      [orderId]
    );

    const review = await db.get('SELECT * FROM reviews WHERE order_id = ?', [orderId]);
    const delivery = await db.get('SELECT * FROM deliveries WHERE order_id = ?', [orderId]);

    res.json({
      success: true,
      order,
      items,
      history,
      review: review || null,
      delivery: delivery || null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch order details' });
  }
});

// Customer Cancel Order (Only if still PENDING)
router.post('/:id/cancel', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const { reason } = req.body;

    const order = await db.get('SELECT * FROM orders WHERE id = ? AND customer_id = ?', [orderId, req.user!.id]);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    if (order.status !== 'PENDING') {
      res.status(400).json({
        success: false,
        error: 'Order cannot be cancelled as preparation has already started / لا يمكن إلغاء الطلب بعد قبوله وبدء تحضيره'
      });
      return;
    }

    await db.transaction(async () => {
      await db.run(
        `UPDATE orders SET status = 'CANCELLED', cancellation_reason = ?, updated_at = datetime('now') WHERE id = ?`,
        [reason || 'Annulé par le client', orderId]
      );
      await db.run(
        `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_user_id, notes)
         VALUES (?, 'PENDING', 'CANCELLED', ?, ?)`,
        [orderId, req.user!.id, reason ? `Annulé par le client: ${reason}` : 'Annulé par le client']
      );
    });

    await logAudit(req.user!.id, 'CANCEL_ORDER', 'orders', Number(orderId), 'Order cancelled by customer');

    res.json({ success: true, message: 'Order cancelled successfully / تم إلغاء الطلب بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not cancel order' });
  }
});

// Customer Review Restaurant
router.post('/:id/review', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ success: false, error: 'Rating must be between 1 and 5 stars' });
      return;
    }

    const order = await db.get('SELECT * FROM orders WHERE id = ? AND customer_id = ?', [orderId, req.user!.id]);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    if (order.status !== 'DELIVERED') {
      res.status(400).json({ success: false, error: 'You can only review completed and delivered orders' });
      return;
    }

    const existingReview = await db.get('SELECT id FROM reviews WHERE order_id = ?', [orderId]);
    if (existingReview) {
      res.status(400).json({ success: false, error: 'You have already reviewed this order' });
      return;
    }

    await db.transaction(async () => {
      await db.run(
        'INSERT INTO reviews (customer_id, restaurant_id, order_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
        [req.user!.id, order.restaurant_id, orderId, rating, comment || '']
      );

      // Recalculate restaurant average rating
      const stats = await db.get<{ avg_rating: number; count: number }>(
        'SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE restaurant_id = ?',
        [order.restaurant_id]
      );

      await db.run(
        'UPDATE restaurants SET rating = ROUND(?, 1), review_count = ? WHERE id = ?',
        [stats?.avg_rating || rating, stats?.count || 1, order.restaurant_id]
      );
    });

    res.status(201).json({ success: true, message: 'Review submitted! Thank you / شكراً على تقييمك' });
  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ success: false, error: 'Could not submit review' });
  }
});

// Customer Complaint
router.post('/:id/complaint', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const { subject, description } = req.body;

    if (!subject || !description) {
      res.status(400).json({ success: false, error: 'Subject and description are required' });
      return;
    }

    const result = await db.run(
      'INSERT INTO complaints (customer_id, order_id, subject, description, status) VALUES (?, ?, ?, ?, "OPEN")',
      [req.user!.id, orderId, subject, description]
    );

    // Notify admins
    const admins = await db.all("SELECT id FROM users WHERE role = 'ADMIN'");
    for (const admin of admins) {
      await createNotification(
        admin.id,
        'شكوى جديدة من زبون',
        'Nouvelle réclamation client',
        `شكوى بخصوص الطلب #${orderId}: ${subject}`,
        `Réclamation concernant la commande #${orderId}: ${subject}`,
        'NEW_COMPLAINT',
        result.lastID
      );
    }

    res.json({ success: true, message: 'Complaint registered', complaintId: result.lastID });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not submit complaint' });
  }
});

// Customer or Courier proposes/updates delivery fee
router.post('/:id/propose-delivery-fee', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { fee } = req.body;

    if (fee === undefined || isNaN(Number(fee)) || Number(fee) < 0) {
      res.status(400).json({ success: false, error: 'Valid delivery fee amount is required / يرجى إدخال مبلغ صالح لسعر التوصيل' });
      return;
    }

    const order = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    // Must be either the customer, the assigned courier, or an approved courier
    const isCustomer = order.customer_id === userId;
    const isCourier = userRole === 'COURIER';
    if (!isCustomer && !isCourier && userRole !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Not authorized to negotiate delivery fee for this order' });
      return;
    }

    const numericFee = Math.round(Number(fee));
    const newStatus = isCustomer ? 'PROPOSED_BY_CUSTOMER' : 'PROPOSED_BY_COURIER';
    const proposedBy = isCustomer ? 'CUSTOMER' : 'COURIER';
    const newTotal = order.subtotal + numericFee;

    await db.transaction(async () => {
      await db.run(
        `UPDATE orders SET
           delivery_fee = ?,
           delivery_fee_status = ?,
           proposed_fee_by = ?,
           total_amount = ?,
           updated_at = datetime('now')
         WHERE id = ?`,
        [numericFee, newStatus, proposedBy, newTotal, order.id]
      );

      await db.run(
        `UPDATE deliveries SET
           delivery_fee = ?,
           delivery_fee_status = ?,
           proposed_fee_by = ?
         WHERE order_id = ?`,
        [numericFee, newStatus, proposedBy, order.id]
      );
    });

    // Notify the other party
    if (isCustomer && order.courier_id) {
      await createNotification(
        order.courier_id,
        'اقتراح سعر توصيل جديد من الزبون',
        'Nouvelle proposition de livraison',
        `اقترح الزبون سعر توصيل ${numericFee} دج للطلب #${order.order_number}`,
        `Le client propose un tarif de livraison de ${numericFee} DZD pour la commande #${order.order_number}`,
        'DELIVERY_FEE_PROPOSED',
        order.id
      );
    } else if (isCourier) {
      await createNotification(
        order.customer_id,
        'اقتراح سعر توصيل من المندوب',
        'Proposition de tarif par le coursier',
        `اقترح المندوب سعر توصيل قدره ${numericFee} دج للطلب #${order.order_number}`,
        `Le coursier propose un tarif de livraison de ${numericFee} DZD pour votre commande #${order.order_number}`,
        'DELIVERY_FEE_PROPOSED',
        order.id
      );
    }

    res.json({
      success: true,
      message: 'Delivery fee proposed successfully / تم إرسال اقتراح سعر التوصيل بنجاح',
      delivery_fee: numericFee,
      total_amount: newTotal,
      delivery_fee_status: newStatus
    });
  } catch (error) {
    console.error('Propose delivery fee error:', error);
    res.status(500).json({ success: false, error: 'Could not propose delivery fee' });
  }
});

// Either party accepts the proposed delivery fee
router.post('/:id/accept-delivery-fee', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const order = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const isCustomer = order.customer_id === userId;
    const isCourier = order.courier_id === userId || userRole === 'COURIER';
    if (!isCustomer && !isCourier && userRole !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    await db.transaction(async () => {
      await db.run(
        `UPDATE orders SET delivery_fee_status = 'AGREED', updated_at = datetime('now') WHERE id = ?`,
        [order.id]
      );
      await db.run(
        `UPDATE deliveries SET delivery_fee_status = 'AGREED' WHERE order_id = ?`,
        [order.id]
      );
    });

    // Notify both parties of agreement
    if (order.courier_id) {
      await createNotification(
        order.courier_id,
        'تم الاتفاق على سعر التوصيل ✅',
        'Tarif de livraison convenu ✅',
        `تم قبول وتأكيد سعر التوصيل (${order.delivery_fee} دج) للطلب #${order.order_number}`,
        `Le tarif de livraison de ${order.delivery_fee} DZD a été validé d'un commun accord pour la commande #${order.order_number}`,
        'DELIVERY_FEE_AGREED',
        order.id
      );
    }

    await createNotification(
      order.customer_id,
      'تم الاتفاق على سعر التوصيل ✅',
      'Tarif de livraison convenu ✅',
      `تم الاتفاق على سعر التوصيل (${order.delivery_fee} دج) لطلبك #${order.order_number}. الإجمالي النهائي: ${order.total_amount} دج`,
      `Accord confirmé sur les frais de livraison (${order.delivery_fee} DZD). Montant total: ${order.total_amount} DZD.`,
      'DELIVERY_FEE_AGREED',
      order.id
    );

    res.json({
      success: true,
      message: 'Delivery fee agreed upon! / تم الاتفاق وتأكيد سعر التوصيل بين الطرفين بنجاح',
      delivery_fee: order.delivery_fee,
      total_amount: order.total_amount,
      delivery_fee_status: 'AGREED'
    });
  } catch (error) {
    console.error('Accept delivery fee error:', error);
    res.status(500).json({ success: false, error: 'Could not accept delivery fee' });
  }
});

export default router;
