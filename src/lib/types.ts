export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  hide: boolean;
  main_redirect: boolean;
  image?: string;
}

export interface Product {
  id: number;
  name: string;
  status: boolean;
  slug: string;
  price: number;
  old_price?: number;
  percent_off?: number;
  recurring_discount?: boolean;
  small_description?: string;
  description?: string;
  category: ProductCategory;
  subscription: boolean;
  stock?: number;
  duration_periodicity?: string;
  period_num?: number;
  trial?: number;
  featured: boolean;
  image?: string;
  gallery?: string[];
  youtube?: string;
  created_date: number;
  last_edited?: number;
  enable_stock?: boolean;
  enable_trial?: boolean;
  quantity?: boolean;
  giftcard?: boolean;
  donation?: boolean;
  server_choice?: boolean;
  server_options?: { id: number; name: string }[];
  custom_fields?: CustomField[];
  custom_rules?: CustomRule[];
  purchase_limit?: { times: number; type: string; cycle: number; periodicity: string } | string;
  subscription_cycle?: string;
  cumul_sub?: boolean;
  onetime_sub?: boolean;
  download_link_days_validity?: number;
  discount_end?: number;
}

export interface CustomFieldParent {
  customFieldId: number;
  optionId: number | string;
  name: string;
}

export interface CustomField {
  id: number;
  order: number;
  name: string;
  type: string;
  marker: string;
  required: boolean | number;
  minimum?: number | string;
  maximum?: number | string;
  step?: number | string;
  price?: number | string;
  default_value?: number | string;
  if_not_filled?: string;
  placeholder?: string;
  instruction?: string;
  parent?: CustomFieldParent;
  number_type?: string;
  value?: number | string;
  options?: CustomFieldOption[];
}

export interface CustomRule {
  id: number;
  order: number;
  name: string;
  type: string;
  min: number;
  max: number;
  fields: number[];
}

export interface CustomFieldOption {
  id: number | string;
  order: number | string;
  name: string;
  value: number | string;
  price: number | string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  slug: string;
  hide: boolean;
  main_redirect: boolean;
  parent_id?: number;
  image?: string;
}

export interface StoreInfo {
  id: number;
  owner: number;
  title: string;
  subtitle?: string;
  description: string;
  domain: string;
  custom_domain?: string;
  logo: string;
  currency: string;
  timezone: string;
  color: string;
  country?: string;
  social_medias?: Record<string, string>;
  menu_links?: { title: string; link: string }[];
}

export interface ProductsResponse {
  products: Product[];
  product_count: number;
}

export interface CategoriesResponse {
  categories: Category[];
  category_count: number;
}

export type PurchaseType = 'addtocart' | 'subscribe';

export interface CheckoutProduct {
  product_id: number;
  product_slug: string;
  type: PurchaseType;
  quantity: number;
  donation_amount?: number;
  server_selection?: number;
  custom_fields?: Record<string, string | number>;
}

export interface CheckoutUser {
  email?: string;
  minecraft_username?: string;
  steam_id?: string;
  discord_id?: string | number;
  epic_id?: string;
  eos_id?: string;
  fivem_citizen_id?: string;
  ingame_username?: string;
  rust_username?: string;
}

export interface CheckoutBody {
  products: CheckoutProduct[];
  user?: CheckoutUser;
  redirect_success_checkout?: string;
  redirect_canceled_checkout?: string;
  redirect_pending_checkout?: string;
}

export interface CheckoutResponse {
  url: string;
}
