import {
  User,
  Restaurant,
  RestaurantCategory,
  Product,
  ProductCategory,
  CartData,
  Order,
  Delivery,
  NotificationItem,
  Complaint,
  RestaurantApplication,
  PlatformSetting,
  AuditLog,
  Advertisement,
  CustomerBroadcast
} from '../types/index.js';

let authToken = localStorage.getItem('dz_token') || '';

export function setApiToken(token: string) {
  authToken = token;
  if (token) {
    localStorage.setItem('dz_token', token);
  } else {
    localStorage.removeItem('dz_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.error || `HTTP error ${res.status}`;
    const err = new Error(errorMsg) as any;
    err.code = data.code;
    err.data = data;
    throw err;
  }

  return data as T;
}

export const api = {
  // Auth
  register: (body: any) => request<{ success: boolean; user: User; token: string }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request<{ success: boolean; user: User; token: string }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  getProfile: () => request<{ success: boolean; user: User }>('/auth/profile'),
  updateProfile: (body: any) => request<{ success: boolean; user: User }>('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
  getAddresses: () => request<{ success: boolean; addresses: any[] }>('/auth/addresses'),
  addAddress: (body: any) => request<{ success: boolean; addresses: any[] }>('/auth/addresses', { method: 'POST', body: JSON.stringify(body) }),
  deleteAddress: (id: number) => request<{ success: boolean; addresses: any[] }>(`/auth/addresses/${id}`, { method: 'DELETE' }),
  switchDemo: (role: string) => request<{ success: boolean; user: User; token: string }>('/auth/switch-demo', { method: 'POST', body: JSON.stringify({ role }) }),

  // Restaurants & Public
  getRestaurants: (params: { category?: string; city?: string; search?: string } = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ success: boolean; count: number; restaurants: Restaurant[] }>(`/restaurants${query ? `?${query}` : ''}`);
  },
  getRestaurantCategories: () => request<{ success: boolean; categories: RestaurantCategory[] }>('/restaurants/categories'),
  getRestaurantDetails: (id: number) => request<{ success: boolean; restaurant: Restaurant; products: Product[]; reviews: any[] }>(`/restaurants/${id}`),
  submitRestaurantApplication: (body: any) => request<{ success: boolean; applicationId: number; message: string }>('/restaurants/apply', { method: 'POST', body: JSON.stringify(body) }),
  getMyApplication: () => request<{ success: boolean; application: RestaurantApplication | null; restaurant: Restaurant | null }>('/restaurants/my/application'),

  // Products
  getProducts: (params: { category?: string; search?: string; restaurant_id?: number; city?: string } = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ success: boolean; count: number; products: Product[] }>(`/products${query ? `?${query}` : ''}`);
  },
  getProductCategories: () => request<{ success: boolean; categories: ProductCategory[] }>('/products/categories'),
  getProductDetails: (id: number) => request<{ success: boolean; product: Product }>(`/products/${id}`),

  // Cart
  getCart: () => request<{ success: boolean; cart: CartData }>('/cart'),
  addToCart: (productId: number, quantity = 1, notes = '', clearIfConflict = false) =>
    request<{ success: boolean; message: string }>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity, notes, clear_if_conflict: clearIfConflict })
    }),
  updateCartItem: (itemId: number, quantity: number, notes?: string) =>
    request<{ success: boolean; message: string }>(`/cart/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity, notes })
    }),
  removeCartItem: (itemId: number) => request<{ success: boolean; message: string }>(`/cart/items/${itemId}`, { method: 'DELETE' }),
  clearCart: () => request<{ success: boolean; message: string }>('/cart', { method: 'DELETE' }),

  // Orders
  placeOrder: (body: { address_id?: number; delivery_address?: string; delivery_instructions?: string; proposed_delivery_fee?: number }) =>
    request<{ success: boolean; orderId: number; orderNumber: string; total_amount: number; payment_method: string; message: string }>('/orders', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  getMyOrders: () => request<{ success: boolean; count: number; orders: Order[] }>('/orders/my'),
  getOrderDetails: (orderId: number) => request<{ success: boolean; order: Order; items: any[]; history: any[]; review?: any; delivery?: any }>(`/orders/${orderId}`),
  proposeDeliveryFee: (orderId: number, fee: number) =>
    request<{ success: boolean; message: string; delivery_fee: number; total_amount: number; delivery_fee_status: string }>(`/orders/${orderId}/propose-delivery-fee`, {
      method: 'POST',
      body: JSON.stringify({ fee })
    }),
  acceptDeliveryFee: (orderId: number) =>
    request<{ success: boolean; message: string; delivery_fee: number; total_amount: number; delivery_fee_status: string }>(`/orders/${orderId}/accept-delivery-fee`, {
      method: 'POST'
    }),
  cancelOrder: (orderId: number, reason?: string) => request<{ success: boolean; message: string }>(`/orders/${orderId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  submitReview: (orderId: number, rating: number, comment: string) => request<{ success: boolean; message: string }>(`/orders/${orderId}/review`, { method: 'POST', body: JSON.stringify({ rating, comment }) }),
  submitComplaint: (orderId: number, subject: string, description: string) => request<{ success: boolean; message: string }>(`/orders/${orderId}/complaint`, { method: 'POST', body: JSON.stringify({ subject, description }) }),

  // Restaurant Owner
  getOwnerRestaurant: () => request<{ success: boolean; restaurant: Restaurant | null; application: RestaurantApplication | null; isApproved: boolean }>('/owner/restaurant'),
  updateOwnerRestaurant: (body: any) => request<{ success: boolean; restaurant: Restaurant }>('/owner/restaurant', { method: 'PUT', body: JSON.stringify(body) }),
  getOwnerProducts: () => request<{ success: boolean; count: number; products: Product[] }>('/owner/products'),
  createOwnerProduct: (body: any) => request<{ success: boolean; productId: number; message: string }>('/owner/products', { method: 'POST', body: JSON.stringify(body) }),
  updateOwnerProduct: (id: number, body: any) => request<{ success: boolean; message: string }>(`/owner/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  toggleOwnerProduct: (id: number) => request<{ success: boolean; is_available: number }>(`/owner/products/${id}/toggle`, { method: 'PATCH' }),
  deleteOwnerProduct: (id: number) => request<{ success: boolean; message: string }>(`/owner/products/${id}`, { method: 'DELETE' }),
  getOwnerOrders: () => request<{ success: boolean; count: number; orders: Order[] }>('/owner/orders'),
  acceptOwnerOrder: (id: number) => request<{ success: boolean; message: string }>(`/owner/orders/${id}/accept`, { method: 'POST' }),
  rejectOwnerOrder: (id: number, reason: string) => request<{ success: boolean; message: string }>(`/owner/orders/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  prepareOwnerOrder: (id: number) => request<{ success: boolean; message: string }>(`/owner/orders/${id}/preparing`, { method: 'POST' }),
  readyOwnerOrder: (id: number) => request<{ success: boolean; message: string }>(`/owner/orders/${id}/ready`, { method: 'POST' }),
  getOwnerStats: () => request<{ success: boolean; stats: any }>('/owner/stats'),
  getOwnerAds: () => request<{ success: boolean; count: number; advertisements: Advertisement[] }>('/owner/advertisements'),
  createOwnerAd: (body: any) => request<{ success: boolean; adId: number; message: string }>('/owner/advertisements', { method: 'POST', body: JSON.stringify(body) }),
  updateOwnerAd: (id: number, body: any) => request<{ success: boolean; message: string }>(`/owner/advertisements/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteOwnerAd: (id: number) => request<{ success: boolean; message: string }>(`/owner/advertisements/${id}`, { method: 'DELETE' }),
  getOwnerBroadcasts: () => request<{ success: boolean; count: number; broadcasts: CustomerBroadcast[] }>('/owner/broadcasts'),
  sendOwnerBroadcast: (body: any) => request<{ success: boolean; broadcastId: number; sentCount: number; message: string }>('/owner/broadcasts', { method: 'POST', body: JSON.stringify(body) }),

  // Public Ads
  getPublicAds: (params: { city?: string; placement?: string } = {}) => {
    const q = new URLSearchParams(params as any).toString();
    return request<{ success: boolean; count: number; advertisements: Advertisement[] }>(`/advertisements${q ? `?${q}` : ''}`);
  },
  trackAdClick: (id: number) => request<{ success: boolean }>(`/advertisements/${id}/click`, { method: 'POST' }),
  trackAdView: (id: number) => request<{ success: boolean }>(`/advertisements/${id}/view`, { method: 'POST' }),

  // Courier
  getCourierProfile: () => request<{ success: boolean; profile: any; activeDelivery: any; earnings: { total: number; completedCount: number } }>('/courier/profile'),
  toggleCourierOnline: (coords?: { latitude: number; longitude: number }) => request<{ success: boolean; is_online: number; message: string; coordinates?: { latitude: number; longitude: number } }>('/courier/toggle-online', { method: 'POST', body: coords ? JSON.stringify(coords) : undefined }),
  updateCourierLocation: (latitude: number, longitude: number) => request<{ success: boolean; latitude: number; longitude: number }>('/courier/update-location', { method: 'POST', body: JSON.stringify({ latitude, longitude }) }),
  getCourierTasks: () => request<{ success: boolean; count: number; tasks: Delivery[] }>('/courier/tasks'),
  acceptCourierTask: (deliveryId: number) => request<{ success: boolean; message: string }>(`/courier/tasks/${deliveryId}/accept`, { method: 'POST' }),
  pickupCourierTask: (deliveryId: number) => request<{ success: boolean; message: string }>(`/courier/tasks/${deliveryId}/pickup`, { method: 'POST' }),
  onTheWayCourierTask: (deliveryId: number) => request<{ success: boolean; message: string }>(`/courier/tasks/${deliveryId}/on-the-way`, { method: 'POST' }),
  completeCourierTask: (deliveryId: number) => request<{ success: boolean; message: string }>(`/courier/tasks/${deliveryId}/complete`, { method: 'POST' }),
  getCourierHistory: () => request<{ success: boolean; count: number; deliveries: Delivery[] }>('/courier/history'),

  // Admin
  getAdminDashboard: () => request<{ success: boolean; stats: any; recentOrders: any[] }>('/admin/dashboard'),
  getAdminRestaurantApplications: () => request<{ success: boolean; count: number; applications: RestaurantApplication[] }>('/admin/restaurant-applications'),
  approveRestaurantApplication: (id: number) => request<{ success: boolean; message: string }>(`/admin/restaurant-applications/${id}/approve`, { method: 'POST' }),
  rejectRestaurantApplication: (id: number, reason: string) => request<{ success: boolean; message: string }>(`/admin/restaurant-applications/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  getAdminCourierApplications: () => request<{ success: boolean; count: number; couriers: any[] }>('/admin/courier-applications'),
  approveCourierApplication: (id: number) => request<{ success: boolean; message: string }>(`/admin/courier-applications/${id}/approve`, { method: 'POST' }),
  rejectCourierApplication: (id: number, reason?: string) => request<{ success: boolean; message: string }>(`/admin/courier-applications/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  getAdminUsers: (params: { role?: string; search?: string } = {}) => {
    const q = new URLSearchParams(params as any).toString();
    return request<{ success: boolean; count: number; users: User[] }>(`/admin/users${q ? `?${q}` : ''}`);
  },
  toggleUserActive: (id: number) => request<{ success: boolean; is_active: number; message: string }>(`/admin/users/${id}/toggle-active`, { method: 'PATCH' }),
  getAdminOrders: () => request<{ success: boolean; count: number; orders: Order[] }>('/admin/orders'),
  getAdminDeliveries: () => request<{ success: boolean; count: number; deliveries: Delivery[] }>('/admin/deliveries'),
  getAdminAds: () => request<{ success: boolean; count: number; advertisements: Advertisement[] }>('/admin/advertisements'),
  createAdminAd: (body: any) => request<{ success: boolean; adId: number; message: string }>('/admin/advertisements', { method: 'POST', body: JSON.stringify(body) }),
  toggleAdminAd: (id: number) => request<{ success: boolean; is_active: number }>(`/admin/advertisements/${id}/toggle`, { method: 'PUT' }),
  deleteAdminAd: (id: number) => request<{ success: boolean; message: string }>(`/admin/advertisements/${id}`, { method: 'DELETE' }),
  getAdminCourierLocations: () => request<{ success: boolean; count: number; couriers: any[] }>('/admin/couriers/live-locations'),
  getAdminSettings: () => request<{ success: boolean; settings: PlatformSetting[] }>('/admin/settings'),
  saveAdminSetting: (key: string, value: any) => request<{ success: boolean; settings: PlatformSetting[] }>('/admin/settings', { method: 'POST', body: JSON.stringify({ key, value }) }),
  getAdminComplaints: () => request<{ success: boolean; count: number; complaints: Complaint[] }>('/admin/complaints'),
  resolveAdminComplaint: (id: number, admin_notes: string, status = 'RESOLVED') => request<{ success: boolean; message: string }>(`/admin/complaints/${id}/resolve`, { method: 'POST', body: JSON.stringify({ admin_notes, status }) }),
  getAdminAuditLogs: () => request<{ success: boolean; count: number; logs: AuditLog[] }>('/admin/audit-logs'),

  // Notifications
  getNotifications: () => request<{ success: boolean; unreadCount: number; notifications: NotificationItem[] }>('/notifications'),
  markNotificationRead: (id: number) => request<{ success: boolean; message: string }>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request<{ success: boolean; message: string }>('/notifications/read-all', { method: 'POST' })
};
