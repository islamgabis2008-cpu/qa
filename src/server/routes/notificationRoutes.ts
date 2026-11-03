import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';

const router = Router();

// User notifications
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notifications = await db.all(
      `SELECT * FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user!.id]
    );

    const unread = notifications.filter(n => !n.is_read).length;

    res.json({
      success: true,
      unreadCount: unread,
      notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch notifications' });
  }
});

// Mark one as read
router.patch('/:id/read', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await db.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user!.id]);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not update notification' });
  }
});

// Mark all as read
router.post('/read-all', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user!.id]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not mark all notifications as read' });
  }
});

export default router;
