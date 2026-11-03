import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './src/server/db.js';
import { runSeed } from './src/server/seed.js';
import { authenticateToken } from './src/server/auth.js';

// Import route modules
import authRoutes from './src/server/routes/authRoutes.js';
import restaurantRoutes from './src/server/routes/restaurantRoutes.js';
import productRoutes from './src/server/routes/productRoutes.js';
import cartRoutes from './src/server/routes/cartRoutes.js';
import orderRoutes from './src/server/routes/orderRoutes.js';
import ownerRoutes from './src/server/routes/ownerRoutes.js';
import courierRoutes from './src/server/routes/courierRoutes.js';
import adminRoutes from './src/server/routes/adminRoutes.js';
import notificationRoutes from './src/server/routes/notificationRoutes.js';
import docsRoutes from './src/server/routes/docsRoutes.js';
import adRoutes from './src/server/routes/adRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Base middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Attach user auth if token is present
app.use(authenticateToken);

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/courier', courierRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/advertisements', adRoutes);
app.use('/api', docsRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'DZ Order',
    country: 'Algeria',
    currency: 'DZD',
    time: new Date().toISOString()
  });
});

async function startServer() {
  try {
    // 1. Initialize SQLite Database & Seed initial Algerian data if empty
    console.log('[DZ Order] Initializing Database & Seed data...');
    await initDatabase();
    await runSeed();

    // 2. Setup Vite in dev or static files in production
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('[DZ Order] Vite dev middleware attached successfully');
    } else {
      const distPath = path.resolve(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }

    // 3. Start listening on Port 3000
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 DZ Order full-stack server running on http://0.0.0.0:${PORT}`);
      console.log(`📖 API Documentation available at http://0.0.0.0:${PORT}/api/docs`);
    });
  } catch (err) {
    console.error('Fatal server startup error:', err);
    process.exit(1);
  }
}

startServer();
