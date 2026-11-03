import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole, AuthenticatedRequest, createNotification, logAudit } from '../auth.js';

const router = Router();

// Apply admin authentication to all admin routes
router.use(requireAuth);
router.use(requireRole('ADMIN'));

// Admin Dashboard KPI Stats
router.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const totalCustomers = await db.get<{ count: number }>("SELECT count(*) as count FROM users WHERE role = 'CUSTOMER'");
    const totalOwners = await db.get<{ count: number }>("SELECT count(*) as count FROM users WHERE role = 'RESTAURANT_OWNER'");
    const totalCouriers = await db.get<{ count: number }>("SELECT count(*) as count FROM users WHERE role = 'COURIER'");

    const totalRestaurants = await db.get<{ count: number }>('SELECT count(*) as count FROM restaurants');
    const approvedRestaurants = await db.get<{ count: number }>('SELECT count(*) as count FROM restaurants WHERE is_active = 1');
    const pendingRestaurantApps = await db.get<{ count: number }>("SELECT count(*) as count FROM restaurant_applications WHERE status = 'PENDING'");
    const pendingCourierApps = await db.get<{ count: number }>("SELECT count(*) as count FROM courier_profiles WHERE approval_status = 'PENDING'");

    const totalOrders = await db.get<{ count: number }>('SELECT count(*) as count FROM orders');
    const activeDeliveries = await db.get<{ count: number }>("SELECT count(*) as count FROM deliveries WHERE status IN ('ASSIGNED', 'PICKED_UP', 'ON_THE_WAY')");
    const completedDeliveries = await db.get<{ count: number }>("SELECT count(*) as count FROM deliveries WHERE status = 'DELIVERED'");

    const financialStats = await db.get<{ total_sales: number; total_delivery_fees: number }>(
      `SELECT COALESCE(SUM(total_amount), 0) as total_sales, COALESCE(SUM(delivery_fee), 0) as total_delivery_fees
       FROM orders
       WHERE status = 'DELIVERED'`
    );

    const openComplaints = await db.get<{ count: number }>("SELECT count(*) as count FROM complaints WHERE status = 'OPEN'");

    const recentOrders = await db.all(
      `SELECT o.*, r.name as restaurant_name, c.full_name as customer_name
       FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       JOIN users c ON o.customer_id = c.id
       ORDER BY o.created_at DESC
       LIMIT 8`
    );

    res.json({
      success: true,
      stats: {
        totalCustomers: totalCustomers?.count || 0,
        totalOwners: totalOwners?.count || 0,
        totalCouriers: totalCouriers?.count || 0,
        totalRestaurants: totalRestaurants?.count || 0,
        approvedRestaurants: approvedRestaurants?.count || 0,
        pendingRestaurantApps: pendingRestaurantApps?.count || 0,
        pendingCourierApps: pendingCourierApps?.count || 0,
        totalOrders: totalOrders?.count || 0,
        activeDeliveries: activeDeliveries?.count || 0,
        completedDeliveries: completedDeliveries?.count || 0,
        totalSales: financialStats?.total_sales || 0,
        deliveryFees: financialStats?.total_delivery_fees || 0,
        openComplaints: openComplaints?.count || 0
      },
      recentOrders
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ success: false, error: 'Could not fetch admin dashboard stats' });
  }
});

// List Restaurant Applications
router.get('/restaurant-applications', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const applications = await db.all(
      `SELECT ra.*, u.full_name as owner_name, u.email as owner_email,
              rc.name_ar as category_name_ar, rc.name_fr as category_name_fr
       FROM restaurant_applications ra
       JOIN users u ON ra.owner_id = u.id
       JOIN restaurant_categories rc ON ra.category_id = rc.id
       ORDER BY CASE ra.status WHEN 'PENDING' THEN 1 ELSE 2 END, ra.created_at DESC`
    );

    res.json({ success: true, count: applications.length, applications });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch applications' });
  }
});

// Approve Restaurant Application
router.post('/restaurant-applications/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const appId = req.params.id;
    const adminId = req.user!.id;

    const application = await db.get('SELECT * FROM restaurant_applications WHERE id = ?', [appId]);
    if (!application) {
      res.status(404).json({ success: false, error: 'Application not found' });
      return;
    }

    if (application.status === 'APPROVED') {
      res.status(400).json({ success: false, error: 'Application is already approved' });
      return;
    }

    await db.transaction(async () => {
      // 1. Mark application as APPROVED
      await db.run(
        'UPDATE restaurant_applications SET status = "APPROVED", rejection_reason = NULL, updated_at = datetime("now") WHERE id = ?',
        [appId]
      );

      // 2. Prevent duplicate restaurant creation: check if restaurant already exists for this owner
      const existingRest = await db.get('SELECT id FROM restaurants WHERE owner_id = ?', [application.owner_id]);
      if (existingRest) {
        await db.run(
          `UPDATE restaurants SET
             application_id = ?,
             name = ?,
             description_ar = ?,
             description_fr = ?,
             phone = ?,
             address = ?,
             city = ?,
             category_id = ?,
             logo_url = ?,
             cover_url = ?,
             opening_hours = ?,
             is_active = 1,
             is_delivering = 1,
             updated_at = datetime('now')
           WHERE id = ?`,
          [
            appId,
            application.restaurant_name,
            application.description_ar,
            application.description_fr,
            application.phone,
            application.address,
            application.city,
            application.category_id,
            application.logo_url,
            application.cover_url,
            application.opening_hours,
            existingRest.id
          ]
        );
      } else {
        await db.run(
          `INSERT INTO restaurants
           (owner_id, application_id, name, description_ar, description_fr, phone, address, city, category_id, logo_url, cover_url, opening_hours, is_active, is_delivering)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
          [
            application.owner_id,
            appId,
            application.restaurant_name,
            application.description_ar,
            application.description_fr,
            application.phone,
            application.address,
            application.city,
            application.category_id,
            application.logo_url,
            application.cover_url,
            application.opening_hours
          ]
        );
      }
    });

    // Notify Restaurant Owner
    await createNotification(
      application.owner_id,
      'تهانينا! تم اعتماد مطعمك بنجاح',
      'Félicitations ! Votre restaurant a été approuvé',
      `تمت الموافقة على طلب اعتماد مطعم "${application.restaurant_name}". يمكنك الآن إضافة الوجبات واستقبال الطلبات!`,
      `Votre restaurant "${application.restaurant_name}" est désormais validé et actif sur DZ Order.`,
      'APPLICATION_APPROVED',
      Number(appId)
    );

    await logAudit(adminId, 'APPROVE_RESTAURANT', 'restaurant_applications', Number(appId), `Approved restaurant ${application.restaurant_name}`);

    res.json({ success: true, message: 'Restaurant application approved and restaurant activated / تم قبول المطعم وتفعيله بنجاح' });
  } catch (error) {
    console.error('Approve restaurant error:', error);
    res.status(500).json({ success: false, error: 'Could not approve application' });
  }
});

// Reject Restaurant Application with Reason
router.post('/restaurant-applications/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const appId = req.params.id;
    const adminId = req.user!.id;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      res.status(400).json({ success: false, error: 'Rejection reason is required / يجب تحديد سبب الرفض' });
      return;
    }

    const application = await db.get('SELECT * FROM restaurant_applications WHERE id = ?', [appId]);
    if (!application) {
      res.status(404).json({ success: false, error: 'Application not found' });
      return;
    }

    await db.transaction(async () => {
      await db.run(
        'UPDATE restaurant_applications SET status = "REJECTED", rejection_reason = ?, updated_at = datetime("now") WHERE id = ?',
        [reason.trim(), appId]
      );

      // If restaurant was created earlier, deactivate it
      await db.run('UPDATE restaurants SET is_active = 0 WHERE owner_id = ?', [application.owner_id]);
    });

    // Notify Owner
    await createNotification(
      application.owner_id,
      'تحديث بخصوص طلب اعتماد مطعمك',
      'Mise à jour concernant votre demande',
      `نأسف لإبلاغك بأنه تم رفض طلب اعتماد مطعم "${application.restaurant_name}". السبب: ${reason.trim()}`,
      `Votre demande pour le restaurant "${application.restaurant_name}" a été refusée. Motif : ${reason.trim()}`,
      'APPLICATION_REJECTED',
      Number(appId)
    );

    await logAudit(adminId, 'REJECT_RESTAURANT', 'restaurant_applications', Number(appId), `Rejected application with reason: ${reason.trim()}`);

    res.json({ success: true, message: 'Application rejected / تم رفض الطلب مع توثيق السبب وإشعار المالك' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not reject application' });
  }
});

// List Courier Applications
router.get('/courier-applications', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const couriers = await db.all(
      `SELECT cp.*, u.full_name, u.email, u.phone, u.is_active
       FROM courier_profiles cp
       JOIN users u ON cp.user_id = u.id
       ORDER BY CASE cp.approval_status WHEN 'PENDING' THEN 1 ELSE 2 END, cp.created_at DESC`
    );

    res.json({ success: true, count: couriers.length, couriers });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch courier applications' });
  }
});

// Approve Courier Application
router.post('/courier-applications/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const courierProfileId = req.params.id;
    const adminId = req.user!.id;

    const courier = await db.get('SELECT * FROM courier_profiles WHERE id = ?', [courierProfileId]);
    if (!courier) {
      res.status(404).json({ success: false, error: 'Courier profile not found' });
      return;
    }

    await db.run(
      `UPDATE courier_profiles SET is_approved = 1, approval_status = 'APPROVED', admin_notes = 'Dossier vérifié et validé' WHERE id = ?`,
      [courierProfileId]
    );

    await createNotification(
      courier.user_id,
      'تم قبول طلبك كمندوب توصيل',
      'Votre candidature de coursier est acceptée',
      'تهانينا! تمت الموافقة على حسابك كمندوب توصيل في DZ Order. يمكنك الآن فتح التطبيق والبدء بالعمل.',
      'Félicitations ! Vous êtes désormais coursier officiel DZ Order. Passez en ligne pour recevoir des courses.',
      'COURIER_APPROVED',
      Number(courierProfileId)
    );

    await logAudit(adminId, 'APPROVE_COURIER', 'courier_profiles', Number(courierProfileId), 'Approved courier application');

    res.json({ success: true, message: 'Courier approved / تم قبول المندوب بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not approve courier' });
  }
});

// Reject Courier Application
router.post('/courier-applications/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const courierProfileId = req.params.id;
    const adminId = req.user!.id;
    const { reason } = req.body;

    const courier = await db.get('SELECT * FROM courier_profiles WHERE id = ?', [courierProfileId]);
    if (!courier) {
      res.status(404).json({ success: false, error: 'Courier profile not found' });
      return;
    }

    await db.run(
      `UPDATE courier_profiles SET is_approved = 0, approval_status = 'REJECTED', admin_notes = ? WHERE id = ?`,
      [reason || 'Dossier incomplet ou non conforme', courierProfileId]
    );

    await createNotification(
      courier.user_id,
      'قرار بخصوص طلب التوصيل',
      'Décision candidature coursier',
      `نعتذر، لم يتم قبول طلبك كمندوب توصيل للسبب: ${reason || 'الملف غير مكتمل'}`,
      `Votre candidature n'a pas été retenue. Motif : ${reason || 'Dossier incomplet'}`,
      'COURIER_REJECTED',
      Number(courierProfileId)
    );

    await logAudit(adminId, 'REJECT_COURIER', 'courier_profiles', Number(courierProfileId), `Rejected courier: ${reason}`);

    res.json({ success: true, message: 'Courier rejected / تم رفض طلب المندوب' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not reject courier' });
  }
});

// List all users with filtering
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role, search } = req.query;
    let query = 'SELECT id, email, role, full_name, phone, language, is_active, created_at FROM users WHERE 1=1';
    const params: any[] = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    if (search) {
      query += ' AND (email LIKE ? OR full_name LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY id DESC';

    const users = await db.all(query, params);
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch users' });
  }
});

// Suspend or Reactivate User
router.patch('/users/:id/toggle-active', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const adminId = req.user!.id;

    if (Number(targetUserId) === adminId) {
      res.status(400).json({ success: false, error: 'Cannot deactivate yourself / لا يمكنك إيقاف حسابك الخاص' });
      return;
    }

    const user = await db.get('SELECT id, is_active, full_name FROM users WHERE id = ?', [targetUserId]);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const newActive = user.is_active === 1 ? 0 : 1;
    await db.run('UPDATE users SET is_active = ?, updated_at = datetime("now") WHERE id = ?', [newActive, targetUserId]);

    await logAudit(adminId, 'TOGGLE_USER_ACTIVE', 'users', Number(targetUserId), `Changed user active status to ${newActive}`);

    res.json({
      success: true,
      is_active: newActive,
      message: newActive === 1 ? 'User reactivated / تم تفعيل الحساب' : 'User suspended / تم إيقاف الحساب'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not toggle user status' });
  }
});

// All Orders
router.get('/orders', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await db.all(
      `SELECT o.*, r.name as restaurant_name, c.full_name as customer_name,
              courier.full_name as courier_name
       FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       JOIN users c ON o.customer_id = c.id
       LEFT JOIN users courier ON o.courier_id = courier.id
       ORDER BY o.created_at DESC`
    );

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch orders' });
  }
});

// All Deliveries
router.get('/deliveries', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const deliveries = await db.all(
      `SELECT d.*, o.order_number, o.total_amount, r.name as restaurant_name,
              c.full_name as customer_name, courier.full_name as courier_name
       FROM deliveries d
       JOIN orders o ON d.order_id = o.id
       JOIN restaurants r ON d.restaurant_id = r.id
       JOIN users c ON d.customer_id = c.id
       LEFT JOIN users courier ON d.courier_id = courier.id
       ORDER BY d.created_at DESC`
    );

    res.json({ success: true, count: deliveries.length, deliveries });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch deliveries' });
  }
});

// Platform Settings (Delivery fees, minimum order, etc.)
router.get('/settings', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await db.all('SELECT * FROM platform_settings');
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch settings' });
  }
});

router.post('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      res.status(400).json({ success: false, error: 'Key and value required' });
      return;
    }

    await db.run(
      'INSERT OR REPLACE INTO platform_settings (key, value, updated_at) VALUES (?, ?, datetime("now"))',
      [key, String(value)]
    );

    await logAudit(req.user!.id, 'UPDATE_SETTINGS', 'platform_settings', null, `Setting ${key} = ${value}`);

    const settings = await db.all('SELECT * FROM platform_settings');
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not update settings' });
  }
});

// Complaints Management
router.get('/complaints', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const complaints = await db.all(
      `SELECT c.*, u.full_name as customer_name, u.phone as customer_phone,
              o.order_number
       FROM complaints c
       JOIN users u ON c.customer_id = u.id
       LEFT JOIN orders o ON c.order_id = o.id
       ORDER BY CASE c.status WHEN 'OPEN' THEN 1 WHEN 'INVESTIGATING' THEN 2 ELSE 3 END, c.created_at DESC`
    );

    res.json({ success: true, count: complaints.length, complaints });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch complaints' });
  }
});

router.post('/complaints/:id/resolve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const complaintId = req.params.id;
    const { admin_notes, status = 'RESOLVED' } = req.body;

    await db.run(
      'UPDATE complaints SET status = ?, admin_notes = ?, resolved_at = datetime("now") WHERE id = ?',
      [status, admin_notes || 'Résolu par le support DZ Order', complaintId]
    );

    const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (complaint) {
      await createNotification(
        complaint.customer_id,
        'تمت معالجة شكواك',
        'Votre réclamation a été traitée',
        `تمت دراسة وحل شكواك بنجاح من قبل فريق خدمة الزبائن: ${admin_notes || 'شكراً لتواصلك معنا'}`,
        `Notre équipe a traité votre réclamation. Commentaire : ${admin_notes || 'Merci'}`,
        'COMPLAINT_RESOLVED',
        Number(complaintId)
      );
    }

    res.json({ success: true, message: 'Complaint updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not update complaint' });
  }
});

// Audit Logs
router.get('/audit-logs', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await db.all(
      `SELECT al.*, u.full_name as user_name, u.role as user_role
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT 100`
    );

    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch audit logs' });
  }
});

// Admin Advertisements Management (Home Page & Offers)
router.get('/advertisements', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const ads = await db.all(
      `SELECT a.*, r.name as restaurant_name, r.city as restaurant_city
       FROM advertisements a
       LEFT JOIN restaurants r ON a.restaurant_id = r.id
       ORDER BY a.created_at DESC`
    );
    res.json({ success: true, count: ads.length, advertisements: ads });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch advertisements' });
  }
});

router.post('/advertisements', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      restaurant_id,
      title_ar,
      title_fr,
      description_ar,
      description_fr,
      image_url,
      target_location = 'ALL',
      placement = 'HERO',
      badge_text,
      discount_percentage = 0
    } = req.body;

    if (!title_ar || !image_url) {
      res.status(400).json({
        success: false,
        error: 'Title and image are required / العنوان وصورة الإعلان مطلوبان'
      });
      return;
    }

    const result = await db.run(
      `INSERT INTO advertisements
       (restaurant_id, title_ar, title_fr, description_ar, description_fr, image_url, target_location, placement, badge_text, discount_percentage, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        restaurant_id ? Number(restaurant_id) : null,
        title_ar,
        title_fr || title_ar,
        description_ar || '',
        description_fr || '',
        image_url,
        target_location || 'ALL',
        placement || 'HERO',
        badge_text || '',
        Number(discount_percentage) || 0
      ]
    );

    await logAudit(req.user!.id, 'CREATE_ADMIN_AD', 'advertisements', result.lastID, `Created ad: ${title_ar}`);

    res.json({ success: true, message: 'Ad created successfully / تم نشر الإعلان بنجاح', adId: result.lastID });
  } catch (error) {
    console.error('Create ad error:', error);
    res.status(500).json({ success: false, error: 'Could not create advertisement' });
  }
});

router.put('/advertisements/:id/toggle', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adId = req.params.id;
    const ad = await db.get('SELECT * FROM advertisements WHERE id = ?', [adId]);
    if (!ad) {
      res.status(404).json({ success: false, error: 'Advertisement not found' });
      return;
    }

    const newStatus = ad.is_active === 1 ? 0 : 1;
    await db.run('UPDATE advertisements SET is_active = ?, updated_at = datetime("now") WHERE id = ?', [newStatus, adId]);
    res.json({ success: true, is_active: newStatus });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not toggle advertisement' });
  }
});

router.delete('/advertisements/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adId = req.params.id;
    await db.run('DELETE FROM advertisements WHERE id = ?', [adId]);
    await logAudit(req.user!.id, 'DELETE_ADMIN_AD', 'advertisements', Number(adId), 'Deleted advertisement');
    res.json({ success: true, message: 'Ad deleted successfully / تم حذف الإعلان بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not delete advertisement' });
  }
});

// Admin Live Courier Map View
router.get('/couriers/live-locations', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const couriers = await db.all(
      `SELECT u.id, u.full_name, u.phone, cp.vehicle_type, cp.vehicle_plate,
              cp.is_online, cp.current_latitude, cp.current_longitude, cp.last_location_update,
              d.id as active_delivery_id, d.status as delivery_status, r.name as restaurant_name
       FROM users u
       JOIN courier_profiles cp ON u.id = cp.user_id
       LEFT JOIN deliveries d ON u.id = d.courier_id AND d.status IN ('ASSIGNED', 'PICKED_UP', 'ON_THE_WAY')
       LEFT JOIN restaurants r ON d.restaurant_id = r.id
       WHERE u.role = 'COURIER' AND cp.is_approved = 1`
    );
    res.json({ success: true, count: couriers.length, couriers });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch courier locations' });
  }
});

export default router;
