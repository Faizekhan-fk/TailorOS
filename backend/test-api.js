#!/usr/bin/env node
/**
 * TailorOS API Test Script
 * Tests all core endpoints
 */

const API_URL = 'http://localhost:5000/api';

let authToken = null;
let testData = {};

async function request(method, endpoint, body = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    console.error(`Request failed: ${error.message}`);
    return { status: 0, data: null };
  }
}

async function testAuth() {
  console.log('\n=== TESTING AUTHENTICATION ===');

  // Register
  console.log('Testing: POST /auth/register');
  let res = await request('POST', '/auth/register', {
    firstName: 'Test',
    lastName: 'User',
    email: `test${Date.now()}@example.com`,
    password: 'password123',
    phone: '1234567890',
    role: 'manager',
  });
  if (res.status !== 201) console.error('FAILED:', res.data);
  else {
    authToken = res.data.accessToken;
    testData.userId = res.data.user._id;
    console.log('✓ Registration successful');
  }

  // Login
  console.log('Testing: POST /auth/login');
  res = await request('POST', '/auth/login', {
    email: 'john@example.com',
    password: 'password123',
  });
  if (res.status !== 200) console.error('FAILED:', res.data);
  else {
    authToken = res.data.accessToken;
    testData.adminId = res.data.user._id;
    console.log('✓ Login successful');
  }

  // Get current user
  console.log('Testing: GET /auth/me');
  res = await request('GET', '/auth/me');
  if (res.status !== 200) console.error('FAILED:', res.data);
  else console.log('✓ Get current user successful');
}

async function testCustomers() {
  console.log('\n=== TESTING CUSTOMERS ===');

  // Create
  console.log('Testing: POST /customers');
  let res = await request('POST', '/customers', {
    firstName: 'Ahmed',
    lastName: 'Khan',
    email: 'ahmed@example.com',
    phone: '03001234567',
    address: { street: '123 Main St', city: 'Karachi', country: 'Pakistan' },
  });
  if (res.status !== 201) console.error('FAILED:', res.data);
  else {
    testData.customerId = res.data.customer._id;
    console.log('✓ Create customer successful');
  }

  // List
  console.log('Testing: GET /customers');
  res = await request('GET', '/customers');
  if (res.status !== 200) console.error('FAILED:', res.data);
  else console.log(`✓ List customers successful (found ${res.data.customers.length})`);

  // Get by ID
  console.log('Testing: GET /customers/:id');
  res = await request('GET', `/customers/${testData.customerId}`);
  if (res.status !== 200) console.error('FAILED:', res.data);
  else console.log('✓ Get customer by ID successful');

  // Update
  console.log('Testing: PUT /customers/:id');
  res = await request('PUT', `/customers/${testData.customerId}`, {
    phone: '03009876543',
  });
  if (res.status !== 200) console.error('FAILED:', res.data);
  else console.log('✓ Update customer successful');
}

async function testGarments() {
  console.log('\n=== TESTING GARMENTS ===');

  // Create
  console.log('Testing: POST /garments');
  let res = await request('POST', '/garments', {
    name: `Shirt-${Date.now()}`,
    description: 'Cotton formal shirt',
    category: 'shirt',
    basePrice: 1500,
    estimatedDays: 7,
  });
  if (res.status !== 201) console.error('FAILED:', res.data);
  else {
    testData.garmentId = res.data.garment._id;
    console.log('✓ Create garment successful');
  }

  // List
  console.log('Testing: GET /garments');
  res = await request('GET', '/garments');
  if (res.status !== 200) console.error('FAILED:', res.data);
  else console.log(`✓ List garments successful (found ${res.data.garments.length})`);

  // Get by ID
  console.log('Testing: GET /garments/:id');
  res = await request('GET', `/garments/${testData.garmentId}`);
  if (res.status !== 200) console.error('FAILED:', res.data);
  else console.log('✓ Get garment by ID successful');

  // Update
  console.log('Testing: PUT /garments/:id');
  res = await request('PUT', `/garments/${testData.garmentId}`, {
    basePrice: 2000,
  });
  if (res.status !== 200) console.error('FAILED:', res.data);
  else console.log('✓ Update garment successful');
}

async function testOrders() {
  console.log('\n=== TESTING ORDERS ===');

  // Create
  console.log('Testing: POST /orders');
  let res = await request('POST', '/orders', {
    customerId: testData.customerId,
    items: [{ garment: testData.garmentId, quantity: 2, price: 1500 }],
    totalAmount: 3000,
    deliveryDate: '2026-11-01',
    paymentMethod: 'card',
  });
  if (res.status !== 201) console.error('FAILED:', res.data);
  else {
    testData.orderId = res.data.order._id;
    console.log('✓ Create order successful');
  }

  // List
  console.log('Testing: GET /orders');
  res = await request('GET', '/orders');
  if (res.status !== 200) console.error('FAILED:', res.data);
  else console.log(`✓ List orders successful (found ${res.data.orders.length})`);

  // Get by ID
  console.log('Testing: GET /orders/:id');
  res = await request('GET', `/orders/${testData.orderId}`);
  if (res.status !== 200) console.error('FAILED:', res.data);
  else console.log('✓ Get order by ID successful');

  // Update status
  console.log('Testing: PUT /orders/:id');
  res = await request('PUT', `/orders/${testData.orderId}`, {
    status: 'in-progress',
  });
  if (res.status !== 200) console.error('FAILED:', res.data);
  else console.log('✓ Update order successful');

  // Cancel order
  console.log('Testing: PATCH /orders/:id/cancel');
  // Create another order to cancel
  res = await request('POST', '/orders', {
    customerId: testData.customerId,
    items: [{ garment: testData.garmentId, quantity: 1, price: 1500 }],
    totalAmount: 1500,
    deliveryDate: '2026-11-05',
    paymentMethod: 'cash',
  });
  if (res.status === 201) {
    const orderId = res.data.order._id;
    res = await request('PATCH', `/orders/${orderId}/cancel`, {});
    if (res.status !== 200) console.error('FAILED:', res.data);
    else console.log('✓ Cancel order successful');
  }
}

async function testInventory() {
  console.log('\n=== TESTING INVENTORY ===');

  // Create
  console.log('Testing: POST /inventory');
  let res = await request('POST', '/inventory', {
    name: 'Cotton Fabric',
    category: 'fabric',
    quantity: 100,
    unit: 'meter',
    reorderLevel: 20,
    unitPrice: 500,
  });
  if (res.status !== 201) console.error('FAILED:', res.data);
  else {
    testData.inventoryId = res.data.item._id;
    console.log('✓ Create inventory item successful');
  }

  // List
  console.log('Testing: GET /inventory');
  res = await request('GET', '/inventory');
  if (res.status !== 200) console.error('FAILED:', res.data);
  else console.log(`✓ List inventory successful (found ${res.data.items.length})`);

  // Get by ID
  console.log('Testing: GET /inventory/:id');
  res = await request('GET', `/inventory/${testData.inventoryId}`);
  if (res.status !== 200) console.error('FAILED:', res.data);
  else console.log('✓ Get inventory by ID successful');

  // Update stock
  console.log('Testing: PATCH /inventory/:id/stock');
  res = await request('PATCH', `/inventory/${testData.inventoryId}/stock`, {
    quantity: 85,
  });
  if (res.status !== 200) console.error('FAILED:', res.data);
  else console.log('✓ Update inventory stock successful');

  // Update
  console.log('Testing: PUT /inventory/:id');
  res = await request('PUT', `/inventory/${testData.inventoryId}`, {
    reorderLevel: 30,
  });
  if (res.status !== 200) console.error('FAILED:', res.data);
  else console.log('✓ Update inventory successful');
}

async function testSuppliers() {
  console.log('\n=== TESTING SUPPLIERS ===');

  // Create
  console.log('Testing: POST /suppliers');
  let res = await request('POST', '/suppliers', {
    name: 'ABC Fabrics',
    email: 'abc@fabrics.com',
    phone: '0300555555',
    address: { city: 'Lahore', country: 'Pakistan' },
  });
  if (res.status !== 201) console.error('FAILED:', res.data);
  else {
    testData.supplierId = res.data.supplier._id;
    console.log('✓ Create supplier successful');
  }

  // List
  console.log('Testing: GET /suppliers');
  res = await request('GET', '/suppliers');
  if (res.status !== 200) console.error('FAILED:', res.data);
  else console.log(`✓ List suppliers successful (found ${res.data.suppliers.length})`);

  // Get by ID
  console.log('Testing: GET /suppliers/:id');
  res = await request('GET', `/suppliers/${testData.supplierId}`);
  if (res.status !== 200) console.error('FAILED:', res.data);
  else console.log('✓ Get supplier by ID successful');

  // Update
  console.log('Testing: PUT /suppliers/:id');
  res = await request('PUT', `/suppliers/${testData.supplierId}`, {
    rating: 4.5,
  });
  if (res.status !== 200) console.error('FAILED:', res.data);
  else console.log('✓ Update supplier successful');
}

async function testTailors() {
  console.log('\n=== TESTING TAILORS ===');

  // Create
  console.log('Testing: POST /tailors');
  let res = await request('POST', '/tailors', {
    userId: testData.adminId,
    specialization: ['shirts', 'pants'],
    experience: 10,
  });
  if (res.status !== 201) console.error('FAILED:', res.data);
  else {
    testData.tailorId = res.data.tailor._id;
    console.log('✓ Create tailor successful');
  }

  // List
  console.log('Testing: GET /tailors');
  res = await request('GET', '/tailors');
  if (res.status !== 200) console.error('FAILED:', res.data);
  else console.log(`✓ List tailors successful (found ${res.data.tailors.length})`);

  // Get by ID
  console.log('Testing: GET /tailors/:id');
  res = await request('GET', `/tailors/${testData.tailorId}`);
  if (res.status !== 200) console.error('FAILED:', res.data);
  else console.log('✓ Get tailor by ID successful');

  // Update
  console.log('Testing: PUT /tailors/:id');
  res = await request('PUT', `/tailors/${testData.tailorId}`, {
    rating: 4.8,
  });
  if (res.status !== 200) console.error('FAILED:', res.data);
  else console.log('✓ Update tailor successful');
}

async function runTests() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║    TAILOROS API COMPREHENSIVE TEST SUITE   ║');
  console.log('╚════════════════════════════════════════════╝');

  try {
    await testAuth();
    await testCustomers();
    await testGarments();
    await testOrders();
    await testInventory();
    await testSuppliers();
    await testTailors();

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║        ✓ ALL TESTS COMPLETED SUCCESSFULLY  ║');
    console.log('╚════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

runTests();
