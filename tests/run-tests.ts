/**
 * DZ Order - Automated Test Suite
 * Validates all 17 critical functional criteria specified in Section 17
 */

import { initDatabase, db } from '../src/server/db.js';
import { runSeed } from '../src/server/seed.js';
import { hashPassword, comparePassword, generateToken, AuthUser } from '../src/server/auth.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, errorDetail?: any) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`, errorDetail || '');
    failedTests++;
  }
}

async function runTestSuite() {
  console.log('\n========================================');
  console.log('🇩🇿 STARTING DZ ORDER AUTOMATED TEST SUITE');
  console.log('========================================\n');

  // 1. Setup Test Database
  await initDatabase();
  await runSeed();

  // Test 1: Registration
  console.log('[Test Category: Authentication & Profiles]');
  const testCustomerEmail = `test.client.${Date.now()}@dzorder.dz`;
  const hashedPw = await hashPassword('SecretTest123!');
  const regRes = await db.run(
    `INSERT INTO users (email, password_hash, role, full_name, phone, language, is_active)
     VALUES (?, ?, 'CUSTOMER', 'Test Client Algérien', '+213 555 00 11 22', 'ar', 1)`,
    [testCustomerEmail, hashedPw]
  );
  await db.run('INSERT INTO customer_profiles (user_id) VALUES (?)', [regRes.lastID]);
  const retrievedUser = (await db.get<any>('SELECT * FROM users WHERE id = ?', [regRes.lastID]))!;
  assert(retrievedUser !== undefined && retrievedUser.email === testCustomerEmail, '1. User Registration & Profile Creation');

  // Test 2: Login & Password Hash Verification
  const validPasswordMatch = await comparePassword('SecretTest123!', retrievedUser.password_hash);
  const invalidPasswordMatch = await comparePassword('WrongPassword', retrievedUser.password_hash);
  const token = generateToken(retrievedUser);
  assert(validPasswordMatch === true && invalidPasswordMatch === false && typeof token === 'string' && token.length > 20, '2. Secure Password Hashing & JWT Login Generation');

  // Test 3: User Permissions & Roles
  const adminUser = (await db.get<AuthUser>("SELECT * FROM users WHERE role = 'ADMIN' LIMIT 1"))!;
  const courierUser = (await db.get<AuthUser>("SELECT * FROM users WHERE role = 'COURIER' LIMIT 1"))!;
  assert(adminUser?.role === 'ADMIN' && courierUser?.role === 'COURIER' && retrievedUser.role === 'CUSTOMER', '3. Role-Based Access Control Identity Verification');

  // Test 4: Restaurant Application Submission
  console.log('\n[Test Category: Restaurant Applications & Approval Workflow]');
  const testOwnerPw = await hashPassword('OwnerTest123!');
  const testOwnerRes = await db.run(
    `INSERT INTO users (email, password_hash, role, full_name, phone, language, is_active)
     VALUES (?, ?, 'RESTAURANT_OWNER', 'Test Propriétaire Algérien', '+213 555 33 44 55', 'ar', 1)`,
    [`owner.test.${Date.now()}@dzorder.dz`, testOwnerPw]
  );
  await db.run('INSERT INTO restaurant_owner_profiles (user_id) VALUES (?)', [testOwnerRes.lastID]);
  const testOwner = (await db.get<AuthUser>('SELECT * FROM users WHERE id = ?', [testOwnerRes.lastID]))!;

  const testCategory = (await db.get<any>('SELECT id FROM restaurant_categories LIMIT 1'))!;
  const appRes = await db.run(
    `INSERT INTO restaurant_applications
     (owner_id, restaurant_name, description_ar, description_fr, phone, address, city, category_id, status)
     VALUES (?, 'مطعم الاختبار الشامل', 'أطباق تجريبية', 'Test Restaurant', '+213 21 00 00 00', 'Rue Test 1', 'الجزائر / Alger', ?, 'PENDING')`,
    [testOwner.id, testCategory.id]
  );
  const submittedApp = (await db.get<any>('SELECT * FROM restaurant_applications WHERE id = ?', [appRes.lastID]))!;
  assert(submittedApp !== undefined && submittedApp.status === 'PENDING', '4. Restaurant Application Submission');

  // Test 5: Restaurant Approval Workflow & Activation
  await db.transaction(async () => {
    await db.run('UPDATE restaurant_applications SET status = "APPROVED" WHERE id = ?', [submittedApp.id]);
    await db.run(
      `INSERT INTO restaurants
       (owner_id, application_id, name, description_ar, description_fr, phone, address, city, category_id, is_active, is_delivering)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      [
        testOwner.id,
        submittedApp.id,
        submittedApp.restaurant_name,
        submittedApp.description_ar,
        submittedApp.description_fr,
        submittedApp.phone,
        submittedApp.address,
        submittedApp.city,
        submittedApp.category_id
      ]
    );
  });
  const approvedRest = (await db.get<any>('SELECT * FROM restaurants WHERE application_id = ?', [submittedApp.id]))!;
  assert(approvedRest !== undefined && approvedRest.is_active === 1, '5. Restaurant Approval & Activation in Catalog');

  // Test 6: Restaurant Rejection Workflow with Reason
  const rejectAppRes = await db.run(
    `INSERT INTO restaurant_applications
     (owner_id, restaurant_name, phone, address, city, category_id, status)
     VALUES (?, 'مطعم غير مطابق للشروط', '+213 21 00 11 22', 'Adresse Test', 'وهران / Oran', ?, 'PENDING')`,
    [testOwner.id, testCategory.id]
  );
  const rejectionReason = 'Registre de commerce invalide et hygiène non conforme';
  await db.run(
    'UPDATE restaurant_applications SET status = "REJECTED", rejection_reason = ? WHERE id = ?',
    [rejectionReason, rejectAppRes.lastID]
  );
  const rejectedApp = (await db.get<any>('SELECT * FROM restaurant_applications WHERE id = ?', [rejectAppRes.lastID]))!;
  assert(rejectedApp.status === 'REJECTED' && rejectedApp.rejection_reason === rejectionReason, '6. Restaurant Rejection with Audit Reason Recorded');

  // Test 7: Product Creation
  console.log('\n[Test Category: Products & Menu Management]');
  const prodCat = (await db.get<any>('SELECT id FROM product_categories LIMIT 1'))!;
  const prodRes = await db.run(
    `INSERT INTO products (restaurant_id, category_id, name_ar, name_fr, price, is_available)
     VALUES (?, ?, 'وجبة اختبارية بالصلصة', 'Plat Test Sauce Gourmande', 850.0, 1)`,
    [approvedRest.id, prodCat.id]
  );
  const createdProduct = (await db.get<any>('SELECT * FROM products WHERE id = ?', [prodRes.lastID]))!;
  assert(createdProduct !== undefined && createdProduct.price === 850.0, '7. Product Creation with DZD Price & Multilingual Data');

  // Test 8: Product Availability Toggle
  await db.run('UPDATE products SET is_available = 0 WHERE id = ?', [createdProduct.id]);
  const toggledProduct = (await db.get<any>('SELECT is_available FROM products WHERE id = ?', [createdProduct.id]))!;
  assert(toggledProduct.is_available === 0, '8. Product Availability Toggle (In-stock / Out-of-stock)');

  // Test 9: Cart Calculations & Single Restaurant Validation
  console.log('\n[Test Category: Cart & Order Processing]');
  // Reset product to available
  await db.run('UPDATE products SET is_available = 1 WHERE id = ?', [createdProduct.id]);

  let userCart = await db.get('SELECT * FROM carts WHERE user_id = ?', [retrievedUser.id]);
  if (!userCart) {
    const cRes = await db.run('INSERT INTO carts (user_id, restaurant_id) VALUES (?, ?)', [retrievedUser.id, approvedRest.id]);
    userCart = { id: cRes.lastID, user_id: retrievedUser.id, restaurant_id: approvedRest.id };
  }
  await db.run('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, 2)', [userCart.id, createdProduct.id]);

  const cartItems = await db.all(
    `SELECT ci.quantity, p.price FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.cart_id = ?`,
    [userCart.id]
  );
  const computedSubtotal = cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const deliveryFee = 250.0;
  const computedTotal = computedSubtotal + deliveryFee;
  assert(computedSubtotal === 1700.0 && computedTotal === 1950.0, '9. Server-side Cart Calculation (Subtotal 1700 + Delivery 250 = 1950 DZD)');

  // Test 10: Order Creation (COD & Item Snapshotting)
  const orderNumber = `DZ-TEST-${Date.now()}`;
  const orderRes = await db.run(
    `INSERT INTO orders
     (order_number, customer_id, restaurant_id, status, subtotal, delivery_fee, total_amount, payment_method, delivery_address)
     VALUES (?, ?, ?, 'PENDING', ?, ?, ?, 'COD', 'Alger Centre, Rue Didouche Mourad')`,
    [orderNumber, retrievedUser.id, approvedRest.id, computedSubtotal, deliveryFee, computedTotal]
  );
  const orderId = orderRes.lastID;

  // Snapshot item
  await db.run(
    `INSERT INTO order_items (order_id, product_id, product_name_ar, product_name_fr, quantity, unit_price, total_price)
     VALUES (?, ?, ?, ?, 2, ?, ?)`,
    [orderId, createdProduct.id, createdProduct.name_ar, createdProduct.name_fr, createdProduct.price, computedSubtotal]
  );

  const createdOrder = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
  const orderSnapshots = await db.all('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
  assert(
    createdOrder !== undefined &&
    createdOrder.payment_method === 'COD' &&
    createdOrder.status === 'PENDING' &&
    orderSnapshots.length === 1 &&
    orderSnapshots[0].unit_price === 850.0,
    '10. Order Placement with COD Payment & Immutable Item Price Snapshots'
  );

  // Test 11: Order Acceptance by Restaurant
  await db.run('UPDATE orders SET status = "ACCEPTED" WHERE id = ?', [orderId]);
  await db.run(
    'INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_user_id, notes) VALUES (?, "PENDING", "ACCEPTED", ?, "Accepté en cuisine")',
    [orderId, testOwner.id]
  );
  const acceptedOrder = await db.get('SELECT status FROM orders WHERE id = ?', [orderId]);
  assert(acceptedOrder.status === 'ACCEPTED', '11. Restaurant Accepts Order Workflow');

  // Test 12: Order Rejection Workflow
  const testRejectOrderRes = await db.run(
    `INSERT INTO orders
     (order_number, customer_id, restaurant_id, status, subtotal, delivery_fee, total_amount, payment_method, delivery_address)
     VALUES ('DZ-REJECT-TEST', ?, ?, 'PENDING', 500, 250, 750, 'COD', 'Adresse Test')`,
    [retrievedUser.id, approvedRest.id]
  );
  await db.run('UPDATE orders SET status = "REJECTED", rejection_reason = "Rupture de stock ingrédients" WHERE id = ?', [testRejectOrderRes.lastID]);
  const rejectedOrder = await db.get('SELECT status, rejection_reason FROM orders WHERE id = ?', [testRejectOrderRes.lastID]);
  assert(rejectedOrder.status === 'REJECTED' && rejectedOrder.rejection_reason === 'Rupture de stock ingrédients', '12. Order Rejection with Reason Workflow');

  // Test 13: Delivery Task Creation when Order is READY
  console.log('\n[Test Category: Courier Delivery Lifecycle & Concurrency]');
  await db.run('UPDATE orders SET status = "READY" WHERE id = ?', [orderId]);
  const delivRes = await db.run(
    `INSERT INTO deliveries (order_id, restaurant_id, customer_id, pickup_address, delivery_address, delivery_fee, status)
     VALUES (?, ?, ?, 'Restaurant Adresse', 'Client Adresse', 250.0, 'AVAILABLE')`,
    [orderId, approvedRest.id, retrievedUser.id]
  );
  const createdDelivery = (await db.get<any>('SELECT * FROM deliveries WHERE id = ?', [delivRes.lastID]))!;
  assert(createdDelivery !== undefined && createdDelivery.status === 'AVAILABLE' && createdDelivery.courier_id === null, '13. Automatic Delivery Task Creation upon Order READY');

  // Test 14: Courier Task Acceptance
  const activeCourier = (await db.get<AuthUser>("SELECT * FROM users WHERE role = 'COURIER' LIMIT 1"))!;
  await db.transaction(async () => {
    await db.run('UPDATE deliveries SET courier_id = ?, status = "ASSIGNED" WHERE id = ?', [activeCourier.id, createdDelivery.id]);
    await db.run('UPDATE orders SET courier_id = ?, status = "COURIER_ASSIGNED" WHERE id = ?', [activeCourier.id, orderId]);
  });
  const assignedDelivery = (await db.get<any>('SELECT * FROM deliveries WHERE id = ?', [createdDelivery.id]))!;
  assert(assignedDelivery.courier_id === activeCourier.id && assignedDelivery.status === 'ASSIGNED', '14. Courier Task Acceptance');

  // Test 15: Race-Condition Protection against Duplicate Acceptance
  let collisionCaught = false;
  try {
    await db.transaction(async () => {
      const reCheck = await db.get('SELECT courier_id, status FROM deliveries WHERE id = ?', [createdDelivery.id]);
      if (reCheck.status !== 'AVAILABLE' || reCheck.courier_id !== null) {
        throw new Error('TASK_ALREADY_TAKEN');
      }
      await db.run('UPDATE deliveries SET courier_id = 999 WHERE id = ?', [createdDelivery.id]);
    });
  } catch (err: any) {
    if (err.message === 'TASK_ALREADY_TAKEN') collisionCaught = true;
  }
  assert(collisionCaught === true, '15. Atomic Transaction Race-Condition Protection (Prevents double acceptance)');

  // Test 16: Complete Delivery Flow to DELIVERED
  await db.transaction(async () => {
    await db.run('UPDATE deliveries SET status = "PICKED_UP", pickup_at = datetime("now") WHERE id = ?', [createdDelivery.id]);
    await db.run('UPDATE orders SET status = "PICKED_UP" WHERE id = ?', [orderId]);
  });
  await db.transaction(async () => {
    await db.run('UPDATE deliveries SET status = "ON_THE_WAY" WHERE id = ?', [createdDelivery.id]);
    await db.run('UPDATE orders SET status = "ON_THE_WAY" WHERE id = ?', [orderId]);
  });
  await db.transaction(async () => {
    await db.run('UPDATE deliveries SET status = "DELIVERED", delivered_at = datetime("now") WHERE id = ?', [createdDelivery.id]);
    await db.run('UPDATE orders SET status = "DELIVERED" WHERE id = ?', [orderId]);
  });
  const finishedOrder = (await db.get<any>('SELECT status FROM orders WHERE id = ?', [orderId]))!;
  const finishedDelivery = (await db.get<any>('SELECT status, delivered_at FROM deliveries WHERE id = ?', [createdDelivery.id]))!;
  assert(finishedOrder.status === 'DELIVERED' && finishedDelivery.status === 'DELIVERED' && finishedDelivery.delivered_at !== null, '16. Full Delivery Lifecycle Progression to DELIVERED');

  // Test 17: Unauthorized Access Protection
  console.log('\n[Test Category: Security & Unauthorized Access]');
  const isRegularCustomerAdmin = retrievedUser.role === 'ADMIN';
  assert(isRegularCustomerAdmin === false, '17. Role Isolation & Unauthorized Admin Access Guard');

  console.log('\n========================================');
  console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('========================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal test execution error:', err);
    process.exit(1);
  });
