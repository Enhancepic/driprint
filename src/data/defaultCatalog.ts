import { CatalogProduct } from '../types/driprint';

export const HERO_STUDIO_IMAGE = '/src/assets/images/hero_driprint_studio_1791396331690.jpg';

export const PRODUCT_IMAGES: Record<string, string> = {
  prod_hoodie_01: '/src/assets/images/product_heavyweight_hoodie_1791396343455.jpg',
  prod_tshirt_02: '/src/assets/images/product_oversized_tshirt_1791396357749.jpg',
  prod_cap_03: '/src/assets/images/product_embroidered_cap_1791396369737.jpg',
  prod_mug_04: '/src/assets/images/product_ceramic_mug_1791396380427.jpg',
  prod_tote_05: '/src/assets/images/product_ceramic_mug_1791396380427.jpg',
  prod_jacket_06: '/src/assets/images/product_heavyweight_hoodie_1791396343455.jpg',
};

export const DEFAULT_CATEGORIES: string[] = [
  'Apparel',
  'Apparel - T-Shirts & Polos',
  'Apparel - Hoodies & Sweatshirts',
  'Apparel - Jackets & Overshirts',
  'Apparel - Activewear & Joggers',
  'Headwear',
  'Drinkware',
  'Accessories',
  'Wall Art',
];

export const DEFAULT_TECHNIQUES: string[] = [
  'DTG Printing',
  'DTF (Direct-to-Film)',
  'Screen Printing',
  'Embroidery',
  '3D Puff Embroidery',
  'All-Over Print',
  'Sublimation',
  'Vinyl Heat Transfer',
];

export const DEFAULT_CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    id: 'prod_hoodie_01',
    title: 'Heavyweight 450gsm Pullover Hoodie',
    category: 'Apparel',
    technique: 'DTG Printing',
    basePrice: 1499,
    fulfillmentTime: '2-4 business days',
    sku: 'DP-HD-450',
    inStock: true,
    createdBy: 'system_driprint',
    imageUrl: PRODUCT_IMAGES.prod_hoodie_01,
  },
  {
    id: 'prod_tshirt_02',
    title: 'Oversized Combed Organic Crew Tee',
    category: 'Apparel',
    technique: 'DTG Printing',
    basePrice: 699,
    fulfillmentTime: '2-3 business days',
    sku: 'DP-TEE-280',
    inStock: true,
    createdBy: 'system_driprint',
    imageUrl: PRODUCT_IMAGES.prod_tshirt_02,
  },
  {
    id: 'prod_cap_03',
    title: 'Structured 6-Panel Twill Embroidery Cap',
    category: 'Headwear',
    technique: 'Embroidery',
    basePrice: 549,
    fulfillmentTime: '2-4 business days',
    sku: 'DP-CAP-6PN',
    inStock: true,
    createdBy: 'system_driprint',
    imageUrl: PRODUCT_IMAGES.prod_cap_03,
  },
  {
    id: 'prod_mug_04',
    title: 'Matte Ceramic 11oz Studio Mug',
    category: 'Drinkware',
    technique: 'Sublimation',
    basePrice: 349,
    fulfillmentTime: '1-3 business days',
    sku: 'DP-MUG-11Z',
    inStock: true,
    createdBy: 'system_driprint',
    imageUrl: PRODUCT_IMAGES.prod_mug_04,
  },
  {
    id: 'prod_tote_05',
    title: 'Heavy Canvas Gusseted Studio Tote',
    category: 'Accessories',
    technique: 'All-Over Print',
    basePrice: 499,
    fulfillmentTime: '2-4 business days',
    sku: 'DP-TOT-340',
    inStock: true,
    createdBy: 'system_driprint',
    imageUrl: PRODUCT_IMAGES.prod_tote_05,
  },
  {
    id: 'prod_jacket_06',
    title: 'Garment-Dyed Drop Shoulder Fleece Crew',
    category: 'Apparel',
    technique: '3D Puff Embroidery',
    basePrice: 1299,
    fulfillmentTime: '2-4 business days',
    sku: 'DP-CRW-400',
    inStock: true,
    createdBy: 'system_driprint',
    imageUrl: PRODUCT_IMAGES.prod_jacket_06,
  },
];

export const GARMENT_COLOR_SWATCHES = [
  { name: 'Ocean Navy', hex: '#0C4A6E' },
  { name: 'Warm Bone', hex: '#F5F5F0' },
  { name: 'Cobalt Navy', hex: '#1E3A8A' },
  { name: 'Forest Pine', hex: '#14532D' },
  { name: 'Carbon Black', hex: '#18181B' },
  { name: 'Crimson Clay', hex: '#991B1B' },
] as const;

export const INK_COLOR_SWATCHES = [
  { name: 'Pure Chalk', hex: '#FFFFFF' },
  { name: 'Jet Ink', hex: '#0F172A' },
  { name: 'Signal Amber', hex: '#F59E0B' },
  { name: 'Electric Crimson', hex: '#EF4444' },
  { name: 'Mint Studio', hex: '#10B981' },
  { name: 'Cobalt Accent', hex: '#3B82F6' },
] as const;

export const GRAPHIC_PRESETS = [
  { id: 'geometric_crest', label: 'Geometric Crest' },
  { id: 'studio_globe', label: 'Meridian Globe' },
  { id: 'minimal_wave', label: 'Acoustic Wave' },
  { id: 'vintage_stamp', label: 'Atelier Stamp' },
  { id: 'typography_only', label: 'Type Only' },
] as const;
