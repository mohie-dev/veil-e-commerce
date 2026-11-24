export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type ItemType = 'PRODUCT' | 'PACKAGE';

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  isActive: boolean;
  _count?: { products: number };
}

export interface Notes {
  top?: string;
  heart?: string;
  base?: string;
}

export interface ProductVariant {
  id: string;
  size: string;
  price: number;
  discountPrice: number | null;
  discountExpiresAt: string | null;
  effectivePrice: number;
  hasActiveDiscount: boolean;
  stock: number;
  inStock: boolean;
  isActive: boolean;
  productId: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  hasActiveDiscount: boolean;
  inStock: boolean;
  startingPrice: number;
  variants: ProductVariant[];
  concentration?: string | null;
  notes?: Notes | null;
  images: string[];
  categoryId: string;
  category?: Pick<Category, 'id' | 'name' | 'slug'>;
  isFeatured: boolean;
  isActive: boolean;
}

export interface PackageItem {
  id?: string;
  variantId: string;
  quantity: number;
  variant: Pick<ProductVariant, 'id' | 'size' | 'price' | 'discountPrice' | 'stock' | 'isActive'> & {
    product: Pick<Product, 'id' | 'name' | 'slug' | 'images' | 'isActive'>;
  };
}

export interface GiftPackage {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice: number | null;
  effectivePrice: number;
  hasActiveDiscount: boolean;
  discountExpiresAt?: string | null;
  images: string[];
  items: PackageItem[];
  availableStock: number;
  inStock: boolean;
  isFeatured: boolean;
  isActive: boolean;
}

export interface CartLine {
  itemType: ItemType;
  itemId: string;
  quantity: number;
  name: string;
  slug?: string;
  size?: string;
  image: string;
  price: number;
  maxStock: number;
}

export interface OrderItem {
  id: string;
  itemType: ItemType;
  itemName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  variantId: string | null;
  packageId: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  alternativePhone?: string | null;
  governorate: string;
  shippingAddress: string;
  notes?: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
}

export interface StoreSettings {
  id: string;
  storeName: string;
  phone: string | null;
  whatsapp: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  defaultDeliveryFee: number;
  freeShippingThreshold: number | null;
  isOpen: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  createdAt: string;
  _count?: { orders: number };
  orders?: Order[];
  stats?: { totalOrders: number; completedOrActiveOrders: number; totalSpent: number };
}

export interface OrderStats {
  totalOrders: number;
  byStatus: Record<'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled', number>;
  totalRevenue: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
}

export interface ProductInfoInput {
  name: string;
  description: string;
  concentration?: string;
  notes?: Notes;
  images: string[];
  categoryId: string;
  isFeatured: boolean;
  isActive: boolean;
}

export interface ProductVariantInput {
  size: string;
  price: number;
  discountPrice?: number | null;
  discountExpiresAt?: string | null;
  stock: number;
  isActive: boolean;
}

export interface CreateProductPayload extends ProductInfoInput {
  variants: ProductVariantInput[];
}

export type UpdateProductPayload = Partial<ProductInfoInput>;

export interface CreateVariantPayload extends ProductVariantInput {
  productId: string;
}

export type UpdateVariantPayload = Partial<ProductVariantInput>;

export interface PackageInfoInput {
  name: string;
  description: string;
  price: number;
  discountPrice?: number | null;
  discountExpiresAt?: string | null;
  images: string[];
  isFeatured: boolean;
  isActive: boolean;
}

export interface CreatePackagePayload extends PackageInfoInput {
  items: { variantId: string; quantity: number }[];
}

export type UpdatePackagePayload = Partial<PackageInfoInput> & {
  items?: { variantId: string; quantity: number }[];
};
