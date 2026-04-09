export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  avatar_url: string | null;
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
