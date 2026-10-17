import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, RefreshCw, Clock, Shield, Zap, Star, CircleCheck as CheckCircle, Circle as XCircle, Settings2, Minus, Plus } from 'lucide-react';
import ApiErrorNotice from '../components/ui/ApiErrorNotice';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Badge from '../components/ui/Badge';
import DiscountCountdown from '../components/ui/DiscountCountdown';
import CustomFieldsForm from '../components/products/CustomFieldsForm';
import RelatedProducts from '../components/products/RelatedProducts';
import { getProductBySlug } from '../lib/api';
import { useCart } from '../lib/cart';
import { useToast } from '../lib/toast';
import { useT } from '../lib/i18n';
import type { Product } from '../lib/types';
import { formatMoney, getCustomFieldDefaults, translatePeriodicity } from '../lib/utils';
import { computeExtrasPrice } from '../lib/pricing';
import { useStore } from '../lib/store';
import { usePageTitle } from '../lib/usePageTitle';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | number>>({});
  const [quantity, setQuantity] = useState(1);
  const [donationAmount, setDonationAmount] = useState('');
  const { addItem } = useCart();
  const { addToast } = useToast();
  const t = useT();
  const { store } = useStore();
  const currency = store?.currency;
  const checkoutStatus = searchParams.get('checkout');

  usePageTitle(product?.name || null);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      try {
        setLoadError(null);
        const data = await getProductBySlug(slug);
        setProduct(data);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : String(err));
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  useEffect(() => {
    if (!product?.custom_fields) return;
    setCustomFieldValues(getCustomFieldDefaults(product.custom_fields));
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const image = product.image || product.gallery?.[0] || '';
    const description = product.small_description?.replace(/<[^>]*>/g, '').slice(0, 160) || '';
    const storeName = store?.title || 'Boutique';
    const title = `${product.name} | ${storeName}`;

    const ogUrl = `${window.location.origin}/product/${product.slug}`;

    const metaUpdates: Record<string, string> = {
      'og:title': title,
      'og:description': description,
      'og:image': image,
      'og:url': ogUrl,
      'og:type': 'product',
      'twitter:title': title,
      'twitter:description': description,
      'twitter:image': image,
      'twitter:card': 'summary_large_image',
    };

    Object.entries(metaUpdates).forEach(([key, value]) => {
      if (!value) return;
      const attr = key.startsWith('og:') ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', value);
    });
  }, [product, store]);

  const extrasPrice = useMemo(() => {
    return computeExtrasPrice(product?.custom_fields, customFieldValues);
  }, [product, customFieldValues]);

  const stockTracked = typeof product?.stock === 'number';
  const stockValue = product?.stock ?? 0;
  const outOfStock = stockTracked && stockValue <= 0;
  const lowStock = stockTracked && !outOfStock && stockValue <= 5;
  const maxQuantity = stockTracked ? Math.max(1, stockValue) : Infinity;

  useEffect(() => {
    if (stockTracked && quantity > maxQuantity) {
      setQuantity(Math.max(1, maxQuantity));
    }
  }, [stockTracked, maxQuantity, quantity]);

  if (loading) {
    return (
      <div className="pt-32">
        <LoadingSpinner />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-32 text-center">
        <div className="max-w-md mx-auto px-4">
          {loadError && (
            <ApiErrorNotice title="Erreur chargement produit" message={loadError} />
          )}
          <h2 className="text-2xl font-bold text-heading mb-4">{t('product.not_found.title')}</h2>
          <p className="text-volcanic-400 mb-8">
            {t('product.not_found.description')}
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-ark-600 hover:bg-ark-500 text-white font-semibold rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('product.back_to_shop')}
          </Link>
        </div>
      </div>
    );
  }

  const images = product.gallery?.length
    ? product.gallery
    : product.image
    ? [product.image]
    : [];

  function dismissCheckoutStatus() {
    searchParams.delete('checkout');
    setSearchParams(searchParams);
  }

  return (
    <div className="pt-24 lg:pt-28 pb-16 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {checkoutStatus === 'success' && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-ark-600/10 border border-ark-600/20 rounded-xl animate-fade-in">
            <CheckCircle className="w-5 h-5 text-ark-500 shrink-0" />
            <p className="text-ark-800 dark:text-ark-300 flex-1">
              {t('product.banner.checkout_success')}
            </p>
            <button onClick={dismissCheckoutStatus} className="text-volcanic-400 hover:text-heading transition-colors">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {checkoutStatus === 'canceled' && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-sand-500/10 border border-sand-500/20 rounded-xl animate-fade-in">
            <XCircle className="w-5 h-5 text-sand-400 shrink-0" />
            <p className="text-sand-800 dark:text-sand-300 flex-1">
              {t('product.banner.checkout_canceled')}
            </p>
            <button onClick={dismissCheckoutStatus} className="text-volcanic-400 hover:text-heading transition-colors">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-volcanic-400 mb-8">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 hover:text-heading transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('product.breadcrumb_shop')}
          </Link>
          {product.category?.name && (
            <>
              <span>/</span>
              <Link
                to={`/products?category=${product.category.slug}`}
                className="hover:text-heading transition-colors"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-volcanic-500 truncate max-w-[200px]">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          <div className="space-y-4">
            <div className="glass-card overflow-hidden aspect-square bg-gradient-to-br from-volcanic-800/40 to-volcanic-900/40 group">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-volcanic-800 to-volcanic-900">
                  <Star className="w-20 h-20 text-volcanic-700" />
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto px-1 py-2 scrollbar-thin">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                      selectedImage === idx
                        ? 'border-ark-500 shadow-lg shadow-ark-500/20 scale-105'
                        : 'border-volcanic-800/50 opacity-60 hover:opacity-100 hover:border-volcanic-700'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {product.percent_off && product.percent_off > 0 && (
                <Badge variant="discount">-{product.percent_off}{t('product.discount_suffix')}</Badge>
              )}
              {product.subscription && (
                <Badge variant="subscription">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  {t('product.badge.subscription')}
                </Badge>
              )}
              {product.featured && <Badge variant="featured">{t('product.badge.featured')}</Badge>}
              {stockTracked && (
                outOfStock ? (
                  <Badge variant="out_of_stock">{t('product.stock.out_of_stock')}</Badge>
                ) : lowStock ? (
                  <Badge variant="low_stock">
                    {t('product.stock.low_stock', { qty: product.stock ?? 0 })}
                  </Badge>
                ) : (
                  <Badge variant="in_stock">{t('product.stock.in_stock')}</Badge>
                )
              )}
            </div>

            <h1 className="text-3xl lg:text-4xl font-bold text-heading">{product.name}</h1>

            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-heading">
                  
{formatMoney(
  (product.donation && Number(donationAmount) >= product.price
    ? Number(donationAmount)
    : product.price) + extrasPrice,
  currency
)}

                </span>
                {product.old_price && (
                  <span className="text-xl text-volcanic-500 line-through">
                    {formatMoney(product.old_price, currency)}
                  </span>
                )}
                {product.subscription && product.duration_periodicity && (
                  <span className="text-volcanic-400">
                    / {product.period_num && product.period_num > 1 ? `${product.period_num} ` : ''}
                    {translatePeriodicity(product.duration_periodicity!)}
                  </span>
                )}
              </div>
              {extrasPrice > 0 && (
                <div className="text-sm text-volcanic-400">
                  {t('common.base_price_prefix')} {formatMoney(product.price, currency)} {t('common.plus_options')} {formatMoney(extrasPrice, currency)}
                </div>
              )}
              {product.discount_end && (product.discount_end < 1e12 ? product.discount_end * 1000 : product.discount_end) > Date.now() && (
                <DiscountCountdown endTimestamp={product.discount_end} />
              )}
            </div>

            {(product.description || product.small_description) && (
              <div
                className="prose dark:prose-invert max-w-none text-volcanic-300 leading-relaxed text-base [&_h1]:text-heading [&_h2]:text-heading [&_h3]:text-heading [&_h4]:text-heading [&_strong]:text-heading [&_a]:text-ark-400 [&_a:hover]:text-ark-300 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_p]:mb-3 [&_img]:rounded-lg [&_img]:my-4"
                dangerouslySetInnerHTML={{
                  __html: product.description || product.small_description || '',
                }}
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="glass-card p-4 flex items-center gap-3 group hover:border-ark-600/30 transition-all duration-200">
                <div className="w-10 h-10 rounded-lg bg-ark-600/10 flex items-center justify-center group-hover:bg-ark-600/20 transition-all duration-200">
                  <Zap className="w-5 h-5 text-ark-500" />
                </div>
                <div>
                  <div className="text-sm font-medium text-heading">{t('product.feature.instant')}</div>
                  <div className="text-xs text-volcanic-400">{t('product.feature.auto_delivery')}</div>
                </div>
              </div>
              <div className="glass-card p-4 flex items-center gap-3 group hover:border-ark-600/30 transition-all duration-200">
                <div className="w-10 h-10 rounded-lg bg-ark-600/10 flex items-center justify-center group-hover:bg-ark-600/20 transition-all duration-200">
                  <Shield className="w-5 h-5 text-ark-500" />
                </div>
                <div>
                  <div className="text-sm font-medium text-heading">{t('product.feature.secure')}</div>
                  <div className="text-xs text-volcanic-400">{t('product.feature.protected_payment')}</div>
                </div>
              </div>
              <div className="glass-card p-4 flex items-center gap-3 group hover:border-ark-600/30 transition-all duration-200">
                <div className="w-10 h-10 rounded-lg bg-ark-600/10 flex items-center justify-center group-hover:bg-ark-600/20 transition-all duration-200">
                  <Clock className="w-5 h-5 text-ark-500" />
                </div>
                <div>
                  <div className="text-sm font-medium text-heading">24/7</div>
                  <div className="text-xs text-volcanic-400">{t('product.feature.support_247')}</div>
                </div>
              </div>
            </div>

            {stockTracked && (
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`w-2 h-2 rounded-full ${
                    outOfStock
                      ? 'bg-red-500'
                      : lowStock
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-emerald-500'
                  }`}
                />
                <span className={outOfStock ? 'text-red-400 font-medium' : 'text-volcanic-400'}>
                  {outOfStock
                    ? t('product.stock.out_of_stock')
                    : (
                      <>
                        <span className="text-heading font-medium">{stockValue}</span> {t('product.stock_suffix')}
                      </>
                    )}
                </span>
              </div>
            )}

            {product.server_options && product.server_options.length > 0 && (
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-heading mb-3 uppercase tracking-wider">
                  {t('product.servers_available')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.server_options.map((srv) => (
                    <span
                      key={srv.id}
                      className="px-3 py-1.5 bg-volcanic-800/60 rounded-lg text-sm text-volcanic-300"
                    >
                      {srv.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

{product.donation && (
  <div className="glass-card p-5 space-y-3">
    <label className="block text-sm font-semibold text-heading">
      Payment Amount (£)
    </label>
    <input
      type="number"
      min={product.price}
      step="0.01"
      value={donationAmount}
      onChange={(e) => setDonationAmount(e.target.value)}
      placeholder="Enter your payment amount..."
      className="input-field"
    />
    <p className="text-xs text-volcanic-400">
      Enter the amount agreed in your Discord ticket.
    </p>
  </div>
)}

            {product.custom_fields && product.custom_fields.length > 0 && (
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-5">
                  <Settings2 className="w-4 h-4 text-ark-500" />
                  <h3 className="text-sm font-semibold text-heading uppercase tracking-wider">
                    {t('product.customize')}
                  </h3>
                </div>
                <CustomFieldsForm
                  fields={product.custom_fields}
                  values={customFieldValues}
                  onChange={setCustomFieldValues}
                  rules={product.custom_rules}
                  currency={currency}
                />
                {extrasPrice > 0 && (
                  <div className="mt-4 pt-3 border-t border-volcanic-700/40 flex items-center justify-between">
                    <span className="text-xs text-volcanic-400">{t('common.options')}</span>
                    <span className="text-sm font-semibold text-ark-400">
                      +{formatMoney(extrasPrice, currency)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {product.subscription ? (
              <div className="space-y-3">
                <button
                  disabled={outOfStock}
                  onClick={() => {
                    if (!product) return;
                    const result = addItem(
                      product,
                      customFieldValues,
                      product.server_options?.[0]?.id,
                      'addtocart'
                    );
                    if (!result.ok) {
                      addToast(t('cart.toast.subscription_conflict'), 'error');
                      return;
                    }
                    addToast(t('product.toast.added_one_month', { name: product.name }), 'success');
                  }}
                  className="w-full py-4 text-base rounded-xl font-semibold flex items-center justify-center gap-2 border-2 border-ark-600/40 text-heading bg-volcanic-800/40 hover:bg-volcanic-800/70 hover:border-ark-500/60 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-volcanic-800/40 disabled:hover:border-ark-600/40"
                >
                  <ShoppingBag className="w-5 h-5" />
                  {t('product.buy_one_month')} {formatMoney(product.price + extrasPrice, currency)}
                </button>
                <button
                  disabled={outOfStock}
                  onClick={() => {
                    if (!product) return;
                    const result = addItem(
                      product,
                      customFieldValues,
                      product.server_options?.[0]?.id,
                      'subscribe'
                    );
                    if (result.ok && result.replaced) {
                      addToast(t('product.toast.replaced_by_subscription', { name: product.name }), 'info');
                    } else {
                      addToast(t('product.toast.added_subscription', { name: product.name }), 'success');
                    }
                  }}
                  className="btn-primary w-full py-4 text-base disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-5 h-5" />
                  {t('product.subscribe')} {formatMoney(product.price + extrasPrice, currency)}
                  <span className="text-sm opacity-80">
                    /{product.period_num && product.period_num > 1 ? `${product.period_num} ` : ''}{product.duration_periodicity ? translatePeriodicity(product.duration_periodicity) : 'mois'}
                  </span>
                </button>
                <p className="text-xs text-volcanic-500 text-center">
                  {t('product.subscription_note')}
                </p>
              </div>
            ) : (
              <div className="flex items-stretch gap-3">
                <div className="flex items-center border-2 border-volcanic-700/60 rounded-xl overflow-hidden bg-volcanic-800/30 shrink-0">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-11 h-full flex items-center justify-center text-volcanic-300 hover:text-heading hover:bg-volcanic-700/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center text-heading font-semibold text-base tabular-nums select-none">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                    disabled={stockTracked && quantity >= maxQuantity}
                    className="w-11 h-full flex items-center justify-center text-volcanic-300 hover:text-heading hover:bg-volcanic-700/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  disabled={outOfStock}
                  onClick={() => {
                    if (!product) return;
                    if (stockTracked && quantity > stockValue) {
                      addToast(t('product.toast.max_stock', { qty: stockValue }), 'warning');
                      setQuantity(Math.max(1, stockValue));
                      return;
                    }

const missingField = product.custom_fields?.find(
  (field) =>
    Boolean(field.required) &&
    !field.parent &&
    String(customFieldValues[String(field.id)] ?? '').trim() === ''
);

if (missingField) {
  addToast(`Please fill in ${missingField.name} before adding to cart.`, 'error');
  return;
}

if (product.donation) {
  const amount = Number(donationAmount);

  if (
    !/^\d+(\.\d{1,2})?$/.test(donationAmount.trim()) ||
    !Number.isFinite(amount) ||
    amount < Math.max(1, product.price)
  ) {
    addToast('Please enter a valid payment amount of at least £1.00.', 'error');
    return;
  }
}
                   
const result = addItem(
  product,
  customFieldValues,
  product.server_options?.[0]?.id,
  'addtocart',
  quantity,
  product.donation ? Number(donationAmount) : undefined
);

                    if (!result.ok) {
                      addToast(t('cart.toast.subscription_conflict'), 'error');
                      return;
                    }
                    addToast(t('product.toast.added_qty', { name: product.name, qty: quantity }), 'success');
                    setQuantity(1);
                  }}
                  className="btn-primary flex-1 py-4 text-base disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShoppingBag className="w-5 h-5" />
                  {outOfStock ? t('product.stock.out_of_stock') : t('product.add_to_cart')}
                </button>
              </div>
            )}
          </div>
        </div>

        <RelatedProducts
          currentProductId={product.id}
          categoryId={product.category?.id}
          limit={4}
        />
      </div>
    </div>
  );
}
