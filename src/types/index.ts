export type UserRole = 'CUSTOMER' | 'RESTAURANT_OWNER' | 'COURIER' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  full_name: string;
  phone: string;
  language: 'ar' | 'fr';
  is_active: number;
  addresses?: Address[];
  courier?: CourierProfile;
  restaurant?: Restaurant;
  application?: RestaurantApplication;
}

export interface Address {
  id: number;
  user_id: number;
  title: string;
  city: string;
  district: string;
  street: string;
  building?: string;
  notes?: string;
  phone: string;
  is_default: number;
}

export interface CourierProfile {
  id: number;
  user_id: number;
  vehicle_type: 'MOTO' | 'CAR' | 'BICYCLE' | 'VAN';
  vehicle_plate?: string;
  license_number?: string;
  is_online: number;
  is_approved: number;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_notes?: string;
  current_latitude?: number;
  current_longitude?: number;
  last_location_update?: string;
}

export interface RestaurantCategory {
  id: number;
  name_ar: string;
  name_fr: string;
  slug: string;
  icon: string;
}

export interface RestaurantApplication {
  id: number;
  owner_id: number;
  restaurant_name: string;
  description_ar: string;
  description_fr: string;
  phone: string;
  address: string;
  city: string;
  category_id: number;
  logo_url: string;
  cover_url: string;
  opening_hours: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string;
  admin_notes?: string;
  created_at: string;
  category_name_ar?: string;
  category_name_fr?: string;
  owner_name?: string;
  owner_email?: string;
}

export interface Restaurant {
  id: number;
  owner_id: number;
  application_id?: number;
  name: string;
  description_ar: string;
  description_fr: string;
  phone: string;
  address: string;
  city: string;
  category_id: number;
  logo_url: string;
  cover_url: string;
  latitude?: number;
  longitude?: number;
  opening_hours: string;
  rating: number;
  review_count: number;
  is_active: number;
  is_delivering: number;
  category_name_ar?: string;
  category_name_fr?: string;
  category_icon?: string;
}

export interface ProductCategory {
  id: number;
  name_ar: string;
  name_fr: string;
  slug: string;
  icon: string;
  sort_order: number;
}

export interface Product {
  id: number;
  restaurant_id: number;
  category_id: number;
  name_ar: string;
  name_fr: string;
  description_ar: string;
  description_fr: string;
  price: number;
  image_url: string;
  is_available: number;
  restaurant_name?: string;
  restaurant_city?: string;
  category_name_ar?: string;
  category_name_fr?: string;
  category_icon?: string;
}

export interface CartItem {
  id: number;
  cart_id: number;
  product_id: number;
  quantity: number;
  notes?: string;
  name_ar: string;
  name_fr: string;
  price: number;
  image_url: string;
  is_available: number;
  restaurant_id: number;
  restaurant_name: string;
  restaurant_city: string;
  restaurant_address: string;
}

export interface CartData {
  id: number;
  items: CartItem[];
  restaurant: {
    id: number;
    name: string;
    city: string;
    address: string;
  } | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  itemCount: number;
}

export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'PREPARING'
  | 'READY'
  | 'SEARCHING_COURIER'
  | 'COURIER_ASSIGNED'
  | 'PICKED_UP'
  | 'ON_THE_WAY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name_ar: string;
  product_name_fr: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface OrderStatusHistory {
  id: number;
  order_id: number;
  previous_status?: string;
  new_status: OrderStatus;
  changed_by_user_id?: number;
  changed_by_name?: string;
  notes?: string;
  timestamp: string;
}

export interface Order {
  id: number;
  order_number: string;
  customer_id: number;
  restaurant_id: number;
  courier_id?: number;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  payment_method: 'COD';
  delivery_address: string;
  delivery_instructions?: string;
  rejection_reason?: string;
  cancellation_reason?: string;
  created_at: string;
  delivery_fee_status?: 'PENDING_AGREEMENT' | 'PROPOSED_BY_CUSTOMER' | 'PROPOSED_BY_COURIER' | 'AGREED';
  proposed_fee_by?: 'CUSTOMER' | 'COURIER';
  restaurant_name?: string;
  restaurant_phone?: string;
  restaurant_address?: string;
  restaurant_logo?: string;
  restaurant_city?: string;
  restaurant_lat?: number;
  restaurant_lng?: number;
  customer_name?: string;
  customer_phone?: string;
  courier_name?: string;
  courier_phone?: string;
  vehicle_type?: string;
  vehicle_plate?: string;
  courier_lat?: number;
  courier_lng?: number;
  items?: OrderItem[];
  history?: OrderStatusHistory[];
  total_items?: number;
  user_rating?: number;
}

export interface Delivery {
  id: number;
  order_id: number;
  courier_id?: number;
  restaurant_id: number;
  customer_id: number;
  pickup_address: string;
  delivery_address: string;
  delivery_fee: number;
  delivery_fee_status?: 'PENDING_AGREEMENT' | 'PROPOSED_BY_CUSTOMER' | 'PROPOSED_BY_COURIER' | 'AGREED';
  proposed_fee_by?: 'CUSTOMER' | 'COURIER';
  status: 'AVAILABLE' | 'ASSIGNED' | 'PICKED_UP' | 'ON_THE_WAY' | 'DELIVERED' | 'CANCELLED';
  created_at: string;
  pickup_at?: string;
  delivered_at?: string;
  order_number?: string;
  total_amount?: number;
  restaurant_name?: string;
  restaurant_phone?: string;
  restaurant_city?: string;
  restaurant_lat?: number;
  restaurant_lng?: number;
  customer_name?: string;
  customer_phone?: string;
  courier_name?: string;
  delivery_instructions?: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title_ar: string;
  title_fr: string;
  message_ar: string;
  message_fr: string;
  type: string;
  reference_id?: number;
  is_read: number;
  created_at: string;
}

export interface Complaint {
  id: number;
  customer_id: number;
  order_id?: number;
  subject: string;
  description: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  admin_notes?: string;
  created_at: string;
  resolved_at?: string;
  customer_name?: string;
  customer_phone?: string;
  order_number?: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  user_name?: string;
  user_role?: string;
  action: string;
  entity_type: string;
  entity_id?: number;
  details: string;
  ip_address: string;
  created_at: string;
}

export interface PlatformSetting {
  id: number;
  key: string;
  value: string;
  description: string;
}

export interface Advertisement {
  id: number;
  restaurant_id: number;
  restaurant_name?: string;
  restaurant_logo?: string;
  restaurant_city?: string;
  restaurant_rating?: number;
  title_ar: string;
  title_fr: string;
  description_ar?: string;
  description_fr?: string;
  image_url: string;
  target_location: string;
  placement: 'HERO' | 'OFFERS' | 'POPULAR';
  badge_text?: string;
  discount_percentage?: number;
  link_type?: 'RESTAURANT' | 'PRODUCT';
  product_id?: number;
  is_active: number;
  clicks_count: number;
  views_count: number;
  created_at: string;
}

export interface CustomerBroadcast {
  id: number;
  restaurant_id: number;
  title_ar: string;
  title_fr: string;
  message_ar: string;
  message_fr: string;
  target_audience: string;
  target_location: string;
  discount_code?: string;
  sent_count: number;
  created_at: string;
}

