export type ProductCategory = string;
export type PrintTechnique = string;
export type PrintPlacement = 'Front' | 'Back' | 'Left Chest' | 'Sleeve' | 'Wrap';
export type FontStyleOption = 'Times New Roman' | 'Syne' | 'Plus Jakarta Sans' | 'JetBrains Mono' | 'Serif';
export type DesignStatus = 'draft' | 'published' | 'archived';
export type OrderStatus = 'pending' | 'printing' | 'shipped' | 'delivered' | 'cancelled';
export type GarmentSize = 'S' | 'M' | 'L' | 'XL' | '2XL' | 'One Size';
export type ShippingRegion = 'North America' | 'Europe' | 'Asia-Pacific' | 'Global Express';

export interface CatalogProduct {
  id: string;
  title: string;
  category: ProductCategory;
  technique: PrintTechnique;
  basePrice: number;
  fulfillmentTime: string;
  sku: string;
  inStock: boolean;
  createdBy: string;
  imageUrl?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CustomDesign {
  id: string;
  ownerId: string;
  productId: string;
  productTitle: string;
  designName: string;
  garmentColor: string;
  placement: PrintPlacement;
  technique: PrintTechnique;
  headlineText: string;
  subText: string;
  textColor: string;
  fontStyle: FontStyleOption;
  graphicPreset: string;
  scale: number;
  retailPrice: number;
  status: DesignStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FulfillmentOrder {
  id: string;
  ownerId: string;
  designId: string;
  designName: string;
  productTitle: string;
  size: 'S' | 'M' | 'L' | 'XL' | '2XL' | 'One Size';
  quantity: number;
  totalAmount: number;
  shippingRegion: ShippingRegion;
  status: OrderStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdminRecord {
  uid: string;
  role: 'super_admin' | 'catalog_admin';
  createdAt?: unknown;
}

// Validation Constants synchronized verbatim with firebase-blueprint.json
export const BLUEPRINT_CONSTRAINTS = {
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  ID_MAX_LENGTH: 128,
  SKU_PATTERN: /^[A-Z0-9-]+$/,
  SKU_MAX_LENGTH: 40,
  CATEGORY_TECHNIQUE_PATTERN: /^[a-zA-Z0-9 &/()\-]+$/,
  CATEGORY_MAX_LENGTH: 50,
  TECHNIQUE_MAX_LENGTH: 50,
  HEX_COLOR_PATTERN: /^#[0-9A-Fa-f]{6}$/,
  PRODUCT_TITLE_MAX: 100,
  FULFILLMENT_TIME_MAX: 40,
  DESIGN_NAME_MAX: 80,
  HEADLINE_TEXT_MAX: 60,
  SUB_TEXT_MAX: 60,
  SCALE_MIN: 50,
  SCALE_MAX: 150,
  RETAIL_PRICE_MIN: 5,
  RETAIL_PRICE_MAX: 1000000,
  BASE_PRICE_MIN: 1,
  BASE_PRICE_MAX: 500000,
  ORDER_QTY_MIN: 1,
  ORDER_QTY_MAX: 500,
} as const;

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}
