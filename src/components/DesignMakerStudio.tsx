import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  Sparkles,
  ShoppingBag,
  Bookmark,
  RotateCcw,
  Eye,
  Grid,
  FileText,
  Maximize2,
} from 'lucide-react';
import {
  BLUEPRINT_CONSTRAINTS,
  CatalogProduct,
  CustomDesign,
  FontStyleOption,
  formatINR,
  GarmentSize,
  PrintPlacement,
  PrintTechnique,
  ShippingRegion,
} from '../types/driprint';
import {
  DEFAULT_TECHNIQUES,
  GARMENT_COLOR_SWATCHES,
  GRAPHIC_PRESETS,
  INK_COLOR_SWATCHES,
  PRODUCT_IMAGES,
} from '../data/defaultCatalog';

interface DesignMakerStudioProps {
  products: CatalogProduct[];
  selectedProduct: CatalogProduct;
  customTechniques?: string[];
  onSelectProduct: (product: CatalogProduct) => void;
  initialDesign?: CustomDesign | null;
  isAuthenticated: boolean;
  onRequestSignIn: () => void;
  onSaveDesign: (designData: Omit<CustomDesign, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<string | null>;
  onPlaceOrder: (
    designData: Omit<CustomDesign, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    orderDetails: {
      size: GarmentSize;
      quantity: number;
      shippingRegion: ShippingRegion;
      totalAmount: number;
    }
  ) => Promise<void>;
}

const PLACEMENTS: { value: PrintPlacement; label: string }[] = [
  { value: 'Front', label: 'Front Center' },
  { value: 'Back', label: 'Back Large' },
  { value: 'Left Chest', label: 'Left Chest' },
  { value: 'Sleeve', label: 'Sleeve' },
  { value: 'Wrap', label: '360° Wrap' },
];

const FONT_OPTIONS: FontStyleOption[] = ['Times New Roman', 'Syne', 'Plus Jakarta Sans', 'JetBrains Mono', 'Serif'];
const SIZES: GarmentSize[] = ['S', 'M', 'L', 'XL', '2XL', 'One Size'];
const REGIONS: ShippingRegion[] = ['North America', 'Europe', 'Asia-Pacific', 'Global Express'];

const QUICK_DESIGNS = [
  {
    designName: 'Heavyweight Studio Edition 01',
    headlineText: 'DRIPRINT STUDIO',
    subText: 'EST 2026 / ON-DEMAND',
    garmentColor: '#0C4A6E',
    textColor: '#FFFFFF',
    fontStyle: 'Times New Roman' as FontStyleOption,
    graphicPreset: 'geometric_crest',
    placement: 'Front' as PrintPlacement,
  },
  {
    designName: 'Summer Cap V2',
    headlineText: 'NORDIC RUN CLUB',
    subText: 'STOCKHOLM · OSLO',
    garmentColor: '#14532D',
    textColor: '#F59E0B',
    fontStyle: 'Times New Roman' as FontStyleOption,
    graphicPreset: 'minimal_wave',
    placement: 'Front' as PrintPlacement,
  },
  {
    designName: 'Analog Sound Archive',
    headlineText: 'ANALOG SOUND LAB',
    subText: 'HIGH FIDELITY PRESSING',
    garmentColor: '#18181B',
    textColor: '#FFFFFF',
    fontStyle: 'JetBrains Mono' as FontStyleOption,
    graphicPreset: 'studio_globe',
    placement: 'Back' as PrintPlacement,
  },
];

export const DesignMakerStudio: React.FC<DesignMakerStudioProps> = ({
  products,
  selectedProduct,
  customTechniques = [],
  onSelectProduct,
  initialDesign,
  isAuthenticated,
  onRequestSignIn,
  onSaveDesign,
  onPlaceOrder,
}) => {
  const [designName, setDesignName] = useState('Heavyweight Studio Edition 01');
  const [garmentColor, setGarmentColor] = useState('#0C4A6E');
  const [placement, setPlacement] = useState<PrintPlacement>('Front');
  const [technique, setTechnique] = useState<PrintTechnique>(selectedProduct.technique);
  const [headlineText, setHeadlineText] = useState('DRIPRINT STUDIO');
  const [subText, setSubText] = useState('EST 2026 / ON-DEMAND');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [fontStyle, setFontStyle] = useState<FontStyleOption>('Times New Roman');
  const [graphicPreset, setGraphicPreset] = useState('geometric_crest');
  const [scale, setScale] = useState(100);
  const [retailPrice, setRetailPrice] = useState(Math.round(selectedProduct.basePrice * 1.6));
  const [designStatus, setDesignStatus] = useState<'draft' | 'published'>('published');

  // Order config state
  const [size, setSize] = useState<GarmentSize>('L');
  const [quantity, setQuantity] = useState(1);
  const [shippingRegion, setShippingRegion] = useState<ShippingRegion>('Asia-Pacific');

  // Canvas view controls
  const [showPrintGuides, setShowPrintGuides] = useState(true);
  const [showPhotoBackdrop, setShowPhotoBackdrop] = useState(false);
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const techniqueOptions = useMemo(() => {
    const set = new Set<string>([
      ...DEFAULT_TECHNIQUES,
      selectedProduct.technique,
      ...customTechniques,
      ...products.map((p) => p.technique),
    ]);
    return Array.from(set).filter(Boolean);
  }, [selectedProduct.technique, customTechniques, products]);

  useEffect(() => {
    setTechnique(selectedProduct.technique);
    setRetailPrice(Math.round(selectedProduct.basePrice * 1.6));
    setImgError(false);
  }, [selectedProduct]);

  useEffect(() => {
    if (initialDesign) {
      setDesignName(initialDesign.designName.slice(0, BLUEPRINT_CONSTRAINTS.DESIGN_NAME_MAX));
      setGarmentColor(initialDesign.garmentColor);
      setPlacement(initialDesign.placement);
      setTechnique(initialDesign.technique);
      setHeadlineText(initialDesign.headlineText.slice(0, BLUEPRINT_CONSTRAINTS.HEADLINE_TEXT_MAX));
      setSubText(initialDesign.subText.slice(0, BLUEPRINT_CONSTRAINTS.SUB_TEXT_MAX));
      setTextColor(initialDesign.textColor);
      setFontStyle(initialDesign.fontStyle);
      setGraphicPreset(initialDesign.graphicPreset);
      setScale(initialDesign.scale);
      setRetailPrice(initialDesign.retailPrice);
      if (initialDesign.status === 'draft' || initialDesign.status === 'published') {
        setDesignStatus(initialDesign.status);
      }
    }
  }, [initialDesign]);

  const applyQuickDesign = (index: number) => {
    const preset = QUICK_DESIGNS[index % QUICK_DESIGNS.length];
    setDesignName(preset.designName);
    setHeadlineText(preset.headlineText);
    setSubText(preset.subText);
    setGarmentColor(preset.garmentColor);
    setTextColor(preset.textColor);
    setFontStyle(preset.fontStyle);
    setGraphicPreset(preset.graphicPreset);
    setPlacement(preset.placement);
    setFeedbackBanner({
      type: 'success',
      message: `Loaded "${preset.designName}" in DriPrint Studio.`,
    });
  };

  const resetCanvas = () => {
    setDesignName('Heavyweight Studio Edition 01');
    setGarmentColor('#0C4A6E');
    setPlacement('Front');
    setTechnique(selectedProduct.technique);
    setHeadlineText('DRIPRINT STUDIO');
    setSubText('EST 2026 / ON-DEMAND');
    setTextColor('#FFFFFF');
    setFontStyle('Times New Roman');
    setGraphicPreset('geometric_crest');
    setScale(100);
    setRetailPrice(Math.round(selectedProduct.basePrice * 1.6));
    setFeedbackBanner(null);
  };

  const buildSanitizedDesignPayload = (): Omit<CustomDesign, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> => {
    const safeName = (designName.trim() || 'Untitled DriPrint Design').slice(0, BLUEPRINT_CONSTRAINTS.DESIGN_NAME_MAX);
    const safeHeadline = headlineText.slice(0, BLUEPRINT_CONSTRAINTS.HEADLINE_TEXT_MAX);
    const safeSub = subText.slice(0, BLUEPRINT_CONSTRAINTS.SUB_TEXT_MAX);
    const safeScale = Math.min(BLUEPRINT_CONSTRAINTS.SCALE_MAX, Math.max(BLUEPRINT_CONSTRAINTS.SCALE_MIN, Number(scale) || 100));
    const safeRetail = Math.min(
      BLUEPRINT_CONSTRAINTS.RETAIL_PRICE_MAX,
      Math.max(BLUEPRINT_CONSTRAINTS.RETAIL_PRICE_MIN, Number(retailPrice) || 999)
    );
    const safeGarmentHex = BLUEPRINT_CONSTRAINTS.HEX_COLOR_PATTERN.test(garmentColor) ? garmentColor : '#0C4A6E';
    const safeTextHex = BLUEPRINT_CONSTRAINTS.HEX_COLOR_PATTERN.test(textColor) ? textColor : '#FFFFFF';
    const safeProductId = selectedProduct.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'prod_hoodie_01';
    const safeTechnique =
      technique.trim().slice(0, BLUEPRINT_CONSTRAINTS.TECHNIQUE_MAX_LENGTH) || 'DTG Printing';

    return {
      productId: safeProductId,
      productTitle: selectedProduct.title.slice(0, BLUEPRINT_CONSTRAINTS.PRODUCT_TITLE_MAX),
      designName: safeName,
      garmentColor: safeGarmentHex,
      placement,
      technique: safeTechnique,
      headlineText: safeHeadline,
      subText: safeSub,
      textColor: safeTextHex,
      fontStyle,
      graphicPreset,
      scale: safeScale,
      retailPrice: safeRetail,
      status: designStatus,
    };
  };

  const handleSaveClick = async () => {
    if (!isAuthenticated) {
      onRequestSignIn();
      return;
    }
    setIsSaving(true);
    setFeedbackBanner(null);
    try {
      const payload = buildSanitizedDesignPayload();
      const savedId = await onSaveDesign(payload);
      if (savedId) {
        setFeedbackBanner({
          type: 'success',
          message: `Template "${payload.designName}" saved to your DriPrint account.`,
        });
      }
    } catch {
      setFeedbackBanner({
        type: 'error',
        message: 'Could not save template to DriPrint. Verify your inputs and try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOrderClick = async () => {
    if (!isAuthenticated) {
      onRequestSignIn();
      return;
    }
    setIsOrdering(true);
    setFeedbackBanner(null);
    try {
      const payload = buildSanitizedDesignPayload();
      const safeQty = Math.min(
        BLUEPRINT_CONSTRAINTS.ORDER_QTY_MAX,
        Math.max(BLUEPRINT_CONSTRAINTS.ORDER_QTY_MIN, Math.round(Number(quantity) || 1))
      );
      const totalAmount = Number((selectedProduct.basePrice * safeQty).toFixed(2));
      await onPlaceOrder(payload, {
        size,
        quantity: safeQty,
        shippingRegion,
        totalAmount,
      });
      setFeedbackBanner({
        type: 'success',
        message: `Order for ${safeQty}x "${payload.designName}" (${size}) at ${formatINR(totalAmount)} submitted to DriPrint Fulfillment (${shippingRegion}).`,
      });
    } catch {
      setFeedbackBanner({
        type: 'error',
        message: 'Could not submit order to DriPrint. Check your verification status and try again.',
      });
    } finally {
      setIsOrdering(false);
    }
  };

  const unitProfit = Math.max(0, retailPrice - selectedProduct.basePrice);
  const totalOrderCost = selectedProduct.basePrice * quantity;
  const resolvedProductImage =
    selectedProduct.imageUrl || PRODUCT_IMAGES[selectedProduct.id] || PRODUCT_IMAGES.prod_hoodie_01;

  const getPlacementBox = () => {
    switch (placement) {
      case 'Left Chest':
        return { top: '28%', left: '54%', width: '24%', height: '18%' };
      case 'Back':
        return { top: '25%', left: '29%', width: '42%', height: '40%' };
      case 'Sleeve':
        return { top: '34%', left: '12%', width: '18%', height: '24%' };
      case 'Wrap':
        return { top: '30%', left: '22%', width: '56%', height: '34%' };
      case 'Front':
      default:
        return { top: '25%', left: '30%', width: '40%', height: '40%' };
    }
  };

  const placementBox = getPlacementBox();

  const renderGraphicMotif = () => {
    switch (graphicPreset) {
      case 'geometric_crest':
        return (
          <svg viewBox="0 0 80 80" className="w-10 h-10 mx-auto mb-1.5" fill="none" stroke={textColor} strokeWidth="2.5">
            <polygon points="40,8 72,26 72,54 40,72 8,54 8,26" />
            <circle cx="40" cy="40" r="14" />
            <line x1="40" y1="8" x2="40" y2="26" />
            <line x1="40" y1="54" x2="40" y2="72" />
          </svg>
        );
      case 'studio_globe':
        return (
          <svg viewBox="0 0 80 80" className="w-10 h-10 mx-auto mb-1.5" fill="none" stroke={textColor} strokeWidth="2.2">
            <circle cx="40" cy="40" r="28" />
            <ellipse cx="40" cy="40" rx="14" ry="28" />
            <line x1="12" y1="40" x2="68" y2="40" />
            <line x1="16" y1="26" x2="64" y2="26" />
            <line x1="16" y1="54" x2="64" y2="54" />
          </svg>
        );
      case 'minimal_wave':
        return (
          <svg viewBox="0 0 80 50" className="w-12 h-8 mx-auto mb-1.5" fill="none" stroke={textColor} strokeWidth="3" strokeLinecap="round">
            <path d="M8 25 Q24 8, 40 25 T72 25" />
            <path d="M8 37 Q24 20, 40 37 T72 37" opacity="0.65" />
          </svg>
        );
      case 'vintage_stamp':
        return (
          <svg viewBox="0 0 80 80" className="w-10 h-10 mx-auto mb-1.5" fill="none" stroke={textColor} strokeWidth="2.2">
            <rect x="12" y="12" width="56" height="56" rx="8" />
            <rect x="18" y="18" width="44" height="44" rx="4" strokeDasharray="4 3" />
            <path d="M28 46 L40 26 L52 46 Z" />
          </svg>
        );
      case 'typography_only':
      default:
        return null;
    }
  };

  const renderGarmentSilhouette = () => {
    const strokeCol = garmentColor.toLowerCase() === '#f5f5f0' ? '#0c4a6e' : 'rgba(12,74,110,0.25)';

    if (selectedProduct.category.toLowerCase().includes('headwear')) {
      return (
        <svg viewBox="0 0 400 440" className="w-[300px] h-[340px]">
          <path
            d="M85 250 C85 135, 315 135, 315 250 L330 265 C250 280, 150 280, 70 265 Z"
            fill={garmentColor}
            stroke={strokeCol}
            strokeWidth="2"
          />
          <path
            d="M70 265 C150 280, 250 280, 330 265 C355 295, 320 325, 200 325 C80 325, 45 295, 70 265 Z"
            fill={garmentColor}
            stroke={strokeCol}
            strokeWidth="2"
          />
          <circle cx="200" cy="162" r="6" fill="rgba(255,255,255,0.35)" />
        </svg>
      );
    }

    if (selectedProduct.category.toLowerCase().includes('drinkware')) {
      return (
        <svg viewBox="0 0 400 440" className="w-[300px] h-[340px]">
          <path
            d="M275 165 C335 165, 335 295, 275 295"
            fill="none"
            stroke={garmentColor}
            strokeWidth="22"
            strokeLinecap="round"
          />
          <rect
            x="105"
            y="125"
            width="175"
            height="210"
            rx="16"
            fill={garmentColor}
            stroke={strokeCol}
            strokeWidth="2"
          />
        </svg>
      );
    }

    if (selectedProduct.category.toLowerCase().includes('accessories')) {
      return (
        <svg viewBox="0 0 400 440" className="w-[300px] h-[340px]">
          <path
            d="M145 145 C145 65, 255 65, 255 145"
            fill="none"
            stroke="#0c4a6e"
            strokeWidth="8"
          />
          <rect
            x="95"
            y="140"
            width="210"
            height="245"
            rx="8"
            fill={garmentColor}
            stroke={strokeCol}
            strokeWidth="2"
          />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 400 460" className="w-[300px] h-[340px]">
        <path
          d="M135 72 L75 102 L32 215 L84 238 L112 162 L112 398 L288 398 L288 162 L316 238 L368 215 L325 102 L265 72 C245 96, 155 96, 135 72 Z"
          fill={garmentColor}
          stroke={strokeCol}
          strokeWidth="1.5"
        />
      </svg>
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] flex-1 items-start">
      {/* MAIN STUDIO CANVAS COLUMN (Variation 5 Layout) */}
      <div className="flex flex-col justify-between studio-canvas-glow min-h-[680px] xl:sticky xl:top-0">
        {/* Header Bar */}
        <div className="px-6 lg:px-8 py-5 border-b border-[#0c4a6e]/10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-extrabold uppercase text-[#0c4a6e]">
              Studio Design Maker
            </h1>
            <p className="text-xs text-[#0c4a6e]/60 mt-0.5">
              {selectedProduct.title} ({selectedProduct.sku}) · {designName}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#0c4a6e]/70 bg-white px-2.5 py-1 rounded border border-[#0c4a6e]/10">
              {technique.toUpperCase()}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#0284c7] bg-white px-2.5 py-1 rounded border border-[#0c4a6e]/10">
              300 DPI
            </span>
            <button
              type="button"
              onClick={() => setShowPrintGuides((prev) => !prev)}
              className={`px-2.5 py-1 text-xs font-mono border rounded transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                showPrintGuides
                  ? 'bg-[#0284c7] text-white border-[#0284c7]'
                  : 'bg-white text-[#0c4a6e] border-[#0c4a6e]/15 hover:border-[#0284c7]'
              }`}
            >
              <Grid className="w-3 h-3" />
              <span>DriPrint Guides</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPhotoBackdrop((prev) => !prev)}
              className={`px-2.5 py-1 text-xs font-mono border rounded transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                showPhotoBackdrop
                  ? 'bg-[#0284c7] text-white border-[#0284c7]'
                  : 'bg-white text-[#0c4a6e] border-[#0c4a6e]/15 hover:border-[#0284c7]'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>DriPrint Photo</span>
            </button>
            <button
              type="button"
              onClick={resetCanvas}
              className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#0c4a6e] hover:text-white text-[#0c4a6e] border border-[#0c4a6e]/15 rounded transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset DriPrint</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackBanner && (
          <div
            className={`px-8 py-2.5 text-xs font-medium flex items-center justify-between border-b ${
              feedbackBanner.type === 'success'
                ? 'bg-[#0284c7]/10 text-[#0c4a6e] border-[#0284c7]/30'
                : 'bg-red-50 text-red-900 border-red-200'
            }`}
          >
            <span>{feedbackBanner.message}</span>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="underline ml-4 whitespace-nowrap cursor-pointer font-semibold"
            >
              Dismiss DriPrint Notice
            </button>
          </div>
        )}

        {/* Quick Preset & Scale Bar */}
        <div className="px-8 py-2.5 bg-white/50 border-b border-[#0c4a6e]/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-[#0c4a6e]/60 uppercase tracking-[0.15em]">
              Presets:
            </span>
            {QUICK_DESIGNS.map((preset, idx) => (
              <button
                key={preset.designName}
                type="button"
                onClick={() => applyQuickDesign(idx)}
                className="px-2.5 py-1 text-xs bg-white hover:bg-[#0284c7] hover:text-white text-[#0c4a6e] border border-[#0c4a6e]/10 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-[#0284c7] group-hover:text-white" />
                <span>DriPrint {preset.designName.split(' ').slice(0, 2).join(' ')}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Maximize2 className="w-3.5 h-3.5 text-[#0284c7]" />
            <span className="text-xs font-mono text-[#0c4a6e]/70">Scale:</span>
            <input
              type="range"
              min={BLUEPRINT_CONSTRAINTS.SCALE_MIN}
              max={BLUEPRINT_CONSTRAINTS.SCALE_MAX}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="w-24 accent-[#0284c7] cursor-pointer"
            />
            <span className="text-xs font-mono text-[#0284c7] font-semibold w-10 text-right tabular-nums">
              {scale}%
            </span>
          </div>
        </div>

        {/* Canvas Area with Elevated White Mockup Card (Variation 5 Signature) */}
        <div className="flex-1 flex items-center justify-center relative p-8 min-h-[480px]">
          <div className="w-full max-w-[460px] aspect-square relative bg-white rounded-[2rem] shadow-[0_40px_100px_-20px_rgba(2,132,199,0.2)] flex items-center justify-center overflow-hidden">
            {showPhotoBackdrop && !imgError ? (
              <img
                src={resolvedProductImage}
                alt={selectedProduct.title}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              renderGarmentSilhouette()
            )}

            {/* Print Zone Overlay */}
            <div
              className={`
                absolute flex flex-col items-center justify-center p-4 text-center transition-transform duration-150
                ${showPrintGuides ? 'border-2 border-dashed border-[#0284c7] bg-[#0284c7]/5' : ''}
              `}
              style={{
                top: placementBox.top,
                left: placementBox.left,
                width: placementBox.width,
                height: placementBox.height,
              }}
            >
              <div
                className="select-none transition-transform duration-150"
                style={{
                  transform: `scale(${scale / 100})`,
                  color: textColor,
                  fontFamily:
                    fontStyle === 'Times New Roman'
                      ? "'Times New Roman', Times, serif"
                      : fontStyle === 'Syne'
                      ? "'Syne', sans-serif"
                      : fontStyle === 'JetBrains Mono'
                      ? 'var(--font-mono)'
                      : fontStyle === 'Serif'
                      ? 'Georgia, serif'
                      : "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {renderGraphicMotif()}
                {headlineText && (
                  <h2
                    className={`font-extrabold leading-tight tracking-wide break-words ${
                      placement === 'Left Chest' || placement === 'Sleeve'
                        ? 'text-xs'
                        : 'text-base'
                    }`}
                    style={{ color: textColor }}
                  >
                    {headlineText}
                  </h2>
                )}
                {subText && (
                  <p
                    className="font-mono text-[10px] tracking-[0.1em] opacity-80 mt-0.5 break-words"
                    style={{ color: textColor }}
                  >
                    {subText}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Stats Bar (Variation 5 White 3-Column Strip) */}
        <div className="grid grid-cols-3 border-t border-[#0c4a6e]/10 bg-white">
          <div className="p-4 text-center border-r border-[#0c4a6e]/10">
            <span className="block font-mono font-bold text-sm text-[#0c4a6e] tabular-nums">
              38.4M+
            </span>
            <span className="block text-[10px] uppercase tracking-wider text-[#0c4a6e]/50 mt-0.5">
              Fulfilled
            </span>
          </div>
          <div className="p-4 text-center border-r border-[#0c4a6e]/10">
            <span className="block font-mono font-bold text-sm text-[#0c4a6e] tabular-nums">
              99.4%
            </span>
            <span className="block text-[10px] uppercase tracking-wider text-[#0c4a6e]/50 mt-0.5">
              Quality Rate
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="block font-mono font-bold text-sm text-[#0c4a6e] tabular-nums">
              2-4 Days
            </span>
            <span className="block text-[10px] uppercase tracking-wider text-[#0c4a6e]/50 mt-0.5">
              Dispatch
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT CONFIGURATOR PANEL (Variation 5 White Surface) */}
      <section className="bg-white border-t xl:border-t-0 xl:border-l border-[#0c4a6e]/10 p-6 lg:p-8 pb-16 space-y-5">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#0c4a6e]/50 block">
          Configurator
        </span>

        {/* Blank Model */}
        <div>
          <label htmlFor="blank-model-select" className="block text-xs font-bold text-[#0c4a6e] mb-2">
            Blank Model
          </label>
          <select
            id="blank-model-select"
            value={selectedProduct.id}
            onChange={(e) => {
              const found = products.find((p) => p.id === e.target.value);
              if (found) onSelectProduct(found);
            }}
            className="w-full p-3 text-[13.5px] bg-[#e0f2fe] text-[#0c4a6e] border border-[#0c4a6e]/10 rounded-lg focus:outline-none focus:border-[#0284c7]"
          >
            {products.map((prod) => (
              <option key={prod.id} value={prod.id}>
                {prod.title} — {formatINR(prod.basePrice)}
              </option>
            ))}
          </select>
        </div>

        {/* Technique */}
        <div>
          <label htmlFor="technique-select" className="block text-xs font-bold text-[#0c4a6e] mb-2">
            Technique
          </label>
          <select
            id="technique-select"
            value={technique}
            onChange={(e) => setTechnique(e.target.value)}
            className="w-full p-3 text-[13.5px] bg-[#e0f2fe] text-[#0c4a6e] border border-[#0c4a6e]/10 rounded-lg focus:outline-none focus:border-[#0284c7]"
          >
            {techniqueOptions.map((tech) => (
              <option key={tech} value={tech}>
                DriPrint {tech}
              </option>
            ))}
          </select>
        </div>

        {/* Placement */}
        <div>
          <label htmlFor="placement-select" className="block text-xs font-bold text-[#0c4a6e] mb-2">
            Placement
          </label>
          <select
            id="placement-select"
            value={placement}
            onChange={(e) => setPlacement(e.target.value as PrintPlacement)}
            className="w-full p-3 text-[13.5px] bg-[#e0f2fe] text-[#0c4a6e] border border-[#0c4a6e]/10 rounded-lg focus:outline-none focus:border-[#0284c7]"
          >
            {PLACEMENTS.map((place) => (
              <option key={place.value} value={place.value}>
                DriPrint {place.label}
              </option>
            ))}
          </select>
        </div>

        {/* Base Color & Ink Color Chips */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#0c4a6e] mb-2">
              Base Color
            </label>
            <div className="flex flex-wrap gap-2">
              {GARMENT_COLOR_SWATCHES.map((swatch) => {
                const active = garmentColor.toLowerCase() === swatch.hex.toLowerCase();
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    title={swatch.name}
                    onClick={() => setGarmentColor(swatch.hex)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-transform cursor-pointer ${
                      active
                        ? 'border-[#0284c7] scale-110'
                        : 'border-[#0c4a6e]/20'
                    }`}
                    style={{ backgroundColor: swatch.hex }}
                  >
                    {active && (
                      <Check
                        className={`w-3 h-3 ${
                          swatch.hex === '#F5F5F0' ? 'text-[#0c4a6e]' : 'text-white'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0c4a6e] mb-2">
              Ink / Thread Color
            </label>
            <div className="flex flex-wrap gap-2">
              {INK_COLOR_SWATCHES.map((swatch) => {
                const active = textColor.toLowerCase() === swatch.hex.toLowerCase();
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    title={swatch.name}
                    onClick={() => setTextColor(swatch.hex)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-transform cursor-pointer ${
                      active
                        ? 'border-[#0284c7] scale-110'
                        : 'border-[#0c4a6e]/20'
                    }`}
                    style={{ backgroundColor: swatch.hex }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Artwork Text & Emblem */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#0c4a6e]">
            Artwork Text & Motif
          </label>
          <input
            type="text"
            maxLength={BLUEPRINT_CONSTRAINTS.DESIGN_NAME_MAX}
            value={designName}
            onChange={(e) => setDesignName(e.target.value)}
            placeholder="Project / Template Name"
            className="w-full p-2.5 text-xs bg-[#e0f2fe] text-[#0c4a6e] border border-[#0c4a6e]/10 rounded-lg focus:outline-none focus:border-[#0284c7]"
          />
          <input
            type="text"
            maxLength={BLUEPRINT_CONSTRAINTS.HEADLINE_TEXT_MAX}
            value={headlineText}
            onChange={(e) => setHeadlineText(e.target.value)}
            placeholder="Primary Artwork Headline"
            className="w-full p-2.5 text-xs bg-[#e0f2fe] text-[#0c4a6e] border border-[#0c4a6e]/10 rounded-lg focus:outline-none focus:border-[#0284c7]"
          />
          <input
            type="text"
            maxLength={BLUEPRINT_CONSTRAINTS.SUB_TEXT_MAX}
            value={subText}
            onChange={(e) => setSubText(e.target.value)}
            placeholder="Secondary Subtitle"
            className="w-full p-2.5 text-xs bg-[#e0f2fe] text-[#0c4a6e] border border-[#0c4a6e]/10 rounded-lg focus:outline-none focus:border-[#0284c7]"
          />

          <div className="grid grid-cols-2 gap-2 pt-1">
            <select
              value={fontStyle}
              onChange={(e) => setFontStyle(e.target.value as FontStyleOption)}
              className="w-full p-2.5 text-xs bg-[#e0f2fe] text-[#0c4a6e] border border-[#0c4a6e]/10 rounded-lg"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>

            <select
              value={graphicPreset}
              onChange={(e) => setGraphicPreset(e.target.value)}
              className="w-full p-2.5 text-xs bg-[#e0f2fe] text-[#0c4a6e] border border-[#0c4a6e]/10 rounded-lg"
            >
              {GRAPHIC_PRESETS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Qty, Retail (₹), Size & Hub */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-[#0c4a6e] mb-1.5">
              Qty
            </label>
            <input
              type="number"
              min={BLUEPRINT_CONSTRAINTS.ORDER_QTY_MIN}
              max={BLUEPRINT_CONSTRAINTS.ORDER_QTY_MAX}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
              className="w-full p-2.5 text-xs font-mono bg-[#e0f2fe] text-[#0c4a6e] border border-[#0c4a6e]/10 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0c4a6e] mb-1.5">
              Retail (₹)
            </label>
            <input
              type="number"
              min={BLUEPRINT_CONSTRAINTS.RETAIL_PRICE_MIN}
              max={BLUEPRINT_CONSTRAINTS.RETAIL_PRICE_MAX}
              value={retailPrice}
              onChange={(e) => setRetailPrice(Number(e.target.value))}
              className="w-full p-2.5 text-xs font-mono bg-[#e0f2fe] text-[#0c4a6e] border border-[#0c4a6e]/10 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-[#0c4a6e] mb-1.5">
              Size
            </label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value as GarmentSize)}
              className="w-full p-2.5 text-xs bg-[#e0f2fe] text-[#0c4a6e] border border-[#0c4a6e]/10 rounded-lg"
            >
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0c4a6e] mb-1.5">
              Fulfillment Hub
            </label>
            <select
              value={shippingRegion}
              onChange={(e) => setShippingRegion(e.target.value as ShippingRegion)}
              className="w-full p-2.5 text-xs bg-[#e0f2fe] text-[#0c4a6e] border border-[#0c4a6e]/10 rounded-lg"
            >
              {REGIONS.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sky Blue Price Card (Variation 5 Signature Component) */}
        <div className="bg-[#0284c7] text-white p-6 rounded-2xl mt-6 space-y-2 shadow-lg shadow-[#0284c7]/15">
          <div className="flex items-center justify-between text-[11px] opacity-85 font-bold uppercase">
            <span>Fulfillment Est</span>
            <span>Margin +{formatINR(unitProfit)}</span>
          </div>

          <div className="font-display text-3xl font-extrabold my-1.5 tabular-nums">
            {formatINR(totalOrderCost)}
          </div>

          <p className="text-[11px] opacity-90 pb-2">
            {technique} · {shippingRegion} Hub · {quantity} × {size}
          </p>

          <button
            type="button"
            disabled={isOrdering}
            onClick={handleOrderClick}
            className="w-full py-3.5 px-4 bg-[#0c4a6e] hover:bg-[#082f49] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>
              {isOrdering ? 'Submitting to DriPrint...' : 'Proceed to DriPrint Sample'}
            </span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveClick}
            className="w-full py-2.5 px-4 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>
              {isSaving ? 'Saving to DriPrint...' : 'Save DriPrint Template'}
            </span>
          </button>
        </div>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setShowSpecModal((prev) => !prev)}
            className="text-[10px] font-mono uppercase tracking-wider text-[#0284c7] hover:underline transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <FileText className="w-3 h-3" />
            <span>Download DriPrint Technical Spec</span>
          </button>
        </div>

        {showSpecModal && (
          <div className="p-3.5 bg-[#e0f2fe] border border-[#0284c7]/30 rounded-lg text-[11px] font-mono text-[#0c4a6e] space-y-1">
            <div className="text-[#0284c7] font-bold">DRIPRINT SPEC SHEET — {selectedProduct.sku}</div>
            <div>Model: {selectedProduct.title}</div>
            <div>Category: {selectedProduct.category}</div>
            <div>Method: {technique} (300 DPI CMYK)</div>
            <div>Base Cost: {formatINR(selectedProduct.basePrice)}</div>
            <div>Turnaround: {selectedProduct.fulfillmentTime}</div>
          </div>
        )}
      </section>
    </div>
  );
};
