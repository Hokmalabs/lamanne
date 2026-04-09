export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  avatar_url: string | null;
  role: 'user' | 'admin';
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  stock: number;
  is_active: boolean;
  is_lot: boolean;
  lot_details: string | null;
  max_tranches: number;
  min_tranches: number;
  created_at: string;
  category?: Category;
}

export interface Cotisation {
  id: string;
  user_id: string;
  product_id: string;
  total_price: number;
  amount_paid: number;
  amount_remaining: number;
  nb_tranches: number;
  tranche_amount: number;
  status: 'active' | 'completed' | 'cancelled';
  withdrawal_code: string | null;
  withdrawn_at: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  refund_status: 'none' | 'requested' | 'approved' | 'rejected';
  refund_requested_at: string | null;
  refund_amount: number;
  created_at: string;
}

export interface Payment {
  id: string;
  cotisation_id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  payment_method: string;
  transaction_ref: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}
