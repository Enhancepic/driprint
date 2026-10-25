/**
 * Firestore Security Rules Verification Suite
 * Verifies that all "Dirty Dozen" adversarial payloads return PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: {
    uid: string;
    email: string;
    email_verified: boolean;
  } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on Design Create',
    collection: 'designs/design_01',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      ownerId: 'user_1',
      productId: 'prod_tee_01',
      productTitle: 'Unisex Heavyweight Tee',
      designName: 'Studio Drop',
      garmentColor: '#18181B',
      placement: 'Front',
      technique: 'DTG Printing',
      headlineText: 'DRIPRINT',
      subText: 'EDITION 01',
      textColor: '#FFFFFF',
      fontStyle: 'Syne',
      graphicPreset: 'geometric_crest',
      scale: 100,
      retailPrice: 34,
      status: 'draft',
      isFeatured: true, // Shadow field
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Identity Spoofing on Design Create',
    collection: 'designs/design_02',
    operation: 'create',
    auth: { uid: 'user_attacker', email: 'attacker@example.com', email_verified: true },
    payload: {
      ownerId: 'user_victim',
      productId: 'prod_tee_01',
      productTitle: 'Unisex Heavyweight Tee',
      designName: 'Spoofed Drop',
      garmentColor: '#18181B',
      placement: 'Front',
      technique: 'DTG Printing',
      headlineText: 'DRIPRINT',
      subText: 'EDITION 01',
      textColor: '#FFFFFF',
      fontStyle: 'Syne',
      graphicPreset: 'geometric_crest',
      scale: 100,
      retailPrice: 34,
      status: 'draft',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Admin Email Spoof on Product Create',
    collection: 'products/prod_spoof',
    operation: 'create',
    auth: { uid: 'spoof_admin', email: 'mohan.jalan07@gmail.com', email_verified: false },
    payload: {
      title: 'Unauthorized Hoodie',
      category: 'Apparel',
      technique: 'DTG Printing',
      basePrice: 22.5,
      fulfillmentTime: '2-4 business days',
      sku: 'DP-HD-999',
      inStock: true,
      createdBy: 'spoof_admin',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Orphaned Order Creation with Non-Existent Design ID',
    collection: 'orders/order_orphan',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      ownerId: 'user_1',
      designId: 'missing_design_999',
      designName: 'Ghost Design',
      productTitle: 'Unisex Heavyweight Tee',
      size: 'L',
      quantity: 2,
      totalAmount: 68,
      shippingRegion: 'North America',
      status: 'pending',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Cross-Tenant Order Creation Referencing Another User Design',
    collection: 'orders/order_crosstenant',
    operation: 'create',
    auth: { uid: 'user_attacker', email: 'attacker@example.com', email_verified: true },
    payload: {
      ownerId: 'user_attacker',
      designId: 'victim_design_01',
      designName: 'Victim Design',
      productTitle: 'Unisex Heavyweight Tee',
      size: 'M',
      quantity: 1,
      totalAmount: 34,
      shippingRegion: 'Europe',
      status: 'pending',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Immortal Field Mutation on Design Update',
    collection: 'designs/design_01',
    operation: 'update',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      ownerId: 'user_2',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Terminal State Bypass on Delivered Order',
    collection: 'orders/order_delivered',
    operation: 'update',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      status: 'cancelled',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Action-Based Update Escalation on Order Status',
    collection: 'orders/order_pending',
    operation: 'update',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      status: 'shipped',
      totalAmount: 1,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Denial-of-Wallet String Overflow on Headline Text',
    collection: 'designs/design_overflow',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      headlineText: 'A'.repeat(5000),
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Client-Provided Forged Timestamp on Design Create',
    collection: 'designs/design_forged_time',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unauthorized List Scraping on Orders Across Users',
    collection: 'orders',
    operation: 'list',
    auth: { uid: 'user_attacker', email: 'attacker@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Self-Assigned Admin Privilege Escalation',
    collection: 'admins/user_attacker',
    operation: 'create',
    auth: { uid: 'user_attacker', email: 'attacker@example.com', email_verified: true },
    payload: {
      uid: 'user_attacker',
      role: 'super_admin',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];
