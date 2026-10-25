import React, { useState, useMemo } from 'react';
import { User } from 'firebase/auth';
import {
  ShieldCheck,
  Package,
  Truck,
  Layers,
  Plus,
  Trash2,
  LogOut,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Search,
  Database,
  UserCheck,
  X,
} from 'lucide-react';
import {
  BLUEPRINT_CONSTRAINTS,
  CatalogProduct,
  CustomDesign,
  formatINR,
  FulfillmentOrder,
  OrderStatus,
  PrintTechnique,
  ProductCategory,
} from '../types/driprint';
import { DEFAULT_CATEGORIES, DEFAULT_TECHNIQUES } from '../data/defaultCatalog';
import { BOOTSTRAPPED_ADMIN_EMAIL } from '../lib/firebase';

interface AdminConsoleProps {
  user: User | null;
  isAdmin: boolean;
  isBootstrappedAdmin: boolean;
  products: CatalogProduct[];
  designs: CustomDesign[];
  orders: FulfillmentOrder[];
  customCategories: string[];
  customTechniques: string[];
  onAddCustomCategory: (newCat: string) => void;
  onAddCustomTechnique: (newTech: string) => void;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onAddProduct: (product: Omit<CatalogProduct, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onToggleProductStock: (product: CatalogProduct) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onSeedCatalog: () => Promise<void>;
  onUpdateOrderStatus: (order: FulfillmentOrder, newStatus: OrderStatus) => Promise<void>;
  onDeleteOrder: (orderId: string) => Promise<void>;
  onLoadDesignInStudio: (design: CustomDesign) => void;
  onArchiveDesign: (design: CustomDesign) => Promise<void>;
  onDeleteDesign: (designId: string) => Promise<void>;
  onGrantAdminByUid: (targetUid: string, role: 'super_admin' | 'catalog_admin') => Promise<void>;
}

type AdminTab = 'catalog' | 'orders' | 'designs' | 'admins';

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  user,
  isAdmin,
  isBootstrappedAdmin,
  products,
  designs,
  orders,
  customCategories,
  customTechniques,
  onAddCustomCategory,
  onAddCustomTechnique,
  onSignIn,
  onSignOut,
  onAddProduct,
  onToggleProductStock,
  onDeleteProduct,
  onSeedCatalog,
  onUpdateOrderStatus,
  onDeleteOrder,
  onLoadDesignInStudio,
  onArchiveDesign,
  onDeleteDesign,
  onGrantAdminByUid,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState<OrderStatus | 'all'>('all');

  // New Product Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Apparel');
  const [technique, setTechnique] = useState<PrintTechnique>('DTG Printing');
  const [basePrice, setBasePrice] = useState('699');
  const [fulfillmentTime, setFulfillmentTime] = useState('2-4 business days');
  const [sku, setSku] = useState('DP-NEW-101');
  const [inStock, setInStock] = useState(true);

  // Inline "Add New Option" states for Category & Apparel Technique
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewTechniqueInput, setShowNewTechniqueInput] = useState(false);
  const [newTechniqueName, setNewTechniqueName] = useState('');

  // Admin Registry Form State
  const [targetAdminUid, setTargetAdminUid] = useState('');
  const [targetAdminRole, setTargetAdminRole] = useState<'super_admin' | 'catalog_admin'>('catalog_admin');

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const availableCategories = useMemo(() => {
    const set = new Set<string>([
      ...DEFAULT_CATEGORIES,
      ...customCategories,
      ...products.map((p) => p.category),
    ]);
    return Array.from(set).filter(Boolean);
  }, [customCategories, products]);

  const availableTechniques = useMemo(() => {
    const set = new Set<string>([
      ...DEFAULT_TECHNIQUES,
      ...customTechniques,
      ...products.map((p) => p.technique),
    ]);
    return Array.from(set).filter(Boolean);
  }, [customTechniques, products]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white border border-[#0c4a6e]/10 rounded-2xl p-8 text-[#0c4a6e] shadow-lg shadow-[#0284c7]/10">
        <div className="flex items-center gap-2.5 mb-3">
          <ShieldCheck className="w-6 h-6 text-[#0284c7]" />
          <h2 className="text-2xl font-extrabold font-display uppercase tracking-tight text-[#0c4a6e]">
            DriPrint Admin & Creator Login
          </h2>
        </div>
        <p className="text-sm text-[#0c4a6e]/75 leading-relaxed mb-6">
          Authenticate with your verified Google account to access the DriPrint Admin Fulfillment Console, manage blank catalog inventory in INR (₹), add custom Apparel Categories & Techniques, and update production orders.
        </p>

        <div className="p-4 bg-[#e0f2fe] border border-[#0c4a6e]/10 rounded-xl mb-6 space-y-2 text-xs text-[#0c4a6e]/80">
          <div className="font-mono uppercase text-[#0284c7] font-bold tracking-wider">
            DriPrint Zero-Trust Access Policy
          </div>
          <div>
            Bootstrapped Super Admin: <span className="font-mono font-semibold text-[#0c4a6e]">{BOOTSTRAPPED_ADMIN_EMAIL}</span>
          </div>
          <div>
            Standard authenticated creators can manage their own saved DriPrint templates and track or cancel pending sample orders.
          </div>
        </div>

        <button
          type="button"
          onClick={onSignIn}
          className="w-full py-3.5 px-5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          <span>Sign in to DriPrint Admin with Google</span>
        </button>
      </div>
    );
  }

  const handleSaveNewCategoryOption = () => {
    setStatusMessage(null);
    const cleaned = newCategoryName.trim().slice(0, BLUEPRINT_CONSTRAINTS.CATEGORY_MAX_LENGTH);
    if (!cleaned) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid Category or Apparel type name.' });
      return;
    }
    if (!BLUEPRINT_CONSTRAINTS.CATEGORY_TECHNIQUE_PATTERN.test(cleaned)) {
      setStatusMessage({
        type: 'error',
        text: 'Category name can only contain letters, numbers, spaces, &, /, (, ), and hyphens.',
      });
      return;
    }
    onAddCustomCategory(cleaned);
    setCategory(cleaned);
    setNewCategoryName('');
    setShowNewCategoryInput(false);
    setStatusMessage({
      type: 'success',
      text: `Added new Category option "${cleaned}" to DriPrint.`,
    });
  };

  const handleSaveNewTechniqueOption = () => {
    setStatusMessage(null);
    const cleaned = newTechniqueName.trim().slice(0, BLUEPRINT_CONSTRAINTS.TECHNIQUE_MAX_LENGTH);
    if (!cleaned) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid Apparel / Print Technique name.' });
      return;
    }
    if (!BLUEPRINT_CONSTRAINTS.CATEGORY_TECHNIQUE_PATTERN.test(cleaned)) {
      setStatusMessage({
        type: 'error',
        text: 'Technique name can only contain letters, numbers, spaces, &, /, (, ), and hyphens.',
      });
      return;
    }
    onAddCustomTechnique(cleaned);
    setTechnique(cleaned);
    setNewTechniqueName('');
    setShowNewTechniqueInput(false);
    setStatusMessage({
      type: 'success',
      text: `Added new Apparel Technique option "${cleaned}" to DriPrint.`,
    });
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const trimmedTitle = title.trim().slice(0, BLUEPRINT_CONSTRAINTS.PRODUCT_TITLE_MAX);
    const trimmedCategory = category.trim().slice(0, BLUEPRINT_CONSTRAINTS.CATEGORY_MAX_LENGTH);
    const trimmedTechnique = technique.trim().slice(0, BLUEPRINT_CONSTRAINTS.TECHNIQUE_MAX_LENGTH);
    const trimmedSku = sku.trim().toUpperCase().slice(0, BLUEPRINT_CONSTRAINTS.SKU_MAX_LENGTH);
    const parsedPrice = Number(basePrice);

    if (!trimmedTitle) {
      setStatusMessage({ type: 'error', text: 'Product title is required.' });
      return;
    }
    if (!trimmedCategory || !BLUEPRINT_CONSTRAINTS.CATEGORY_TECHNIQUE_PATTERN.test(trimmedCategory)) {
      setStatusMessage({
        type: 'error',
        text: 'Category name must be 1–50 characters (letters, numbers, spaces, &, /, -).',
      });
      return;
    }
    if (!trimmedTechnique || !BLUEPRINT_CONSTRAINTS.CATEGORY_TECHNIQUE_PATTERN.test(trimmedTechnique)) {
      setStatusMessage({
        type: 'error',
        text: 'Technique name must be 1–50 characters (letters, numbers, spaces, &, /, -).',
      });
      return;
    }
    if (!BLUEPRINT_CONSTRAINTS.SKU_PATTERN.test(trimmedSku)) {
      setStatusMessage({
        type: 'error',
        text: 'SKU must contain only uppercase letters, numbers, and hyphens (e.g. DP-TEE-101).',
      });
      return;
    }
    if (
      isNaN(parsedPrice) ||
      parsedPrice < BLUEPRINT_CONSTRAINTS.BASE_PRICE_MIN ||
      parsedPrice > BLUEPRINT_CONSTRAINTS.BASE_PRICE_MAX
    ) {
      setStatusMessage({ type: 'error', text: 'Base price must be between ₹1 and ₹5,00,000.' });
      return;
    }

    setIsBusy(true);
    try {
      await onAddProduct({
        title: trimmedTitle,
        category: trimmedCategory,
        technique: trimmedTechnique,
        basePrice: Number(parsedPrice.toFixed(2)),
        fulfillmentTime:
          fulfillmentTime.trim().slice(0, BLUEPRINT_CONSTRAINTS.FULFILLMENT_TIME_MAX) ||
          '2-4 business days',
        sku: trimmedSku,
        inStock,
      });
      setTitle('');
      setSku(`DP-SKU-${Math.floor(100 + Math.random() * 899)}`);
      setStatusMessage({
        type: 'success',
        text: `Added "${trimmedTitle}" (${trimmedCategory} · ${trimmedTechnique}) at ${formatINR(parsedPrice)} to the DriPrint Catalog.`,
      });
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to add product. Verify admin permissions.' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleGrantAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    const cleanUid = targetAdminUid.trim();
    if (!BLUEPRINT_CONSTRAINTS.ID_PATTERN.test(cleanUid) || cleanUid.length > BLUEPRINT_CONSTRAINTS.ID_MAX_LENGTH) {
      setStatusMessage({ type: 'error', text: 'Enter a valid Firebase Auth UID (alphanumeric, _, -).' });
      return;
    }
    setIsBusy(true);
    try {
      await onGrantAdminByUid(cleanUid, targetAdminRole);
      setTargetAdminUid('');
      setStatusMessage({
        type: 'success',
        text: `Granted ${targetAdminRole} access on DriPrint to UID ${cleanUid}.`,
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Could not grant admin role. Only Bootstrapped Super Admin can modify /admins.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const totalOrderRevenue = orders.reduce(
    (acc, o) => acc + (o.status !== 'cancelled' ? o.totalAmount : 0),
    0
  );
  const filteredProducts = products.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.technique.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredOrders = orders.filter((o) =>
    orderFilter === 'all' ? true : o.status === orderFilter
  );

  return (
    <div className="space-y-6 text-[#0c4a6e]">
      {/* Top Admin Header Bar */}
      <div className="bg-white border border-[#0c4a6e]/10 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#0c4a6e]/60 font-mono mb-1">
            <span className="text-[#0284c7] font-semibold">DRIPRINT PLATFORM</span>
            <span aria-hidden="true">/</span>
            <span>{isAdmin ? 'ADMIN FULFILLMENT CONSOLE' : 'CREATOR WORKSPACE'}</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#0c4a6e]">{user.email}</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#0c4a6e] font-display uppercase tracking-tight">
            {isAdmin ? 'DriPrint Operations & Catalog Admin' : 'My DriPrint Templates & Orders'}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              type="button"
              disabled={isBusy}
              onClick={async () => {
                setIsBusy(true);
                try {
                  await onSeedCatalog();
                  setStatusMessage({
                    type: 'success',
                    text: 'Synchronized default DriPrint products (in ₹ INR) into Firestore.',
                  });
                } catch {
                  setStatusMessage({
                    type: 'error',
                    text: 'Could not seed catalog products.',
                  });
                } finally {
                  setIsBusy(false);
                }
              }}
              className="px-3.5 py-2.5 text-xs font-semibold bg-[#e0f2fe] hover:bg-[#0284c7] hover:text-white text-[#0c4a6e] border border-[#0c4a6e]/10 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-[#0284c7] group-hover:text-white" />
              <span>Sync DriPrint Catalog DB</span>
            </button>
          )}
          <button
            type="button"
            onClick={onSignOut}
            className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-[#0c4a6e] hover:bg-[#082f49] text-white rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out of DriPrint</span>
          </button>
        </div>
      </div>

      {/* Status Notification */}
      {statusMessage && (
        <div
          className={`px-5 py-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-white border-[#0284c7]/40 text-[#0c4a6e]'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#0284c7] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="underline ml-4 whitespace-nowrap cursor-pointer font-semibold"
          >
            Close DriPrint Alert
          </button>
        </div>
      )}

      {/* KPI Summary Grid (Tabular Numerals, INR Volume) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#0c4a6e]/10 rounded-2xl p-5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#0c4a6e]/60">
            DriPrint Catalog SKUs
          </div>
          <div className="text-2xl font-extrabold text-[#0c4a6e] font-display tabular-nums mt-1">
            {products.length}
          </div>
          <div className="text-xs text-[#0c4a6e]/60 mt-1">
            {products.filter((p) => p.inStock).length} active in stock
          </div>
        </div>

        <div className="bg-white border border-[#0c4a6e]/10 rounded-2xl p-5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#0c4a6e]/60">
            Saved DriPrint Templates
          </div>
          <div className="text-2xl font-extrabold text-[#0c4a6e] font-display tabular-nums mt-1">
            {designs.length}
          </div>
          <div className="text-xs text-[#0c4a6e]/60 mt-1">
            {designs.filter((d) => d.status === 'published').length} published ready
          </div>
        </div>

        <div className="bg-white border border-[#0c4a6e]/10 rounded-2xl p-5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#0c4a6e]/60">
            Fulfillment Orders
          </div>
          <div className="text-2xl font-extrabold text-[#0c4a6e] font-display tabular-nums mt-1">
            {orders.length}
          </div>
          <div className="text-xs text-[#0c4a6e]/60 mt-1">
            {orders.filter((o) => o.status === 'pending' || o.status === 'printing').length} in production queue
          </div>
        </div>

        <div className="bg-[#0284c7] text-white rounded-2xl p-5 shadow-md shadow-[#0284c7]/15">
          <div className="text-[11px] font-mono uppercase tracking-wider text-white/85">
            Fulfillment Volume (INR)
          </div>
          <div className="text-2xl font-extrabold text-white font-display tabular-nums mt-1">
            {formatINR(totalOrderRevenue)}
          </div>
          <div className="text-xs text-white/85 mt-1">
            {isAdmin ? 'Verified Admin Access · ₹ INR' : 'Verified Creator Account · ₹ INR'}
          </div>
        </div>
      </div>

      {/* Segmented Console Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#0c4a6e]/10 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-[#0284c7] text-white border-[#0284c7]'
                : 'bg-white text-[#0c4a6e] border-[#0c4a6e]/10 hover:border-[#0284c7]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>DriPrint Blank Catalog ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-[#0284c7] text-white border-[#0284c7]'
                : 'bg-white text-[#0c4a6e] border-[#0c4a6e]/10 hover:border-[#0284c7]'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>DriPrint Fulfillment Queue ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('designs')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'designs'
                ? 'bg-[#0284c7] text-white border-[#0284c7]'
                : 'bg-white text-[#0c4a6e] border-[#0c4a6e]/10 hover:border-[#0284c7]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>DriPrint Saved Templates ({designs.length})</span>
          </button>

          {isBootstrappedAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('admins')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'admins'
                  ? 'bg-[#0284c7] text-white border-[#0284c7]'
                  : 'bg-white text-[#0c4a6e] border-[#0c4a6e]/10 hover:border-[#0284c7]'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>DriPrint Admin Registry</span>
            </button>
          )}
        </div>

        {activeTab === 'catalog' && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#0c4a6e]/50 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter DriPrint SKU, category, technique..."
              className="pl-8 pr-3 py-2 text-xs bg-white text-[#0c4a6e] border border-[#0c4a6e]/15 rounded-lg focus:outline-none focus:border-[#0284c7]"
            />
          </div>
        )}
      </div>

      {/* TAB 1: CATALOG MANAGEMENT */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Admin Add Blank Product Form */}
          {isAdmin && (
            <form
              onSubmit={handleCreateProduct}
              className="lg:col-span-4 bg-white border border-[#0c4a6e]/10 rounded-2xl p-6 space-y-4 h-fit"
            >
              <h3 className="text-base font-extrabold text-[#0c4a6e] font-display uppercase tracking-tight flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#0284c7]" />
                <span>Add Blank Product to DriPrint</span>
              </h3>

              <div>
                <label className="block text-xs font-bold text-[#0c4a6e] mb-1">
                  Product Title
                </label>
                <input
                  type="text"
                  required
                  maxLength={BLUEPRINT_CONSTRAINTS.PRODUCT_TITLE_MAX}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Garment-Dyed Heavyweight Tee"
                  className="w-full p-2.5 text-xs bg-[#e0f2fe] text-[#0c4a6e] border border-[#0c4a6e]/10 rounded-lg focus:outline-none focus:border-[#0284c7]"
                />
              </div>

              {/* Category & Apparel Classification with "+ Add New Option" */}
              <div className="space-y-2 p-3.5 bg-[#e0f2fe]/60 rounded-xl border border-[#0c4a6e]/10">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-[#0c4a6e]">
                    Category & Apparel Type
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewCategoryInput((prev) => !prev)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-[#0284c7]/40 hover:bg-[#0284c7] hover:text-white text-[#0284c7] rounded-md transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    {showNewCategoryInput ? (
                      <>
                        <X className="w-3 h-3" />
                        <span>Cancel on DriPrint</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        <span>+ Add Category on DriPrint</span>
                      </>
                    )}
                  </button>
                </div>

                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__ADD_NEW_CATEGORY__') {
                      setShowNewCategoryInput(true);
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full p-2.5 text-xs bg-white text-[#0c4a6e] border border-[#0c4a6e]/15 rounded-lg focus:outline-none focus:border-[#0284c7]"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__ADD_NEW_CATEGORY__">
                    + Add New Category / Apparel Option...
                  </option>
                </select>

                {showNewCategoryInput && (
                  <div className="pt-1.5 space-y-2">
                    <input
                      type="text"
                      maxLength={BLUEPRINT_CONSTRAINTS.CATEGORY_MAX_LENGTH}
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g., Apparel - Oversized Streetwear"
                      className="w-full p-2 text-xs bg-white text-[#0c4a6e] border border-[#0284c7] rounded-lg focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveNewCategoryOption}
                      className="w-full py-2 px-3 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Save Category to DriPrint
                    </button>
                  </div>
                )}
              </div>

              {/* Apparel / Print Technique with "+ Add New Option" */}
              <div className="space-y-2 p-3.5 bg-[#e0f2fe]/60 rounded-xl border border-[#0c4a6e]/10">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-[#0c4a6e]">
                    Apparel & Print Technique
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewTechniqueInput((prev) => !prev)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-[#0284c7]/40 hover:bg-[#0284c7] hover:text-white text-[#0284c7] rounded-md transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    {showNewTechniqueInput ? (
                      <>
                        <X className="w-3 h-3" />
                        <span>Cancel on DriPrint</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        <span>+ Add Technique on DriPrint</span>
                      </>
                    )}
                  </button>
                </div>

                <select
                  value={technique}
                  onChange={(e) => {
                    if (e.target.value === '__ADD_NEW_TECHNIQUE__') {
                      setShowNewTechniqueInput(true);
                    } else {
                      setTechnique(e.target.value);
                    }
                  }}
                  className="w-full p-2.5 text-xs bg-white text-[#0c4a6e] border border-[#0c4a6e]/15 rounded-lg focus:outline-none focus:border-[#0284c7]"
                >
                  {availableTechniques.map((tech) => (
                    <option key={tech} value={tech}>
                      {tech}
                    </option>
                  ))}
                  <option value="__ADD_NEW_TECHNIQUE__">
                    + Add New Apparel Technique...
                  </option>
                </select>

                {showNewTechniqueInput && (
                  <div className="pt-1.5 space-y-2">
                    <input
                      type="text"
                      maxLength={BLUEPRINT_CONSTRAINTS.TECHNIQUE_MAX_LENGTH}
                      value={newTechniqueName}
                      onChange={(e) => setNewTechniqueName(e.target.value)}
                      placeholder="e.g., High-Density Puff Print"
                      className="w-full p-2 text-xs bg-white text-[#0c4a6e] border border-[#0284c7] rounded-lg focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveNewTechniqueOption}
                      className="w-full py-2 px-3 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Save Technique to DriPrint
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0c4a6e] mb-1">
                    Base Cost (₹ INR)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min={BLUEPRINT_CONSTRAINTS.BASE_PRICE_MIN}
                    max={BLUEPRINT_CONSTRAINTS.BASE_PRICE_MAX}
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="w-full p-2.5 text-xs font-mono bg-[#e0f2fe] text-[#0c4a6e] border border-[#0c4a6e]/10 rounded-lg focus:outline-none focus:border-[#0284c7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0c4a6e] mb-1">
                    SKU Code (A-Z, 0-9, -)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={BLUEPRINT_CONSTRAINTS.SKU_MAX_LENGTH}
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    className="w-full p-2.5 text-xs font-mono bg-[#e0f2fe] text-[#0c4a6e] border border-[#0c4a6e]/10 rounded-lg focus:outline-none focus:border-[#0284c7]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0c4a6e] mb-1">
                  Est. Fulfillment Window
                </label>
                <input
                  type="text"
                  maxLength={BLUEPRINT_CONSTRAINTS.FULFILLMENT_TIME_MAX}
                  value={fulfillmentTime}
                  onChange={(e) => setFulfillmentTime(e.target.value)}
                  className="w-full p-2.5 text-xs bg-[#e0f2fe] text-[#0c4a6e] border border-[#0c4a6e]/10 rounded-lg focus:outline-none focus:border-[#0284c7]"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-[#0c4a6e] cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => setInStock(e.target.checked)}
                  className="rounded border-[#0c4a6e]/30 accent-[#0284c7]"
                />
                <span>Available in stock for DriPrint creators</span>
              </label>

              <button
                type="submit"
                disabled={isBusy}
                className="w-full py-3 px-4 bg-[#0c4a6e] hover:bg-[#082f49] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Add Product to DriPrint
              </button>
            </form>
          )}

          {/* Catalog Table */}
          <div className={`${isAdmin ? 'lg:col-span-8' : 'lg:col-span-12'} bg-white border border-[#0c4a6e]/10 rounded-2xl overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#0c4a6e]/10 bg-[#e0f2fe]/50 text-[11px] font-mono uppercase text-[#0c4a6e]/70">
                    <th className="py-3.5 px-4">SKU</th>
                    <th className="py-3.5 px-4">Blank Product</th>
                    <th className="py-3.5 px-4">Category · Technique</th>
                    <th className="py-3.5 px-4 text-right">Base Cost (INR)</th>
                    <th className="py-3.5 px-4">Availability</th>
                    {isAdmin && <th className="py-3.5 px-4 text-right">Admin Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0c4a6e]/10 text-xs">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-[#e0f2fe]/35 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[#0c4a6e]/70 whitespace-nowrap">
                        {product.sku}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#0c4a6e]">
                        {product.title}
                      </td>
                      <td className="py-3.5 px-4 text-[#0c4a6e]/75 whitespace-nowrap">
                        {product.category} · {product.technique}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-[#0284c7] whitespace-nowrap">
                        {formatINR(product.basePrice)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`font-mono text-[11px] uppercase font-semibold ${
                            product.inStock ? 'text-[#0284c7]' : 'text-[#0c4a6e]/45'
                          }`}
                        >
                          {product.inStock ? 'In Stock' : 'Backordered'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                          <button
                            type="button"
                            onClick={() => onToggleProductStock(product)}
                            className="px-2.5 py-1.5 text-xs font-medium bg-[#e0f2fe] hover:bg-[#0284c7] hover:text-white text-[#0c4a6e] rounded-md transition-colors cursor-pointer"
                          >
                            Toggle DriPrint Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteProduct(product.id)}
                            className="px-2.5 py-1.5 text-xs font-medium bg-red-50 hover:bg-red-600 hover:text-white text-red-700 border border-red-200 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete from DriPrint</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDER FULFILLMENT QUEUE */}
      {activeTab === 'orders' && (
        <div className="bg-white border border-[#0c4a6e]/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#0c4a6e]/10 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-extrabold font-display uppercase tracking-tight text-[#0c4a6e]">
              DriPrint Production & Sample Orders (INR)
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 'pending', 'printing', 'shipped', 'delivered', 'cancelled'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setOrderFilter(st)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                    orderFilter === st
                      ? 'bg-[#0284c7] text-white border-[#0284c7]'
                      : 'bg-[#e0f2fe]/60 text-[#0c4a6e] border-[#0c4a6e]/10 hover:border-[#0284c7]'
                  }`}
                >
                  DriPrint {st.charAt(0).toUpperCase() + st.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-[#0c4a6e]/80 mb-2">
                No fulfillment orders found in this queue state.
              </p>
              <p className="text-xs text-[#0c4a6e]/55">
                Use the DriPrint Design Maker Studio to configure a garment and submit a sample order.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#0c4a6e]/10 bg-[#e0f2fe]/50 text-[11px] font-mono uppercase text-[#0c4a6e]/70">
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Design · Product</th>
                    <th className="py-3.5 px-4">Size · Qty</th>
                    <th className="py-3.5 px-4">Fulfillment Hub</th>
                    <th className="py-3.5 px-4 text-right">Total (INR)</th>
                    <th className="py-3.5 px-4">Pipeline Status</th>
                    <th className="py-3.5 px-4 text-right">DriPrint Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0c4a6e]/10 text-xs">
                  {filteredOrders.map((order) => {
                    const isTerminal = order.status === 'delivered' || order.status === 'cancelled';
                    return (
                      <tr key={order.id} className="hover:bg-[#e0f2fe]/35 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[#0c4a6e]/70 whitespace-nowrap">
                          #{order.id.slice(0, 8)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#0c4a6e]">{order.designName}</div>
                          <div className="text-[#0c4a6e]/60">{order.productTitle}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                          {order.size} × {order.quantity}
                        </td>
                        <td className="py-3.5 px-4 text-[#0c4a6e]/75 whitespace-nowrap">
                          {order.shippingRegion}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-[#0284c7] whitespace-nowrap">
                          {formatINR(order.totalAmount)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-[11px] uppercase font-semibold text-[#0284c7]">
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                          {isAdmin && (
                            <>
                              {order.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateOrderStatus(order, 'printing')}
                                  className="px-2.5 py-1.5 text-xs font-bold bg-[#0284c7] text-white rounded-md hover:bg-[#0369a1] cursor-pointer"
                                >
                                  Start DriPrint Print
                                </button>
                              )}
                              {order.status === 'printing' && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateOrderStatus(order, 'shipped')}
                                  className="px-2.5 py-1.5 text-xs font-bold bg-[#0284c7] text-white rounded-md hover:bg-[#0369a1] cursor-pointer"
                                >
                                  Ship via DriPrint
                                </button>
                              )}
                              {order.status === 'shipped' && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateOrderStatus(order, 'delivered')}
                                  className="px-2.5 py-1.5 text-xs font-bold bg-[#0c4a6e] text-white rounded-md hover:bg-[#082f49] cursor-pointer"
                                >
                                  Mark DriPrint Delivered
                                </button>
                              )}
                            </>
                          )}
                          {order.status === 'pending' && !isTerminal && (
                            <button
                              type="button"
                              onClick={() => onUpdateOrderStatus(order, 'cancelled')}
                              className="px-2.5 py-1.5 text-xs font-medium bg-[#e0f2fe] text-[#0c4a6e] hover:bg-red-600 hover:text-white rounded-md cursor-pointer"
                            >
                              Cancel on DriPrint
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => onDeleteOrder(order.id)}
                              className="px-2 py-1 text-xs font-medium text-[#0c4a6e]/60 hover:text-red-600 cursor-pointer"
                            >
                              Delete from DriPrint
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SAVED DESIGN TEMPLATES */}
      {activeTab === 'designs' && (
        <div className="bg-white border border-[#0c4a6e]/10 rounded-2xl overflow-hidden">
          {designs.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-[#0c4a6e]/80 mb-2">
                No saved DriPrint product templates yet.
              </p>
              <p className="text-xs text-[#0c4a6e]/55">
                Click "Save DriPrint Template" inside the Design Maker Studio to store reusable templates.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#0c4a6e]/10 bg-[#e0f2fe]/50 text-[11px] font-mono uppercase text-[#0c4a6e]/70">
                    <th className="py-3.5 px-4">Template Name</th>
                    <th className="py-3.5 px-4">Base Product</th>
                    <th className="py-3.5 px-4">Placement · Technique</th>
                    <th className="py-3.5 px-4">Artwork Copy</th>
                    <th className="py-3.5 px-4 text-right">Retail Price (INR)</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">DriPrint Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0c4a6e]/10 text-xs">
                  {designs.map((design) => (
                    <tr key={design.id} className="hover:bg-[#e0f2fe]/35 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[#0c4a6e]">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-[#0c4a6e]/30 shrink-0"
                            style={{ backgroundColor: design.garmentColor }}
                          />
                          <span>{design.designName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#0c4a6e]/75">{design.productTitle}</td>
                      <td className="py-3.5 px-4 text-[#0c4a6e]/75 whitespace-nowrap">
                        {design.placement} · {design.technique}
                      </td>
                      <td className="py-3.5 px-4 text-[#0c4a6e]/75 font-mono truncate max-w-[180px]">
                        {design.headlineText || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-[#0284c7] whitespace-nowrap">
                        {formatINR(design.retailPrice)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] uppercase text-[#0c4a6e]">
                        {design.status}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          onClick={() => onLoadDesignInStudio(design)}
                          className="px-2.5 py-1.5 text-xs font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-md cursor-pointer"
                        >
                          Open in DriPrint Maker
                        </button>
                        {design.status !== 'archived' && (
                          <button
                            type="button"
                            onClick={() => onArchiveDesign(design)}
                            className="px-2.5 py-1.5 text-xs font-medium bg-[#e0f2fe] hover:bg-[#0c4a6e] hover:text-white text-[#0c4a6e] rounded-md cursor-pointer"
                          >
                            Archive on DriPrint
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteDesign(design.id)}
                          className="px-2.5 py-1.5 text-xs font-medium bg-red-50 hover:bg-red-600 hover:text-white text-red-700 border border-red-200 rounded-md cursor-pointer"
                        >
                          Delete from DriPrint
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ADMIN REGISTRY (Bootstrapped Super Admin Only) */}
      {activeTab === 'admins' && isBootstrappedAdmin && (
        <div className="bg-white border border-[#0c4a6e]/10 rounded-2xl p-6 max-w-xl">
          <h3 className="text-base font-extrabold text-[#0c4a6e] font-display uppercase tracking-tight mb-2">
            Grant DriPrint Administrator Privileges
          </h3>
          <p className="text-xs text-[#0c4a6e]/75 mb-4 leading-relaxed">
            Register an additional operator’s Firebase Auth UID in <span className="font-mono text-[#0284c7]">/admins/&#123;adminId&#125;</span> so they pass the <span className="font-mono text-[#0284c7]">isAdmin()</span> Zero-Trust security gate.
          </p>

          <form onSubmit={handleGrantAdminSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#0c4a6e] mb-1">
                Operator Firebase Auth UID
              </label>
              <input
                type="text"
                required
                maxLength={BLUEPRINT_CONSTRAINTS.ID_MAX_LENGTH}
                value={targetAdminUid}
                onChange={(e) => setTargetAdminUid(e.target.value)}
                placeholder="e.g., 9xK2pLm8..."
                className="w-full p-2.5 text-xs font-mono bg-[#e0f2fe] text-[#0c4a6e] border border-[#0c4a6e]/10 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0c4a6e] mb-1">
                DriPrint Admin Tier
              </label>
              <select
                value={targetAdminRole}
                onChange={(e) => setTargetAdminRole(e.target.value as 'super_admin' | 'catalog_admin')}
                className="w-full p-2.5 text-xs bg-[#e0f2fe] text-[#0c4a6e] border border-[#0c4a6e]/10 rounded-lg"
              >
                <option value="catalog_admin">
                  catalog_admin (Catalog & Order Operations)
                </option>
                <option value="super_admin">
                  super_admin (Full Platform Operations)
                </option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className="px-4 py-3 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Grant DriPrint Admin Access
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
