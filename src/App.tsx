/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  ArrowRight,
  Layers,
  Package,
  ShieldCheck,
} from 'lucide-react';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './lib/firebase';
import {
  BLUEPRINT_CONSTRAINTS,
  CatalogProduct,
  CustomDesign,
  formatINR,
  FulfillmentOrder,
  GarmentSize,
  OrderStatus,
  ProductCategory,
  ShippingRegion,
} from './types/driprint';
import {
  DEFAULT_CATALOG_PRODUCTS,
  HERO_STUDIO_IMAGE,
  PRODUCT_IMAGES,
} from './data/defaultCatalog';
import { DesignMakerStudio } from './components/DesignMakerStudio';
import { AdminConsole } from './components/AdminConsole';

type WorkspaceSection = 'studio' | 'catalog' | 'fulfillment' | 'admin';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isRegisteredAdmin, setIsRegisteredAdmin] = useState(false);

  // Firestore synced state
  const [firestoreProducts, setFirestoreProducts] = useState<CatalogProduct[]>([]);
  const [designs, setDesigns] = useState<CustomDesign[]>([]);
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);

  // Custom Categories & Apparel Techniques added by Admin
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('driprint_custom_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customTechniques, setCustomTechniques] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('driprint_custom_techniques');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Active UI state
  const [activeSection, setActiveSection] = useState<WorkspaceSection>('studio');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'All'>('All');
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct>(DEFAULT_CATALOG_PRODUCTS[0]);
  const [loadedDesign, setLoadedDesign] = useState<CustomDesign | null>(null);
  const [heroImgError, setHeroImgError] = useState(false);
  const [brokenProductImgs, setBrokenProductImgs] = useState<Record<string, boolean>>({});
  const [authBanner, setAuthBanner] = useState<string | null>(null);

  const isBootstrappedAdmin = Boolean(
    user && user.emailVerified && user.email === BOOTSTRAPPED_ADMIN_EMAIL
  );
  const isAdmin = isBootstrappedAdmin || isRegisteredAdmin;

  const handleAddCustomCategory = (newCat: string) => {
    setCustomCategories((prev) => {
      const next = Array.from(new Set([...prev, newCat]));
      try {
        localStorage.setItem('driprint_custom_categories', JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  };

  const handleAddCustomTechnique = (newTech: string) => {
    setCustomTechniques((prev) => {
      const next = Array.from(new Set([...prev, newTech]));
      try {
        localStorage.setItem('driprint_custom_techniques', JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  };

  // Combine default catalog with any live Firestore catalog items
  const mergedCatalog: CatalogProduct[] = useMemo(() => {
    if (firestoreProducts.length === 0) {
      return DEFAULT_CATALOG_PRODUCTS;
    }
    const byId = new Map<string, CatalogProduct>();
    DEFAULT_CATALOG_PRODUCTS.forEach((item) => byId.set(item.id, item));
    firestoreProducts.forEach((item) => {
      byId.set(item.id, {
        ...item,
        imageUrl: item.imageUrl || PRODUCT_IMAGES[item.id] || PRODUCT_IMAGES.prod_hoodie_01,
      });
    });
    return Array.from(byId.values());
  }, [firestoreProducts]);

  // Dynamic Catalog Filter Tabs including custom categories
  const catalogFilterTabs = useMemo(() => {
    const base = ['All', 'Apparel', 'Headwear', 'Drinkware', 'Accessories'];
    const fromProducts = mergedCatalog.map((p) => p.category);
    return Array.from(new Set([...base, ...customCategories, ...fromProducts])).filter(Boolean);
  }, [mergedCatalog, customCategories]);

  // 1. Auth Listener & Admin Registry Check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);

      if (currentUser && currentUser.emailVerified) {
        if (currentUser.email === BOOTSTRAPPED_ADMIN_EMAIL) {
          setIsRegisteredAdmin(true);
        } else {
          const adminPath = `admins/${currentUser.uid}`;
          try {
            const snap = await getDoc(doc(db, 'admins', currentUser.uid));
            setIsRegisteredAdmin(snap.exists());
          } catch (error) {
            setIsRegisteredAdmin(false);
            handleFirestoreError(error, OperationType.GET, adminPath);
          }
        }
      } else {
        setIsRegisteredAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Catalog Products Listener
  useEffect(() => {
    if (!authReady) return;
    const path = 'products';
    const productsQuery = isBootstrappedAdmin
      ? collection(db, 'products')
      : query(collection(db, 'products'), where('inStock', '==', true));

    const unsubscribe = onSnapshot(
      productsQuery,
      (snapshot) => {
        const items: CatalogProduct[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: String(data.title || ''),
            category: String(data.category || 'Apparel'),
            technique: String(data.technique || 'DTG Printing'),
            basePrice: Number(data.basePrice || 699),
            fulfillmentTime: String(data.fulfillmentTime || '2-4 business days'),
            sku: String(data.sku || 'DP-001'),
            inStock: Boolean(data.inStock),
            createdBy: String(data.createdBy || ''),
            imageUrl: PRODUCT_IMAGES[docSnap.id] || PRODUCT_IMAGES.prod_hoodie_01,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });
        setFirestoreProducts(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [authReady, isBootstrappedAdmin]);

  // 3. Real-time Saved Designs Listener (Strictly gated by authReady & verified user)
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      setDesigns([]);
      return;
    }

    const path = 'designs';
    const designsQuery = isBootstrappedAdmin
      ? collection(db, 'designs')
      : query(collection(db, 'designs'), where('ownerId', '==', user.uid));

    const unsubscribe = onSnapshot(
      designsQuery,
      (snapshot) => {
        const loaded: CustomDesign[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ownerId: String(data.ownerId || ''),
            productId: String(data.productId || 'prod_hoodie_01'),
            productTitle: String(data.productTitle || ''),
            designName: String(data.designName || ''),
            garmentColor: String(data.garmentColor || '#0C4A6E'),
            placement: data.placement || 'Front',
            technique: String(data.technique || 'DTG Printing'),
            headlineText: String(data.headlineText || ''),
            subText: String(data.subText || ''),
            textColor: String(data.textColor || '#FFFFFF'),
            fontStyle: data.fontStyle || 'Syne',
            graphicPreset: String(data.graphicPreset || 'geometric_crest'),
            scale: Number(data.scale || 100),
            retailPrice: Number(data.retailPrice || 1299),
            status: data.status || 'published',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });
        setDesigns(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [authReady, user, isBootstrappedAdmin]);

  // 4. Real-time Fulfillment Orders Listener (Strictly gated by authReady & verified user)
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      setOrders([]);
      return;
    }

    const path = 'orders';
    const ordersQuery = isBootstrappedAdmin
      ? collection(db, 'orders')
      : query(collection(db, 'orders'), where('ownerId', '==', user.uid));

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const loaded: FulfillmentOrder[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ownerId: String(data.ownerId || ''),
            designId: String(data.designId || ''),
            designName: String(data.designName || ''),
            productTitle: String(data.productTitle || ''),
            size: data.size || 'L',
            quantity: Number(data.quantity || 1),
            totalAmount: Number(data.totalAmount || 699),
            shippingRegion: data.shippingRegion || 'Asia-Pacific',
            status: data.status || 'pending',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });
        setOrders(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [authReady, user, isBootstrappedAdmin]);

  // Authentication Handlers
  const handleGoogleSignIn = async () => {
    setAuthBanner(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      setAuthBanner('Google sign-in popup was closed or interrupted. Click "DriPrint Admin Login" to try again.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setActiveSection('studio');
  };

  // Firestore Write Handlers (Enforcing firebase-blueprint.json & handleFirestoreError)
  const handleSaveDesign = async (
    designData: Omit<CustomDesign, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ): Promise<string | null> => {
    if (!user) {
      await handleGoogleSignIn();
      return null;
    }
    const designId = `dp_dsn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const path = `designs/${designId}`;
    try {
      await setDoc(doc(db, 'designs', designId), {
        ownerId: user.uid,
        productId: designData.productId.slice(0, 64),
        productTitle: designData.productTitle.slice(0, BLUEPRINT_CONSTRAINTS.PRODUCT_TITLE_MAX),
        designName: designData.designName.slice(0, BLUEPRINT_CONSTRAINTS.DESIGN_NAME_MAX),
        garmentColor: designData.garmentColor,
        placement: designData.placement,
        technique: designData.technique.slice(0, BLUEPRINT_CONSTRAINTS.TECHNIQUE_MAX_LENGTH),
        headlineText: designData.headlineText.slice(0, BLUEPRINT_CONSTRAINTS.HEADLINE_TEXT_MAX),
        subText: designData.subText.slice(0, BLUEPRINT_CONSTRAINTS.SUB_TEXT_MAX),
        textColor: designData.textColor,
        fontStyle: designData.fontStyle,
        graphicPreset: designData.graphicPreset.slice(0, 40),
        scale: designData.scale,
        retailPrice: designData.retailPrice,
        status: designData.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return designId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handlePlaceOrder = async (
    designData: Omit<CustomDesign, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    orderDetails: {
      size: GarmentSize;
      quantity: number;
      shippingRegion: ShippingRegion;
      totalAmount: number;
    }
  ) => {
    if (!user) {
      await handleGoogleSignIn();
      return;
    }
    const savedDesignId = await handleSaveDesign(designData);
    if (!savedDesignId) return;

    const orderId = `dp_ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const path = `orders/${orderId}`;
    try {
      await setDoc(doc(db, 'orders', orderId), {
        ownerId: user.uid,
        designId: savedDesignId,
        designName: designData.designName.slice(0, BLUEPRINT_CONSTRAINTS.DESIGN_NAME_MAX),
        productTitle: designData.productTitle.slice(0, BLUEPRINT_CONSTRAINTS.PRODUCT_TITLE_MAX),
        size: orderDetails.size,
        quantity: Math.round(orderDetails.quantity),
        totalAmount: Number(orderDetails.totalAmount.toFixed(2)),
        shippingRegion: orderDetails.shippingRegion,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  // Admin Catalog Handlers
  const handleAddProduct = async (
    newProd: Omit<CatalogProduct, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!user) return;
    const productId = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const path = `products/${productId}`;
    try {
      await setDoc(doc(db, 'products', productId), {
        title: newProd.title.slice(0, BLUEPRINT_CONSTRAINTS.PRODUCT_TITLE_MAX),
        category: newProd.category.slice(0, BLUEPRINT_CONSTRAINTS.CATEGORY_MAX_LENGTH),
        technique: newProd.technique.slice(0, BLUEPRINT_CONSTRAINTS.TECHNIQUE_MAX_LENGTH),
        basePrice: Number(newProd.basePrice),
        fulfillmentTime: newProd.fulfillmentTime.slice(0, BLUEPRINT_CONSTRAINTS.FULFILLMENT_TIME_MAX),
        sku: newProd.sku.slice(0, BLUEPRINT_CONSTRAINTS.SKU_MAX_LENGTH),
        inStock: Boolean(newProd.inStock),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleSeedCatalog = async () => {
    if (!user) return;
    for (const item of DEFAULT_CATALOG_PRODUCTS) {
      const path = `products/${item.id}`;
      try {
        const ref = doc(db, 'products', item.id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            title: item.title,
            category: item.category,
            technique: item.technique,
            basePrice: item.basePrice,
            fulfillmentTime: item.fulfillmentTime,
            sku: item.sku,
            inStock: item.inStock,
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(ref, {
            title: item.title,
            category: item.category,
            technique: item.technique,
            basePrice: item.basePrice,
            fulfillmentTime: item.fulfillmentTime,
            sku: item.sku,
            inStock: item.inStock,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
  };

  const handleToggleProductStock = async (product: CatalogProduct) => {
    if (!user) return;
    const path = `products/${product.id}`;
    try {
      const snap = await getDoc(doc(db, 'products', product.id));
      if (!snap.exists()) {
        await setDoc(doc(db, 'products', product.id), {
          title: product.title,
          category: product.category,
          technique: product.technique,
          basePrice: product.basePrice,
          fulfillmentTime: product.fulfillmentTime,
          sku: product.sku,
          inStock: !product.inStock,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, 'products', product.id), {
          inStock: !product.inStock,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const path = `products/${productId}`;
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleUpdateOrderStatus = async (order: FulfillmentOrder, newStatus: OrderStatus) => {
    const path = `orders/${order.id}`;
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const path = `orders/${orderId}`;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleArchiveDesign = async (design: CustomDesign) => {
    const path = `designs/${design.id}`;
    try {
      await updateDoc(doc(db, 'designs', design.id), {
        status: 'archived',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleDeleteDesign = async (designId: string) => {
    const path = `designs/${designId}`;
    try {
      await deleteDoc(doc(db, 'designs', designId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleGrantAdminByUid = async (
    targetUid: string,
    role: 'super_admin' | 'catalog_admin'
  ) => {
    const path = `admins/${targetUid}`;
    try {
      await setDoc(doc(db, 'admins', targetUid), {
        uid: targetUid,
        role,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const filteredCatalog = mergedCatalog.filter((item) =>
    categoryFilter === 'All' ? true : item.category === categoryFilter
  );

  const jumpToDesignMakerWithProduct = (product: CatalogProduct) => {
    setSelectedProduct(product);
    setLoadedDesign(null);
    setActiveSection('studio');
  };

  const loadSamplePresetDraft = (type: 'hoodie' | 'cap') => {
    if (type === 'hoodie') {
      const hoodie = mergedCatalog.find((p) => p.id === 'prod_hoodie_01') || mergedCatalog[0];
      setSelectedProduct(hoodie);
      setLoadedDesign({
        id: 'draft_hoodie_01',
        ownerId: user?.uid || 'guest',
        productId: hoodie.id,
        productTitle: hoodie.title,
        designName: 'Studio Hoodie 01',
        garmentColor: '#0C4A6E',
        placement: 'Front',
        technique: 'DTG Printing',
        headlineText: 'DRIPRINT STUDIO',
        subText: 'EST 2026 / ON-DEMAND',
        textColor: '#FFFFFF',
        fontStyle: 'Syne',
        graphicPreset: 'geometric_crest',
        scale: 100,
        retailPrice: 2398,
        status: 'draft',
      });
    } else {
      const cap = mergedCatalog.find((p) => p.id === 'prod_cap_03') || mergedCatalog[0];
      setSelectedProduct(cap);
      setLoadedDesign({
        id: 'draft_cap_02',
        ownerId: user?.uid || 'guest',
        productId: cap.id,
        productTitle: cap.title,
        designName: 'Summer Cap V2',
        garmentColor: '#14532D',
        placement: 'Front',
        technique: 'Embroidery',
        headlineText: 'DRIPRINT RUN CLUB',
        subText: 'LIMITED EDITION',
        textColor: '#F59E0B',
        fontStyle: 'Plus Jakarta Sans',
        graphicPreset: 'minimal_wave',
        scale: 95,
        retailPrice: 1199,
        status: 'draft',
      });
    }
    setActiveSection('studio');
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[280px_1fr] bg-[#e0f2fe] text-[#0c4a6e] items-start">
      {/* VARIATION 5 FIXED WHITE LEFT SIDEBAR */}
      <aside className="bg-white border-b lg:border-b-0 lg:border-r border-[#0c4a6e]/10 flex flex-col p-6 lg:p-8 justify-between lg:sticky lg:top-0 lg:min-h-screen lg:max-h-screen lg:overflow-y-auto">
        <div>
          {/* Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveSection('studio')}
            className="font-display text-2xl font-extrabold tracking-[-0.04em] text-[#0284c7] uppercase mb-8 lg:mb-10 block text-left cursor-pointer"
          >
            DriPrint
          </button>

          {/* Primary Navigation */}
          <nav>
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#0c4a6e]/50 block mb-4">
              Navigation
            </span>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveSection('studio')}
                  className={`w-full text-left text-[13.5px] py-2 transition-colors cursor-pointer ${
                    activeSection === 'studio'
                      ? 'text-[#0284c7] font-bold opacity-100'
                      : 'text-[#0c4a6e] font-medium opacity-70 hover:opacity-100'
                  }`}
                >
                  DriPrint Creative Studio
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveSection('catalog')}
                  className={`w-full text-left text-[13.5px] py-2 transition-colors cursor-pointer ${
                    activeSection === 'catalog'
                      ? 'text-[#0284c7] font-bold opacity-100'
                      : 'text-[#0c4a6e] font-medium opacity-70 hover:opacity-100'
                  }`}
                >
                  DriPrint Product Catalog ({mergedCatalog.length})
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveSection('fulfillment')}
                  className={`w-full text-left text-[13.5px] py-2 transition-colors cursor-pointer ${
                    activeSection === 'fulfillment'
                      ? 'text-[#0284c7] font-bold opacity-100'
                      : 'text-[#0c4a6e] font-medium opacity-70 hover:opacity-100'
                  }`}
                >
                  DriPrint Global Fulfillment
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveSection('admin')}
                  className={`w-full text-left text-[13.5px] py-2 transition-colors cursor-pointer ${
                    activeSection === 'admin'
                      ? 'text-[#0284c7] font-bold opacity-100'
                      : 'text-[#0c4a6e] font-medium opacity-70 hover:opacity-100'
                  }`}
                >
                  DriPrint Admin Console {orders.length > 0 ? `(${orders.length})` : ''}
                </button>
              </li>
            </ul>

            {/* Recent Drafts / Saved Templates */}
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#0c4a6e]/50 block mt-8 mb-4">
              Recent Drafts
            </span>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => loadSamplePresetDraft('hoodie')}
                  className="w-full text-left text-[13.5px] font-medium text-[#0c4a6e] opacity-70 hover:opacity-100 hover:text-[#0284c7] py-1.5 transition-colors truncate cursor-pointer"
                >
                  DriPrint Studio Hoodie 01
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => loadSamplePresetDraft('cap')}
                  className="w-full text-left text-[13.5px] font-medium text-[#0c4a6e] opacity-70 hover:opacity-100 hover:text-[#0284c7] py-1.5 transition-colors truncate cursor-pointer"
                >
                  DriPrint Summer Cap V2
                </button>
              </li>
              {designs.slice(0, 4).map((dsn) => (
                <li key={dsn.id}>
                  <button
                    type="button"
                    onClick={() => {
                      const prod =
                        mergedCatalog.find((p) => p.id === dsn.productId) || mergedCatalog[0];
                      setSelectedProduct(prod);
                      setLoadedDesign(dsn);
                      setActiveSection('studio');
                    }}
                    className="w-full text-left text-[13.5px] font-medium text-[#0c4a6e] opacity-70 hover:opacity-100 hover:text-[#0284c7] py-1.5 transition-colors truncate cursor-pointer"
                  >
                    {dsn.designName}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Aside Footer (Variation 5 Style) */}
        <div className="pt-8 space-y-2.5">
          <button
            type="button"
            onClick={() => setActiveSection('fulfillment')}
            className="w-full py-3.5 px-4 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
          >
            Upgrade DriPrint Plan
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('admin')}
            className="w-full py-2 px-3 rounded-lg bg-[#e0f2fe]/60 hover:bg-[#0c4a6e] hover:text-white text-[#0c4a6e] font-mono text-[10px] uppercase tracking-[0.15em] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#0284c7]" />
            <span>{user ? 'DriPrint Admin Active' : 'DriPrint Admin Login'}</span>
          </button>
        </div>
      </aside>

      {/* MAIN SCROLLABLE WORKSPACE AREA */}
      <main className="bg-[#e0f2fe] w-full min-w-0 flex flex-col min-h-screen justify-between">
        <div className="flex-1 flex flex-col">
        {authBanner && (
          <div className="bg-white border-b border-[#0284c7]/30 px-8 py-2.5 text-xs text-[#0c4a6e] flex items-center justify-between">
            <span>{authBanner}</span>
            <button
              type="button"
              onClick={() => setAuthBanner(null)}
              className="underline font-semibold ml-4 whitespace-nowrap cursor-pointer text-[#0284c7]"
            >
              Dismiss DriPrint Notice
            </button>
          </div>
        )}

        {/* VIEW 1: CREATIVE STUDIO (3-Column Variation 5 Layout) */}
        {activeSection === 'studio' && (
          <DesignMakerStudio
            products={mergedCatalog}
            selectedProduct={selectedProduct}
            customTechniques={customTechniques}
            onSelectProduct={(prod) => {
              setSelectedProduct(prod);
              setLoadedDesign(null);
            }}
            initialDesign={loadedDesign}
            isAuthenticated={Boolean(user)}
            onRequestSignIn={handleGoogleSignIn}
            onSaveDesign={handleSaveDesign}
            onPlaceOrder={handlePlaceOrder}
          />
        )}

        {/* VIEW 2: CUSTOMIZABLE BLANK PRODUCT CATALOG */}
        {activeSection === 'catalog' && (
          <section id="catalog" className="p-8 space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[#0c4a6e]/10 pb-6">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#0284c7] block mb-1">
                  Retail-Grade Blanks · No Minimum Order Quantities · INR (₹)
                </span>
                <h2 className="text-3xl font-extrabold text-[#0c4a6e] font-display uppercase tracking-tight">
                  Choose a Blank Product to Customize with DriPrint
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {catalogFilterTabs.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-[#0284c7] text-white border-[#0284c7]'
                        : 'bg-white text-[#0c4a6e] border-[#0c4a6e]/10 hover:border-[#0284c7]'
                    }`}
                  >
                    {cat === 'All' ? 'All DriPrint Blanks' : `DriPrint ${cat}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredCatalog.map((product) => {
                const imgSrc =
                  product.imageUrl || PRODUCT_IMAGES[product.id] || PRODUCT_IMAGES.prod_hoodie_01;
                const hasFailed = brokenProductImgs[product.id];

                return (
                  <div
                    key={product.id}
                    className="group bg-white border border-[#0c4a6e]/10 rounded-2xl overflow-hidden flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5 shadow-sm"
                  >
                    <div>
                      <div className="aspect-[4/3] bg-[#e0f2fe]/50 overflow-hidden relative border-b border-[#0c4a6e]/10">
                        {!hasFailed ? (
                          <img
                            src={imgSrc}
                            alt={product.title}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setBrokenProductImgs((prev) => ({ ...prev, [product.id]: true }))
                            }
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#e0f2fe]/40">
                            <Package className="w-8 h-8 text-[#0284c7] mb-2" />
                            <span className="text-xs font-medium text-[#0c4a6e]">
                              {product.title}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-5 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-[#0c4a6e]/65 font-mono">
                          <span>{product.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{product.technique}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#0284c7] font-semibold">{product.sku}</span>
                        </div>

                        <h3 className="text-lg font-extrabold text-[#0c4a6e] font-display uppercase tracking-tight">
                          {product.title}
                        </h3>

                        <div className="flex items-baseline justify-between pt-1">
                          <span className="text-sm font-bold font-mono tabular-nums text-[#0284c7]">
                            From {formatINR(product.basePrice)}
                          </span>
                          <span className="text-xs text-[#0c4a6e]/60">
                            {product.fulfillmentTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 pb-5">
                      <button
                        type="button"
                        onClick={() => jumpToDesignMakerWithProduct(product)}
                        className="w-full py-3 px-4 bg-[#0c4a6e] hover:bg-[#0284c7] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Customize with DriPrint
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* VIEW 3: GLOBAL FULFILLMENT & HERO SHOWCASE */}
        {activeSection === 'fulfillment' && (
          <section id="how-it-works" className="p-8 space-y-10">
            {/* Hero Campaign Block */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-center bg-white border border-[#0c4a6e]/10 rounded-2xl p-8 shadow-sm">
              <div className="xl:col-span-6 space-y-5">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#0284c7] block">
                  On-Demand Manufacturing · Global White-Label Fulfillment
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-[#0c4a6e] font-display leading-tight">
                  Create and Sell Custom Products with DriPrint
                </h1>
                <p className="text-sm text-[#0c4a6e]/75 leading-relaxed">
                  Turn your artwork and typography into retail-ready heavyweight apparel, embroidered headwear, and studio accessories. Configure print placements in the interactive DriPrint Design Maker and ship globally with transparent INR (₹) fulfillment pricing.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveSection('studio')}
                    className="px-5 py-3.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <span>Start Designing on DriPrint</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('catalog')}
                    className="px-5 py-3.5 bg-[#e0f2fe] hover:bg-[#0c4a6e] hover:text-white text-[#0c4a6e] text-xs font-bold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Browse DriPrint Catalog
                  </button>
                </div>
              </div>

              <div className="xl:col-span-6">
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-[#0c4a6e]/10 bg-[#e0f2fe]">
                  {!heroImgError ? (
                    <img
                      src={HERO_STUDIO_IMAGE}
                      alt="Curated custom heavyweight hoodie, graphic tee, embroidered cap, and ceramic mug in the DriPrint studio"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                      <Layers className="w-10 h-10 text-[#0284c7] mb-2" />
                      <div className="font-display uppercase text-lg text-[#0c4a6e]">
                        DriPrint Production Studio
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 flex items-end justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-mono text-[#e0f2fe]">
                        450GSM COMBED COTTON · 300 DPI DTG
                      </div>
                      <div className="text-xs text-white font-medium mt-0.5">
                        Front, Back, Left Chest & Sleeve Placements
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSection('studio')}
                      className="px-3.5 py-2 bg-[#0284c7] text-white text-xs font-bold uppercase rounded-md whitespace-nowrap cursor-pointer"
                    >
                      Open in DriPrint
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Numbered Capabilities — Expanded Box Length & Size */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="bg-white border border-[#0c4a6e]/10 rounded-2xl p-8 lg:p-10 min-h-[360px] flex flex-col justify-between space-y-6 shadow-sm">
                <div className="space-y-4">
                  <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#0284c7] font-semibold block">
                    Step 01 · Interactive Studio Engine
                  </span>
                  <h3 className="text-2xl lg:text-3xl font-extrabold text-[#0c4a6e] font-display uppercase tracking-tight leading-snug">
                    01. Configure Print & Embroidery Files in the DriPrint Design Maker
                  </h3>
                  <p className="text-sm lg:text-base text-[#0c4a6e]/75 leading-relaxed">
                    Pair studio typography or vector emblems directly on heavyweight 450gsm blanks. DriPrint automatically calculates stitch density for 3D puff embroidery and color-profiles DTG Kornit Atlas MAX print heads at 300 DPI across every garment placement.
                  </p>
                  <div className="grid grid-cols-3 gap-4 pt-2 border-t border-[#0c4a6e]/10 font-mono text-xs text-[#0c4a6e]">
                    <div>
                      <span className="block text-[10px] uppercase text-[#0c4a6e]/50">Resolution</span>
                      <span className="font-bold text-[#0284c7]">300 DPI CMYK</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-[#0c4a6e]/50">Print Zones</span>
                      <span className="font-bold">5 Active Zones</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-[#0c4a6e]/50">Techniques</span>
                      <span className="font-bold">DTG · Puff · Sub</span>
                    </div>
                  </div>
                </div>
                <div className="pt-6 border-t border-[#0c4a6e]/10 flex flex-wrap items-center justify-between gap-4">
                  <span className="text-xs font-mono text-[#0c4a6e]/65">
                    Front · Back · Left Chest · Sleeve · 360° Wrap
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSection('studio')}
                    className="px-6 py-3.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Launch DriPrint Maker
                  </button>
                </div>
              </div>

              <div className="bg-white border border-[#0c4a6e]/10 rounded-2xl p-8 lg:p-10 min-h-[360px] flex flex-col justify-between space-y-6 shadow-sm">
                <div className="space-y-4">
                  <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#0284c7] font-semibold block">
                    Step 02 · Catalog & Storefront Sync
                  </span>
                  <h3 className="text-2xl lg:text-3xl font-extrabold text-[#0c4a6e] font-display uppercase tracking-tight leading-snug">
                    02. Sample or Publish to Your Storefront
                  </h3>
                  <p className="text-sm lg:text-base text-[#0c4a6e]/75 leading-relaxed">
                    Order discounted physical samples or publish templates directly to your catalog with custom INR (₹) retail margins, custom Apparel Categories & Techniques, and real-time fulfillment queue tracking.
                  </p>
                  <div className="grid grid-cols-3 gap-4 pt-2 border-t border-[#0c4a6e]/10 font-mono text-xs text-[#0c4a6e]">
                    <div>
                      <span className="block text-[10px] uppercase text-[#0c4a6e]/50">Currency</span>
                      <span className="font-bold text-[#0284c7]">INR (₹) Native</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-[#0c4a6e]/50">Minimum Order</span>
                      <span className="font-bold">No MOQ (1+ Unit)</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-[#0c4a6e]/50">Dispatch SLA</span>
                      <span className="font-bold">2–4 Business Days</span>
                    </div>
                  </div>
                </div>
                <div className="pt-6 border-t border-[#0c4a6e]/10 flex flex-wrap items-center justify-between gap-4">
                  <span className="text-xs font-mono text-[#0c4a6e]/65">
                    Asia-Pacific · Europe · North America · Global Express
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSection('admin')}
                    className="px-6 py-3.5 bg-[#0c4a6e] hover:bg-[#0284c7] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Manage in DriPrint Admin
                  </button>
                </div>
              </div>
            </div>

            {/* Attributable Proof */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-white border border-[#0c4a6e]/10 rounded-2xl space-y-3">
                <p className="text-xs text-[#0c4a6e]/85 leading-relaxed">
                  “Before switching to DriPrint, our studio tied up ₹14,50,000 per seasonal drop in unsold screen-printed inventory. Moving our 450gsm hoodie line to DriPrint on-demand cut fulfillment turnaround to 2.6 business days and increased net apparel margins by +34% over 6 months.”
                </p>
                <div className="text-[11px] font-mono text-[#0284c7] pt-2 border-t border-[#0c4a6e]/10">
                  Lukas Lindqvist · Creative Director, Studio Kvadrat Stockholm
                </div>
              </div>

              <div className="p-6 bg-white border border-[#0c4a6e]/10 rounded-2xl space-y-3">
                <p className="text-xs text-[#0c4a6e]/85 leading-relaxed">
                  “We needed consistent 6-panel twill embroidery across India, Europe, and North America without managing separate warehouses. DriPrint’s regional routing reduced shipping costs by 41% and delivered a 99.6% defect-free arrival rate across 14,200 orders.”
                </p>
                <div className="text-[11px] font-mono text-[#0284c7] pt-2 border-t border-[#0c4a6e]/10">
                  Elena Rostova · Head of Merchandising, Meridian Run Collective
                </div>
              </div>
            </div>
          </section>
        )}

        {/* VIEW 4: ADMIN CONSOLE */}
        {activeSection === 'admin' && (
          <section id="admin-console" className="p-6 lg:p-8 pb-16">
            <AdminConsole
              user={user}
              isAdmin={isAdmin}
              isBootstrappedAdmin={isBootstrappedAdmin}
              products={mergedCatalog}
              designs={designs}
              orders={orders}
              customCategories={customCategories}
              customTechniques={customTechniques}
              onAddCustomCategory={handleAddCustomCategory}
              onAddCustomTechnique={handleAddCustomTechnique}
              onSignIn={handleGoogleSignIn}
              onSignOut={handleSignOut}
              onAddProduct={handleAddProduct}
              onToggleProductStock={handleToggleProductStock}
              onDeleteProduct={handleDeleteProduct}
              onSeedCatalog={handleSeedCatalog}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onDeleteOrder={handleDeleteOrder}
              onLoadDesignInStudio={(design) => {
                const matchedProd =
                  mergedCatalog.find((p) => p.id === design.productId) || mergedCatalog[0];
                setSelectedProduct(matchedProd);
                setLoadedDesign(design);
                setActiveSection('studio');
              }}
              onArchiveDesign={handleArchiveDesign}
              onDeleteDesign={handleDeleteDesign}
              onGrantAdminByUid={handleGrantAdminByUid}
            />
          </section>
        )}
        </div>

        {/* Clean Page Bottom Footer */}
        <footer className="bg-white border-t border-[#0c4a6e]/10 px-6 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-4 text-xs text-[#0c4a6e]/70">
          <div>
            © {new Date().getFullYear()} DriPrint On-Demand Studio & Global Fulfillment · All pricing in INR (₹)
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveSection('studio');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-[#0284c7] font-semibold cursor-pointer"
            >
              DriPrint Studio
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                setActiveSection('catalog');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-[#0284c7] font-semibold cursor-pointer"
            >
              DriPrint Catalog
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                setActiveSection('fulfillment');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-[#0284c7] font-semibold cursor-pointer"
            >
              DriPrint Global Fulfillment
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                setActiveSection('admin');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-[#0284c7] font-semibold cursor-pointer"
            >
              DriPrint Admin Console
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
