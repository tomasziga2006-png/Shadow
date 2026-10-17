import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader as Loader2, ShoppingCart, CircleAlert as AlertCircle, ShieldCheck, Zap, Lock, ShoppingBag, Trash2, Minus, Plus, Circle as HelpCircle, X as XIcon, Check } from 'lucide-react';
import { useCart } from '../lib/cart';
import { useStore } from '../lib/store';
import { useToast } from '../lib/toast';
import { useT } from '../lib/i18n';
import { usePageTitle } from '../lib/usePageTitle';
import { computeExtrasPrice } from '../lib/pricing';
import { getCheckoutIdentifiers, createCheckout } from '../lib/api';
import { useTip4ServAuth } from '../lib/tip4servAuth';
import { formatMoney, isNiveauHidden, isNiveauField } from '../lib/utils';
import type { CheckoutBody, CheckoutProduct, CheckoutUser } from '../lib/types';

const IDENTIFIER_KEYS = [
  'email',
  'minecraft_username',
  'steam_id',
  'discord_id',
  'epic_id',
  'eos_id',
  'fivem_citizen_id',
  'ingame_username',
  'rust_username',
] as const;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity } = useCart();
  const { store } = useStore();
  const currency = store?.currency;
  const { addToast } = useToast();
  const t = useT();
  usePageTitle(t('checkout.title'));
  const { user: tipUser } = useTip4ServAuth();
  const [requiredIdentifiers, setRequiredIdentifiers] = useState<string[]>([]);
  const [identifierValues, setIdentifierValues] = useState<Record<string, string>>({});
  const [autofilledFields, setAutofilledFields] = useState<Set<string>>(new Set());
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [discordHelpOpen, setDiscordHelpOpen] = useState(false);
  const [discordConnecting, setDiscordConnecting] = useState(false);
  const discordClientId = import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined;

  const startDiscordOAuth = useCallback(() => {
    if (!discordClientId) {
      addToast(t('checkout.discord_help.not_configured'), 'error');
      return;
    }
    const redirectUri = `${window.location.origin}/auth/discord/callback`;
    const state = Math.random().toString(36).slice(2);
    const authUrl = new URL('https://discord.com/oauth2/authorize');
    authUrl.searchParams.set('client_id', discordClientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'identify');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'none');

    try {
      window.sessionStorage.setItem('discord_oauth_opener_origin', window.location.origin);
    } catch {
      // ignore
    }

    const width = 500;
    const height = 720;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      authUrl.toString(),
      'discord-oauth',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`,
    );

    if (!popup) {
      addToast(t('checkout.discord_help.popup_blocked'), 'warning');
      return;
    }

    setDiscordConnecting(true);

    const pollTimer = window.setInterval(() => {
      if (popup.closed) cleanup();
    }, 500);

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      window.clearInterval(pollTimer);
      setDiscordConnecting(false);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; ok?: boolean; id?: string; username?: string; global_name?: string; error?: string };
      if (!data || data.type !== 'discord-oauth') return;
      if (data.ok && data.id) {
        const cleaned = data.id.replace(/[^0-9]/g, '');
        if (/^\d{17,20}$/.test(cleaned)) {
          setIdentifierValues((prev) => ({ ...prev, discord_id: cleaned }));
          setAutofilledFields((prev) => {
            const next = new Set(prev);
            next.delete('discord_id');
            return next;
          });
          addToast(
            t('checkout.discord_help.connected', { username: data.global_name || data.username || cleaned }),
            'success',
          );
          setDiscordHelpOpen(false);
        }
      } else {
        addToast(t('checkout.discord_help.connect_failed', { error: data.error || '—' }), 'error');
      }
      cleanup();
    };

    window.addEventListener('message', onMessage);
  }, [discordClientId, addToast, t]);

 
const cartTotal = items.reduce((sum, item) => {
  const extras = computeExtrasPrice(item.product.custom_fields, item.customFieldValues);
  const basePrice = item.product.donation
    ? (item.donationAmount ?? item.product.price)
    : item.product.price;
  return sum + (basePrice + extras) * item.quantity;
}, 0);


  useEffect(() => {
    if (items.length === 0) return;
    async function init() {
      try {
        if (!store?.id) return;
        const productIds = items.map((item) => Number(item.product.id));
        const ids = await getCheckoutIdentifiers(store.id, productIds);
        setRequiredIdentifiers(ids);
      } catch {
        setRequiredIdentifiers([]);
      } finally {
        setLoadingInit(false);
      }
    }
    init();
  }, [items, store?.id]);

  useEffect(() => {
    if (!store) return;
    if (items.length === 0) {
      setLoadingInit(false);
    }
  }, [store, items.length]);

  useEffect(() => {
    if (!tipUser || requiredIdentifiers.length === 0) return;
    setIdentifierValues((prev) => {
      const next = { ...prev };
      const filled = new Set(autofilledFields);
      for (const id of requiredIdentifiers) {
        if (next[id]?.trim()) continue;
        let value: string | undefined;
        if (id === 'email' && tipUser.email) value = tipUser.email;
        else if ((id === 'minecraft_username' || id === 'ingame_username' || id === 'rust_username') && tipUser.username) {
          value = tipUser.username;
        }
        if (value) {
          next[id] = value;
          filled.add(id);
        }
      }
      if (filled.size !== autofilledFields.size) setAutofilledFields(filled);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipUser, requiredIdentifiers]);

  useEffect(() => {
    if (loadingInit || requiredIdentifiers.length === 0) return;
    if (typeof window === 'undefined' || window.innerWidth >= 768) return;
    const el = document.getElementById('delivery-info');
    if (!el) return;
    const id = window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [loadingInit, requiredIdentifiers.length]);

  const handleCheckout = useCallback(async () => {
    if (!acceptedTerms) {
      addToast(t('checkout.toast.accept_terms'), 'warning');
      return;
    }

    if (!store?.id) {
      addToast(t('checkout.toast.shop_unavailable'), 'error');
      return;
    }

    for (const id of requiredIdentifiers) {
      if (!identifierValues[id]?.trim()) {
        const label = (IDENTIFIER_KEYS as readonly string[]).includes(id)
          ? t(`checkout.identifier.${id}.label`)
          : id;
        addToast(t('checkout.toast.field_required', { label }), 'warning');
        return;
      }
    }

    for (const item of items) {
      const allFields = item.product.custom_fields || [];
      const rules = item.product.custom_rules || [];
      const hideNiveau = isNiveauHidden(allFields, item.customFieldValues);

      const isFieldVisible = (fid: number): boolean => {
        const field = allFields.find((f) => f.id === fid);
        if (!field) return true;
        if (hideNiveau && isNiveauField(field)) return false;
        if (!field.parent) return true;
        const parentVal = item.customFieldValues[String(field.parent.customFieldId)];
        if (parentVal === undefined) return false;
        const parentField = allFields.find((f) => f.id === field.parent!.customFieldId);
        if (!parentField?.options) return false;
        const selectedOpt = parentField.options.find(
          (o) => String(o.id) === String(parentVal)
        );
        return selectedOpt ? String(selectedOpt.id) === String(field.parent.optionId) : false;
      };

      const missingField = allFields.find((field) => {
        if (!field.required || !isFieldVisible(field.id)) return false;

        const value = item.customFieldValues[String(field.id)];

        if (field.type === 'checkbox') {
          return value !== 1 && value !== '1' && value !== 'true';
        }

        return value === undefined ||
          value === null ||
          String(value).trim() === '';
      });

      if (missingField) {
        addToast(
          `Please complete ${missingField.name} for ${item.product.name}.`,
          'error'
        );
        return;
      }


      for (const rule of rules) {
        if (rule.type !== 'number_limit') continue;
        const visibleFields = rule.fields.filter(isFieldVisible);
        if (visibleFields.length === 0) continue;
        const total = visibleFields.reduce((sum, fid) => {
          return sum + (Number(item.customFieldValues[String(fid)]) || 0);
        }, 0);
        const isExact = rule.min === rule.max;
        if (isExact && total !== rule.max) {
          addToast(
            t('checkout.toast.rule_exact', { product: item.product.name, rule: rule.name, max: rule.max, total }),
            'warning'
          );
          return;
        }
        if (!isExact && (total < rule.min || total > rule.max)) {
          addToast(
            t('checkout.toast.rule_range', { product: item.product.name, rule: rule.name, min: rule.min, max: rule.max, total }),
            'warning'
          );
          return;
        }
      }
    }

    setError(null);
    setLoadingCheckout(true);

    try {
      const products: CheckoutProduct[] = items.map((item) => {
        const cp: CheckoutProduct = {
          product_id: Number(item.product.id),
          product_slug: item.product.slug,
          type: item.purchaseType || 'addtocart',
          quantity: item.quantity,
          
donation_amount: item.product.donation ? item.donationAmount : undefined,

        };

        if (item.selectedServer !== undefined) {
          cp.server_selection = item.selectedServer;
        }

        if (Object.keys(item.customFieldValues).length > 0 && item.product.custom_fields) {
          const allFields = item.product.custom_fields;
          const hideNiv = isNiveauHidden(allFields, item.customFieldValues);

          const isVisible = (f: typeof allFields[number]): boolean => {
            if (hideNiv && isNiveauField(f)) return false;
            if (!f.parent) return true;
            const parentVal = item.customFieldValues[String(f.parent.customFieldId)];
            if (parentVal === undefined || parentVal === null) return false;
            const parentField = allFields.find((pf) => pf.id === f.parent!.customFieldId);
            if (!parentField?.options) return false;
            const selectedOpt = parentField.options.find(
              (o) => String(o.id) === String(parentVal)
            );
            return selectedOpt ? String(selectedOpt.id) === String(f.parent.optionId) : false;
          };

          const converted: Record<string, string | number> = {};
          for (const field of allFields) {
            if (!isVisible(field)) continue;
            const fieldId = String(field.id);
            let val = item.customFieldValues[fieldId];
            if (val === undefined || val === null || (typeof val === 'number' && isNaN(val)) || val === 'null') {
              if (field.type === 'number') {
                const dv = String(field.default_value ?? field.minimum ?? 0);
                val = dv.includes('-') ? (Number(dv.split('-')[0]) || 0) : (Number(dv) || 0);
              } else if (field.type === 'checkbox') {
                val = 0;
              } else if ((field.type === 'select' || field.type === 'selection') && field.options?.length) {
                val = field.options[0].id;
              } else {
                val = field.default_value ?? '';
              }
            }
            if (field.type === 'checkbox' && (val === 0 || val === '0' || val === '')) {
              continue;
            }
            if ((field.type === 'select' || field.type === 'selection') && field.options) {
              const opt = field.options.find((o) => String(o.id) === String(val));
              converted[fieldId] = opt ? Number(opt.id) : Number(val) || val;
            } else {
              converted[fieldId] = typeof val === 'number' && isNaN(val) ? 0 : val;
            }
          }
          if (Object.keys(converted).length > 0) {
            cp.custom_fields = converted;
          }
        }

        return cp;
      });

      const user: CheckoutUser = {};
      requiredIdentifiers.forEach((id) => {
        const val = identifierValues[id]?.trim();
        if (val) {
          (user as Record<string, string>)[id] = val;
        }
      });

      const body: CheckoutBody = { products };

      if (Object.keys(user).length > 0) {
        body.user = user;
      }

      const origin = window.location.origin;
      body.redirect_success_checkout = `${origin}/checkout/success`;
      body.redirect_canceled_checkout = `${origin}/checkout/canceled`;

      const result = await createCheckout(store.id, body);
      setIsRedirecting(true);
      window.location.href = result.url;
    } catch (err) {
      const msg = err instanceof Error
        ? err.message.split('\n\nDEBUG_PAYLOAD:')[0]
        : t('checkout.toast.generic_error');
      setError(err instanceof Error ? err.message : msg);
      addToast(msg, 'error', 5000);
      setLoadingCheckout(false);
    }
  }, [store, items, identifierValues, requiredIdentifiers, addToast, acceptedTerms, t]);

  if (isRedirecting) {
    return (
      <div className="pt-32 pb-16">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-ark-600/15 flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Lock className="w-10 h-10 text-ark-500" />
          </div>
          <h1 className="text-2xl font-bold text-heading mb-3">{t('checkout.redirecting.title')}</h1>
          <p className="text-volcanic-400 mb-6">
            {t('checkout.redirecting.body')}
          </p>
          <div className="flex items-center justify-center gap-2 text-ark-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">{t('checkout.redirecting.status')}</span>
          </div>
          <div className="mt-8 flex items-center justify-center gap-4 text-xs text-volcanic-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-ark-600" />
              <span>{t('checkout.trust.secure_payment')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-ark-600" />
              <span>{t('checkout.trust.instant_delivery')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0 && !loadingInit) {
    return (
      <div className="pt-32 pb-16">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-volcanic-800/60 flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-volcanic-600" />
          </div>
          <h1 className="text-2xl font-bold text-heading mb-3">{t('checkout.empty.title')}</h1>
          <p className="text-volcanic-400 mb-8">
            {t('checkout.empty.description')}
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-ark-600 hover:bg-ark-500 text-white font-semibold rounded-xl transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            {t('checkout.empty.cta')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 lg:pt-28 pb-16 animate-fade-in">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm text-volcanic-400 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 hover:text-heading transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('checkout.back')}
          </button>
          <span>/</span>
          <span className="text-volcanic-500">{t('checkout.breadcrumb_payment')}</span>
        </div>

        <h1 className="text-3xl lg:text-4xl font-bold text-heading mb-10">{t('checkout.title')}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          <div className="lg:col-span-3 space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-heading mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-ark-500" />
                {t('checkout.section_cart')} ({items.length} {items.length > 1 ? t('cart.items_plural') : t('cart.items_singular')})
              </h2>
              <div className="space-y-3">
                {items.map((item) => {
                  const extras = computeExtrasPrice(item.product.custom_fields, item.customFieldValues);
                  
const unitPrice = (item.product.donation
  ? (item.donationAmount ?? item.product.price)
  : item.product.price) + extras;

                  const lineTotal = unitPrice * item.quantity;
                  const img = item.product.image || item.product.gallery?.[0];

                  return (
                    <div key={item.id} className="glass-card p-4">
                      <div className="flex gap-4">
                        <Link to={`/product/${item.product.slug}`} className="shrink-0">
                          {img ? (
                            <img
                              src={img}
                              alt={item.product.name}
                              className="w-20 h-20 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-lg bg-volcanic-800 flex items-center justify-center">
                              <ShoppingBag className="w-8 h-8 text-volcanic-600" />
                            </div>
                          )}
                        </Link>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <Link
                                to={`/product/${item.product.slug}`}
                                className="text-heading font-semibold hover:text-ark-400 transition-colors line-clamp-1"
                              >
                                {item.product.name}
                              </Link>
                              <div className="flex items-center gap-2 mt-0.5">
                                {item.product.category?.name && (
                                  <p className="text-xs text-volcanic-500">
                                    {item.product.category.name}
                                  </p>
                                )}
                                {item.product.subscription && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                    item.purchaseType === 'subscribe'
                                      ? 'bg-ark-600/15 text-ark-400'
                                      : 'bg-volcanic-700/50 text-volcanic-300'
                                  }`}>
                                    {item.purchaseType === 'subscribe' ? t('checkout.badge.subscription') : t('checkout.badge.one_month')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                removeItem(item.id);
                                addToast(t('checkout.toast.item_removed', { name: item.product.name }), 'info');
                              }}
                              className="shrink-0 p-1.5 text-volcanic-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between">
                              {item.product.quantity ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    disabled={item.quantity <= 1}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-volcanic-800 text-volcanic-300 hover:text-heading hover:bg-volcanic-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-8 text-center text-sm text-heading font-medium">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-volcanic-800 text-volcanic-300 hover:text-heading hover:bg-volcanic-700 transition-colors"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-volcanic-500">{t('checkout.quantity_label')} 1</span>
                              )}
                              <span className="text-lg font-bold text-heading">
                                {formatMoney(lineTotal, currency)}
                              </span>
                            </div>
                            {extras > 0 && (
                              <p className="text-xs text-volcanic-400">
                                {t('common.base_price_prefix')} {formatMoney(unitPrice - extras, currency)} {t('common.plus_options')} {formatMoney(extras, currency)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {loadingInit ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-ark-500 animate-spin mr-2" />
                <span className="text-volcanic-400 text-sm">{t('checkout.loading_info')}</span>
              </div>
            ) : (
              requiredIdentifiers.length > 0 && (
                <section id="delivery-info" className="scroll-mt-24">
                  <h2 className="text-lg font-semibold text-heading mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-ark-500" />
                    {t('checkout.section_delivery_info')}
                  </h2>
                  <div className="glass-card p-6 space-y-5">
                    {requiredIdentifiers.map((id) => {
                      const known = (IDENTIFIER_KEYS as readonly string[]).includes(id);
                      const label = known ? t(`checkout.identifier.${id}.label`) : id;
                      const placeholder = known ? t(`checkout.identifier.${id}.placeholder`) : '';
                      const wasAutofilled = autofilledFields.has(id) && identifierValues[id]?.trim();
                      const isDiscord = id === 'discord_id';
                      const discordValue = identifierValues[id] || '';
                      const discordValid = /^\d{17,20}$/.test(discordValue.trim());
                      return (
                        <div key={id}>
                          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                            <label className="block text-sm font-medium text-volcanic-300">
                              {label}
                              <span className="text-red-400 ml-1">*</span>
                              {wasAutofilled && (
                                <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-ark-600/15 text-ark-400 border border-ark-600/30">
                                  <ShieldCheck className="w-3 h-3" />
                                  Tip4Serv
                                </span>
                              )}
                              {isDiscord && discordValue && discordValid && (
                                <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  <Check className="w-3 h-3" />
                                  OK
                                </span>
                              )}
                            </label>
                            {isDiscord && (
                              <div className="flex items-center gap-3 flex-wrap">
                                <button
                                  type="button"
                                  onClick={startDiscordOAuth}
                                  disabled={discordConnecting}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-white bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                >
                                  {discordConnecting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <DiscordIcon className="w-3.5 h-3.5" />
                                  )}
                                  {discordConnecting
                                    ? t('checkout.discord_help.connecting')
                                    : t('checkout.discord_help.connect')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDiscordHelpOpen(true)}
                                  className="inline-flex items-center gap-1.5 text-xs font-medium text-ark-400 hover:text-ark-300 transition-colors"
                                >
                                  <HelpCircle className="w-3.5 h-3.5" />
                                  {t('checkout.discord_help.button')}
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type={id === 'email' ? 'email' : 'text'}
                              inputMode={isDiscord ? 'numeric' : undefined}
                              placeholder={placeholder}
                              value={discordValue}
                              onChange={(e) => {
                                const value = isDiscord ? e.target.value.replace(/[^0-9]/g, '') : e.target.value;
                                setIdentifierValues((prev) => ({ ...prev, [id]: value }));
                                if (autofilledFields.has(id)) {
                                  setAutofilledFields((prev) => {
                                    const next = new Set(prev);
                                    next.delete(id);
                                    return next;
                                  });
                                }
                              }}
                              className="input-field"
                            />
                          </div>
                          {isDiscord && discordValue && !discordValid && (
                            <p className="mt-1.5 text-xs text-amber-400 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {t('checkout.discord_help.invalid')}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-28 space-y-5">
              <div className="glass-card p-6 space-y-5">
                <h2 className="text-lg font-semibold text-heading">{t('checkout.summary.title')}</h2>

                <div className="space-y-3 text-sm">
                  {items.map((item) => {
                    const extras = computeExtrasPrice(item.product.custom_fields, item.customFieldValues);
                   
const basePrice = item.product.donation
  ? (item.donationAmount ?? item.product.price)
  : item.product.price;
const lineTotal = (basePrice + extras) * item.quantity;

                    return (
                      <div key={item.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-volcanic-400 truncate">
                            {item.product.name}
                            {item.quantity > 1 && (
                              <span className="text-volcanic-600 ml-1">x{item.quantity}</span>
                            )}
                          </span>
                          <span className="text-heading font-medium shrink-0">
                            {formatMoney(lineTotal, currency)}
                          </span>
                        </div>
                        {extras > 0 && (
                          <div className="text-xs text-volcanic-500 pl-2">
                            {t('common.base_short')} {
formatMoney(basePrice, currency)
} {t('common.plus_options')} {formatMoney(extras, currency)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-volcanic-800/50 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-volcanic-300 font-medium">{t('common.total')}</span>
                    <span className="text-2xl font-bold text-heading">
                      {formatMoney(cartTotal, currency)}
                    </span>
                  </div>
                  <p className="text-xs text-volcanic-500 mt-2">
                    {t('checkout.summary.promo_note')}
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600 dark:text-red-300">{error.split('\n\nDEBUG_PAYLOAD:')[0]}</p>
                    </div>
                    {error.includes('DEBUG_PAYLOAD:') && (
                      <pre className="text-xs text-volcanic-400 bg-volcanic-900/50 rounded p-2 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                        {error.split('DEBUG_PAYLOAD:')[1]}
                      </pre>
                    )}
                  </div>
                )}

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 shrink-0 rounded border-volcanic-600 bg-volcanic-800 text-ark-600 focus:ring-ark-600/30 focus:ring-offset-0 cursor-pointer accent-ark-600"
                  />
                  <span className="text-xs text-volcanic-400 leading-relaxed group-hover:text-volcanic-300 transition-colors select-none">
                    {t('checkout.terms.text')}
                    <span className="text-red-400 ml-0.5">*</span>
                  </span>
                </label>

                <button
                  onClick={handleCheckout}
                  disabled={loadingCheckout || loadingInit || !acceptedTerms}
                  className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
                >
                  {loadingCheckout ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('checkout.button.redirecting')}
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      {t('checkout.button.pay')} {formatMoney(cartTotal, currency)}
                    </>
                  )}
                </button>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-xs text-volcanic-500">
                    <ShieldCheck className="w-4 h-4 text-ark-600 shrink-0" />
                    <span>{t('checkout.trust.secure_encrypted')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-volcanic-500">
                    <Zap className="w-4 h-4 text-ark-600 shrink-0" />
                    <span>{t('checkout.trust.auto_instant')}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* discord helper modal */}
      {discordHelpOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setDiscordHelpOpen(false)}
        >
          <div
            className="glass-card max-w-lg w-full p-6 sm:p-7 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setDiscordHelpOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-volcanic-400 hover:text-heading hover:bg-volcanic-800/60 transition-colors"
              aria-label={t('checkout.discord_help.close')}
            >
              <XIcon className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-ark-600/15 flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5 text-ark-500" />
              </div>
              <h3 className="text-lg font-bold text-heading">{t('checkout.discord_help.title')}</h3>
            </div>
            <p className="text-sm text-volcanic-300 mb-4">{t('checkout.discord_help.intro')}</p>
            <div className="mb-5 p-4 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/30">
                <button
                  type="button"
                  onClick={startDiscordOAuth}
                  disabled={discordConnecting}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {discordConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <DiscordIcon className="w-4 h-4" />
                  )}
                  {discordConnecting
                    ? t('checkout.discord_help.connecting')
                    : t('checkout.discord_help.connect')}
                </button>
                <p className="text-xs text-volcanic-400 mt-3 text-center">
                  {t('checkout.discord_help.or_manual')}
                </p>
              </div>
            <ol className="space-y-3 text-sm text-volcanic-300">
              {[1, 2, 3, 4].map((n) => (
                <li key={n} className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-ark-600 text-white text-xs font-bold flex items-center justify-center">
                    {n}
                  </span>
                  <span className="leading-relaxed">{t(`checkout.discord_help.step${n}`)}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 p-3 rounded-lg bg-volcanic-800/40 border border-volcanic-700/40 text-xs text-volcanic-400 leading-relaxed">
              {t('checkout.discord_help.tip')}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setDiscordHelpOpen(false)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ark-600 hover:bg-ark-500 text-white text-sm font-semibold transition-colors"
              >
                {t('checkout.discord_help.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3a14.27 14.27 0 0 0-.658 1.34 18.27 18.27 0 0 0-5.487 0A12.61 12.61 0 0 0 9.748 3a19.74 19.74 0 0 0-3.762 1.37C2.36 9.744 1.36 14.987 1.86 20.156a19.93 19.93 0 0 0 6.073 3.04c.49-.668.927-1.379 1.302-2.124a12.94 12.94 0 0 1-2.05-.98c.172-.126.34-.257.501-.39 3.927 1.81 8.18 1.81 12.061 0 .163.133.331.264.503.39-.658.39-1.346.722-2.052.98.375.745.811 1.456 1.302 2.124a19.9 19.9 0 0 0 6.073-3.04c.583-5.985-.992-11.18-4.156-15.787zM8.02 16.85c-1.183 0-2.157-1.085-2.157-2.418 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.333-.955 2.418-2.157 2.418zm7.974 0c-1.183 0-2.157-1.085-2.157-2.418 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
