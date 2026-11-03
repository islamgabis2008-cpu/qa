import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.resolve(process.cwd(), 'dz_order.sqlite');

let sqlDb: Database | null = null;
let saveTimer: NodeJS.Timeout | null = null;

export function persistDb() {
  if (!sqlDb) return;
  try {
    const data = sqlDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to persist SQLite database to disk:', err);
  }
}

function schedulePersist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    persistDb();
  }, 100);
}

export async function getDb(): Promise<Database> {
  if (sqlDb) return sqlDb;

  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      sqlDb = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('Could not read existing SQLite file, creating new:', e);
      sqlDb = new SQL.Database();
    }
  } else {
    sqlDb = new SQL.Database();
  }

  // Enable foreign keys
  sqlDb.exec('PRAGMA foreign_keys = ON;');
  return sqlDb;
}

export const db = {
  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const database = await getDb();
    const stmt = database.prepare(sql);
    try {
      stmt.bind(params);
      if (stmt.step()) {
        const row = stmt.getAsObject() as T;
        return row;
      }
      return undefined;
    } finally {
      stmt.free();
    }
  },

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const database = await getDb();
    const stmt = database.prepare(sql);
    const results: T[] = [];
    try {
      stmt.bind(params);
      while (stmt.step()) {
        results.push(stmt.getAsObject() as T);
      }
      return results;
    } finally {
      stmt.free();
    }
  },

  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    const database = await getDb();
    database.run(sql, params);
    
    // Get last insert rowid
    const res = database.exec('SELECT last_insert_rowid() as id, changes() as changes');
    let lastID = 0;
    let changes = 0;
    if (res && res.length > 0 && res[0].values && res[0].values.length > 0) {
      lastID = Number(res[0].values[0][0]);
      changes = Number(res[0].values[0][1]);
    }
    
    schedulePersist();
    return { lastID, changes };
  },

  async exec(sql: string): Promise<void> {
    const database = await getDb();
    database.exec(sql);
    schedulePersist();
  },

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    const database = await getDb();
    database.exec('BEGIN TRANSACTION;');
    try {
      const result = await callback();
      database.exec('COMMIT;');
      schedulePersist();
      return result;
    } catch (error) {
      database.exec('ROLLBACK;');
      throw error;
    }
  }
};

/**
 * Initialize all 21 relational tables with foreign keys and indexes.
 */
export async function initDatabase(): Promise<void> {
  const schema = `
    -- 1. USERS
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('CUSTOMER', 'RESTAURANT_OWNER', 'COURIER', 'ADMIN')),
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'ar' CHECK (language IN ('ar', 'fr')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

    -- 2. CUSTOMER PROFILES
    CREATE TABLE IF NOT EXISTS customer_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      default_address_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 3. RESTAURANT OWNER PROFILES
    CREATE TABLE IF NOT EXISTS restaurant_owner_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      business_reg_number TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 4. COURIER PROFILES
    CREATE TABLE IF NOT EXISTS courier_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      vehicle_type TEXT NOT NULL DEFAULT 'MOTO' CHECK (vehicle_type IN ('MOTO', 'CAR', 'BICYCLE', 'VAN')),
      vehicle_plate TEXT,
      license_number TEXT,
      is_online INTEGER NOT NULL DEFAULT 0,
      is_approved INTEGER NOT NULL DEFAULT 0,
      approval_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
      admin_notes TEXT,
      current_latitude REAL,
      current_longitude REAL,
      last_location_update TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 5. RESTAURANT CATEGORIES
    CREATE TABLE IF NOT EXISTS restaurant_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_ar TEXT NOT NULL,
      name_fr TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 6. RESTAURANT APPLICATIONS
    CREATE TABLE IF NOT EXISTS restaurant_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      restaurant_name TEXT NOT NULL,
      description_ar TEXT,
      description_fr TEXT,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      logo_url TEXT,
      cover_url TEXT,
      opening_hours TEXT NOT NULL DEFAULT '09:00 - 23:00',
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
      rejection_reason TEXT,
      admin_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES restaurant_categories(id)
    );
    CREATE INDEX IF NOT EXISTS idx_rest_app_status ON restaurant_applications(status);

    -- 7. RESTAURANTS
    CREATE TABLE IF NOT EXISTS restaurants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER UNIQUE NOT NULL,
      application_id INTEGER,
      name TEXT NOT NULL,
      description_ar TEXT,
      description_fr TEXT,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      logo_url TEXT,
      cover_url TEXT,
      latitude REAL,
      longitude REAL,
      opening_hours TEXT NOT NULL DEFAULT '09:00 - 23:00',
      rating REAL NOT NULL DEFAULT 5.0,
      review_count INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_delivering INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES restaurant_categories(id),
      FOREIGN KEY (application_id) REFERENCES restaurant_applications(id)
    );
    CREATE INDEX IF NOT EXISTS idx_restaurants_active ON restaurants(is_active, is_delivering);

    -- 8. PRODUCT CATEGORIES
    CREATE TABLE IF NOT EXISTS product_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_ar TEXT NOT NULL,
      name_fr TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    -- 9. PRODUCTS
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      name_ar TEXT NOT NULL,
      name_fr TEXT NOT NULL,
      description_ar TEXT,
      description_fr TEXT,
      price REAL NOT NULL CHECK (price >= 0),
      image_url TEXT,
      is_available INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES product_categories(id)
    );
    CREATE INDEX IF NOT EXISTS idx_products_restaurant ON products(restaurant_id);

    -- 10. ADDRESSES
    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      city TEXT NOT NULL,
      district TEXT NOT NULL,
      street TEXT NOT NULL,
      building TEXT,
      notes TEXT,
      phone TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 11. CARTS
    CREATE TABLE IF NOT EXISTS carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      restaurant_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE SET NULL
    );

    -- 12. CART ITEMS
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cart_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      notes TEXT,
      FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE (cart_id, product_id)
    );

    -- 13. ORDERS
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      restaurant_id INTEGER NOT NULL,
      courier_id INTEGER,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'ACCEPTED', 'REJECTED', 'PREPARING', 'READY',
        'SEARCHING_COURIER', 'COURIER_ASSIGNED', 'PICKED_UP',
        'ON_THE_WAY', 'DELIVERED', 'CANCELLED'
      )),
      subtotal REAL NOT NULL,
      delivery_fee REAL NOT NULL DEFAULT 250.0,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'COD' CHECK (payment_method IN ('COD')),
      delivery_address TEXT NOT NULL,
      delivery_instructions TEXT,
      rejection_reason TEXT,
      cancellation_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES users(id),
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
      FOREIGN KEY (courier_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);

    -- 14. ORDER ITEMS (Snapshots of names and prices in DZD)
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name_ar TEXT NOT NULL,
      product_name_fr TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    -- 15. DELIVERIES
    CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER UNIQUE NOT NULL,
      courier_id INTEGER,
      restaurant_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      pickup_address TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      delivery_fee REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      pickup_at TEXT,
      delivered_at TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (courier_id) REFERENCES users(id),
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
      FOREIGN KEY (customer_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);

    -- 16. ORDER STATUS HISTORY
    CREATE TABLE IF NOT EXISTS order_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      changed_by_user_id INTEGER,
      notes TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
    );

    -- 17. NOTIFICATIONS
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title_ar TEXT NOT NULL,
      title_fr TEXT NOT NULL,
      message_ar TEXT NOT NULL,
      message_fr TEXT NOT NULL,
      type TEXT NOT NULL,
      reference_id INTEGER,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

    -- 18. REVIEWS
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      restaurant_id INTEGER NOT NULL,
      order_id INTEGER UNIQUE NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES users(id),
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    -- 19. COMPLAINTS
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      order_id INTEGER,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED')),
      admin_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT,
      FOREIGN KEY (customer_id) REFERENCES users(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    -- 20. PLATFORM SETTINGS
    CREATE TABLE IF NOT EXISTS platform_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 21. AUDIT LOGS
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- 22. RESTAURANT & PLATFORM ADVERTISEMENTS
    CREATE TABLE IF NOT EXISTS advertisements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id INTEGER,
      title_ar TEXT NOT NULL,
      title_fr TEXT NOT NULL,
      description_ar TEXT,
      description_fr TEXT,
      image_url TEXT NOT NULL,
      target_location TEXT NOT NULL DEFAULT 'ALL',
      placement TEXT NOT NULL DEFAULT 'HERO' CHECK (placement IN ('HERO', 'OFFERS', 'POPULAR')),
      badge_text TEXT,
      discount_percentage INTEGER DEFAULT 0,
      link_type TEXT DEFAULT 'RESTAURANT',
      product_id INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      clicks_count INTEGER NOT NULL DEFAULT 0,
      views_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ads_active_loc ON advertisements(is_active, target_location);

    -- 23. RESTAURANT CUSTOMER BROADCASTS
    CREATE TABLE IF NOT EXISTS customer_broadcasts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id INTEGER NOT NULL,
      title_ar TEXT NOT NULL,
      title_fr TEXT NOT NULL,
      message_ar TEXT NOT NULL,
      message_fr TEXT NOT NULL,
      target_audience TEXT NOT NULL DEFAULT 'ALL',
      target_location TEXT NOT NULL DEFAULT 'ALL',
      discount_code TEXT,
      sent_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_broadcasts_rest ON customer_broadcasts(restaurant_id);
  `;

  await db.exec(schema);

  // Safe migrations for table columns
  try { await db.exec('ALTER TABLE courier_profiles ADD COLUMN current_latitude REAL;'); } catch {}
  try { await db.exec('ALTER TABLE courier_profiles ADD COLUMN current_longitude REAL;'); } catch {}
  try { await db.exec('ALTER TABLE courier_profiles ADD COLUMN last_location_update TEXT;'); } catch {}
  try { await db.exec('ALTER TABLE restaurants ADD COLUMN latitude REAL;'); } catch {}
  try { await db.exec('ALTER TABLE restaurants ADD COLUMN longitude REAL;'); } catch {}
  try { await db.exec("ALTER TABLE orders ADD COLUMN delivery_fee_status TEXT DEFAULT 'PENDING_AGREEMENT';"); } catch {}
  try { await db.exec("ALTER TABLE orders ADD COLUMN proposed_fee_by TEXT;"); } catch {}
  try { await db.exec("ALTER TABLE deliveries ADD COLUMN delivery_fee_status TEXT DEFAULT 'PENDING_AGREEMENT';"); } catch {}
  try { await db.exec("ALTER TABLE deliveries ADD COLUMN proposed_fee_by TEXT;"); } catch {}

  // Backfill Algerian coordinates for any restaurants missing latitude/longitude
  const algerianCityCoordinates: Record<string, { lat: number; lng: number }> = {
    'Alger': { lat: 36.7538, lng: 3.0588 },
    'Oran': { lat: 35.6987, lng: -0.6349 },
    'Constantine': { lat: 36.3650, lng: 6.6147 },
    'Annaba': { lat: 36.9000, lng: 7.7667 },
    'Béjaïa': { lat: 36.7511, lng: 5.0567 },
    'Batna': { lat: 35.5558, lng: 6.1741 },
    'Sétif': { lat: 36.1911, lng: 5.4137 },
    'Blida': { lat: 36.4700, lng: 2.8300 },
    'Tlemcen': { lat: 34.8828, lng: -1.3167 }
  };

  try {
    const unlocated = await db.all<{ id: number; city: string }>('SELECT id, city FROM restaurants WHERE latitude IS NULL OR longitude IS NULL');
    for (const r of unlocated) {
      const base = algerianCityCoordinates[r.city] || algerianCityCoordinates['Alger'];
      const latOffset = (((r.id * 17) % 7) - 3) * 0.007;
      const lngOffset = (((r.id * 23) % 9) - 4) * 0.007;
      await db.run('UPDATE restaurants SET latitude = ?, longitude = ? WHERE id = ?', [
        base.lat + latOffset,
        base.lng + lngOffset,
        r.id
      ]);
    }
  } catch (err) {
    console.warn('Backfill coordinates notice:', err);
  }
}
