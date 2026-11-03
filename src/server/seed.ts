import { db, initDatabase } from './db.js';
import { hashPassword, ADMIN_MASTER, ensureMasterAdmin } from './auth.js';

export async function runSeed(): Promise<void> {
  console.log('--- Initializing database schema ---');
  await initDatabase();

  console.log('--- Ensuring Master Admin in Code ---');
  await ensureMasterAdmin();

  console.log('--- Seeding Platform Settings ---');
  await db.run(
    `INSERT OR REPLACE INTO platform_settings (key, value, description) VALUES
     ('default_delivery_fee', '250', 'Frais de livraison de base en Dinar Algérien (DZD)'),
     ('min_order_amount', '400', 'Montant minimum de commande en DZD'),
     ('platform_commission_percent', '10', 'Commission de la plateforme DZ Order (%)'),
     ('currency', 'DZD', 'Devise par défaut: Dinar Algérien')`
  );

  console.log('--- Seeding Standard Algerian Categories ---');
  // Restaurant Categories
  const restCats = [
    { ar: 'مأكولات تقليدية جزائرية', fr: 'Cuisine Traditionnelle Algérienne', slug: 'traditional', icon: '🍲' },
    { ar: 'مشاوي وفحم', fr: 'Grillades & Barbecue', slug: 'grill', icon: '🥩' },
    { ar: 'بيتزا وفطائر', fr: 'Pizzas & Galettes', slug: 'pizza', icon: '🍕' },
    { ar: 'برغر وساندويتش', fr: 'Burgers & Sandwiches', slug: 'burgers', icon: '🍔' },
    { ar: 'حلويات جزائرية وعصرية', fr: 'Pâtisseries & Desserts', slug: 'desserts', icon: '🍯' },
    { ar: 'مشروبات وعصائر', fr: 'Boissons & Jus Frais', slug: 'drinks', icon: '🥤' }
  ];

  for (const c of restCats) {
    await db.run(
      'INSERT OR IGNORE INTO restaurant_categories (name_ar, name_fr, slug, icon) VALUES (?, ?, ?, ?)',
      [c.ar, c.fr, c.slug, c.icon]
    );
  }

  // Product Categories
  const prodCats = [
    { ar: 'الأطباق الرئيسية التقليدية', fr: 'Plats Principaux Traditionnels', slug: 'traditional-dishes', icon: '🍲', order: 1 },
    { ar: 'المشاوي والسلطات', fr: 'Grillades & Salades', slug: 'grillades', icon: '🥩', order: 2 },
    { ar: 'البيتزا الجزائرية والإيطالية', fr: 'Pizzas & Calzones', slug: 'pizzas', icon: '🍕', order: 3 },
    { ar: 'البرغر والوجبات السريعة', fr: 'Burgers & Fast Food', slug: 'burgers-fastfood', icon: '🍔', order: 4 },
    { ar: 'المشروبات الغازية والعصائر', fr: 'Boissons & Rafraîchissements', slug: 'drinks-beverages', icon: '🥤', order: 5 },
    { ar: 'الحلويات الشرقية والجزائرية', fr: 'Douceurs & Desserts', slug: 'desserts-sweets', icon: '🍰', order: 6 }
  ];

  for (const pc of prodCats) {
    await db.run(
      'INSERT OR IGNORE INTO product_categories (name_ar, name_fr, slug, icon, sort_order) VALUES (?, ?, ?, ?, ?)',
      [pc.ar, pc.fr, pc.slug, pc.icon, pc.order]
    );
  }

  console.log('--- Database Prepared: Clean slate. No dummy restaurants, no fake accounts. ---');
}

// Allow direct CLI execution: tsx src/server/seed.ts
if (process.argv[1]?.endsWith('seed.ts')) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}
