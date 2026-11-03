import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';

const router = Router();

// Helper to get or create cart for user
async function getOrCreateCart(userId: number): Promise<any> {
  let cart = await db.get('SELECT * FROM carts WHERE user_id = ?', [userId]);
  if (!cart) {
    const res = await db.run('INSERT INTO carts (user_id) VALUES (?)', [userId]);
    cart = { id: res.lastID, user_id: userId, restaurant_id: null };
  }
  return cart;
}

// Get user cart with calculated server totals (supports guests with empty cart)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.json({
        success: true,
        cart: {
          id: 0,
          items: [],
          restaurant: null,
          subtotal: 0,
          delivery_fee: 0,
          total: 0,
          itemCount: 0
        }
      });
      return;
    }

    const cart = await getOrCreateCart(req.user.id);

    const items = await db.all(
      `SELECT ci.id, ci.cart_id, ci.product_id, ci.quantity, ci.notes,
              p.name_ar, p.name_fr, p.price, p.image_url, p.is_available, p.restaurant_id,
              r.name as restaurant_name, r.city as restaurant_city, r.address as restaurant_address
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       JOIN restaurants r ON p.restaurant_id = r.id
       WHERE ci.cart_id = ?`,
      [cart.id]
    );

    // Delivery fee is negotiated directly between customer and courier
    const delivery_fee = 0;

    let subtotal = 0;
    let restaurantInfo: any = null;

    if (items.length > 0) {
      subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
      restaurantInfo = {
        id: items[0].restaurant_id,
        name: items[0].restaurant_name,
        city: items[0].restaurant_city,
        address: items[0].restaurant_address
      };
    }

    const total = subtotal;

    res.json({
      success: true,
      cart: {
        id: cart.id,
        items,
        restaurant: restaurantInfo,
        subtotal,
        delivery_fee: 0,
        total,
        itemCount: items.reduce((acc, i) => acc + i.quantity, 0)
      }
    });
  } catch (error) {
    console.error('Fetch cart error:', error);
    res.status(500).json({ success: false, error: 'Could not fetch cart' });
  }
});

// Add item to cart
router.post('/items', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { product_id, quantity = 1, notes, clear_if_conflict = false } = req.body;

    if (!product_id || quantity < 1) {
      res.status(400).json({ success: false, error: 'Invalid product or quantity' });
      return;
    }

    // Check product in DB
    const product = await db.get(
      `SELECT p.*, r.name as restaurant_name, r.is_active as rest_active, r.is_delivering
       FROM products p
       JOIN restaurants r ON p.restaurant_id = r.id
       WHERE p.id = ?`,
      [product_id]
    );

    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    if (!product.is_available) {
      res.status(400).json({ success: false, error: 'Product is currently unavailable / هذا الطبق غير متوفر حالياً' });
      return;
    }

    if (!product.rest_active || !product.is_delivering) {
      res.status(400).json({ success: false, error: 'Restaurant is closed or not delivering / المطعم مغلق أو لا يستقبل طلبات' });
      return;
    }

    const cart = await getOrCreateCart(req.user!.id);

    // Check if cart already has items from another restaurant
    const existingItems = await db.all(
      `SELECT p.restaurant_id, r.name as restaurant_name
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       JOIN restaurants r ON p.restaurant_id = r.id
       WHERE ci.cart_id = ?
       LIMIT 1`,
      [cart.id]
    );

    if (existingItems.length > 0 && existingItems[0].restaurant_id !== product.restaurant_id) {
      if (!clear_if_conflict) {
        res.status(409).json({
          success: false,
          code: 'CART_RESTAURANT_CONFLICT',
          error: `Your cart contains items from "${existingItems[0].restaurant_name}". Each order must belong to one restaurant only. Would you like to clear your cart? / سلتك تحتوي على وجبات من مطعم آخر. هل تريد إفراغ السلة وبدء طلب جديد؟`,
          existingRestaurantName: existingItems[0].restaurant_name
        });
        return;
      } else {
        // Clear old cart items
        await db.run('DELETE FROM cart_items WHERE cart_id = ?', [cart.id]);
      }
    }

    // Update cart restaurant
    await db.run('UPDATE carts SET restaurant_id = ?, updated_at = datetime("now") WHERE id = ?', [product.restaurant_id, cart.id]);

    // Check if item already in cart
    const existingCartItem = await db.get(
      'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?',
      [cart.id, product_id]
    );

    if (existingCartItem) {
      await db.run(
        'UPDATE cart_items SET quantity = quantity + ?, notes = COALESCE(?, notes) WHERE id = ?',
        [quantity, notes, existingCartItem.id]
      );
    } else {
      await db.run(
        'INSERT INTO cart_items (cart_id, product_id, quantity, notes) VALUES (?, ?, ?, ?)',
        [cart.id, product_id, quantity, notes || '']
      );
    }

    res.json({ success: true, message: 'Item added to cart / تمت إضافة الوجبة للسلة' });
  } catch (error) {
    console.error('Cart add error:', error);
    res.status(500).json({ success: false, error: 'Could not add to cart' });
  }
});

// Update item quantity
router.patch('/items/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { quantity, notes } = req.body;
    const itemId = req.params.id;

    const item = await db.get(
      `SELECT ci.* FROM cart_items ci
       JOIN carts c ON ci.cart_id = c.id
       WHERE ci.id = ? AND c.user_id = ?`,
      [itemId, req.user!.id]
    );

    if (!item) {
      res.status(404).json({ success: false, error: 'Cart item not found' });
      return;
    }

    if (quantity <= 0) {
      await db.run('DELETE FROM cart_items WHERE id = ?', [itemId]);
    } else {
      await db.run(
        'UPDATE cart_items SET quantity = ?, notes = COALESCE(?, notes) WHERE id = ?',
        [quantity, notes, itemId]
      );
    }

    res.json({ success: true, message: 'Cart updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not update cart item' });
  }
});

// Remove item from cart
router.delete('/items/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await db.get(
      `SELECT ci.* FROM cart_items ci
       JOIN carts c ON ci.cart_id = c.id
       WHERE ci.id = ? AND c.user_id = ?`,
      [req.params.id, req.user!.id]
    );

    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found in cart' });
      return;
    }

    await db.run('DELETE FROM cart_items WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not remove item' });
  }
});

// Clear entire cart
router.delete('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cart = await getOrCreateCart(req.user!.id);
    await db.run('DELETE FROM cart_items WHERE cart_id = ?', [cart.id]);
    await db.run('UPDATE carts SET restaurant_id = NULL WHERE id = ?', [cart.id]);
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not clear cart' });
  }
});

export default router;
