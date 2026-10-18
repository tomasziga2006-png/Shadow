import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingCart, Gamepad2, Sun, Moon, ChevronDown, LayoutGrid, House as Home, Package, ExternalLink, LogIn, Link2, User as UserIcon, CreditCard, Repeat, LogOut } from 'lucide-react';
import { useCart } from '../../lib/cart';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';
import { useLanguage } from '../../lib/i18n';
import { useTip4ServAuth } from '../../lib/tip4servAuth';
import { getCategories } from '../../lib/api';
import { getCategoryIcon } from '../../lib/categoryIcons';
import { stripHtml } from '../../lib/utils';
import type { Category } from '../../lib/types';

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const megaTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const megaRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { itemCount, openCart } = useCart();
  const { store } = useStore();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const { token: authToken, user: authUser, ready: authReady, connect: authConnect, logout: authLogout } = useTip4ServAuth();
  const storeName = store?.title || 'ARK Shop';
  const menuLinks = store?.menu_links ?? [];

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    getCategories()
      .then((res) => {
        if (res.categories?.length) setCategories(res.categories.filter((c) => !c.hide));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMegaOpen(false);
    setUserOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    }
    if (userOpen) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [userOpen]);

  const openMega = useCallback(() => {
    clearTimeout(megaTimeout.current);
    setMegaOpen(true);
  }, []);

  const closeMega = useCallback(() => {
    megaTimeout.current = setTimeout(() => setMegaOpen(false), 150);
  }, []);

  useEffect(() => {
    return () => clearTimeout(megaTimeout.current);
  }, []);

  const isProductsActive = location.pathname === '/products';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-500">
      <div className={`absolute inset-0 transition-all duration-500 ${
        scrolled
          ? 'bg-volcanic-950/90 backdrop-blur-xl border-b border-volcanic-800/50 shadow-lg shadow-black/10'
          : 'bg-volcanic-950/70 backdrop-blur-lg border-b border-volcanic-800/20'
      }`} />
      <nav className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link to="/" className="flex items-center gap-3 group">
            {store?.logo ? (
              <img src={store.logo} alt={storeName} className="w-10 h-10 rounded-lg object-cover shadow-lg group-hover:shadow-ark-500/20 transition-all duration-300 group-hover:scale-105" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-ark-500 to-ark-700 flex items-center justify-center shadow-lg group-hover:shadow-ark-500/30 transition-all duration-300 group-hover:scale-105">
                <Gamepad2 className="w-5 h-5 text-white" />
              </div>
            )}
            <span className="text-lg font-bold text-heading tracking-tight group-hover:text-ark-400 transition-colors duration-300">
              {storeName}
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/" active={location.pathname === '/'}>
              <Home className="w-4 h-4" />
              {t('header.home')}
            </NavLink>

            <div
              ref={megaRef}
              className="relative"
              onMouseEnter={openMega}
              onMouseLeave={closeMega}
            >
              <NavLink to="/products" active={isProductsActive}>
                <Package className="w-4 h-4" />
                {t('header.all_products')}
                {categories.length > 0 && (
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${megaOpen ? 'rotate-180' : ''}`} />
                )}
              </NavLink>

              {megaOpen && categories.length > 0 && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3">
                  <div className="w-[560px] max-w-[calc(100vw-2rem)] bg-volcanic-900/95 backdrop-blur-2xl border border-volcanic-800/60 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden animate-fade-in-down">
                    <div className="p-2">
                      <Link
                        to="/products"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-volcanic-300 hover:text-heading hover:bg-volcanic-800/50 transition-all duration-200 group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-ark-600/15 border border-ark-600/20 flex items-center justify-center group-hover:bg-ark-600/25 group-hover:scale-110 transition-all duration-200">
                          <LayoutGrid className="w-4 h-4 text-ark-500" />
                        </div>
                        <div>
                          <span className="block text-sm font-semibold text-heading">{t('header.all_products')}</span>
                          <span className="block text-xs text-volcanic-500">{t('header.view_full_catalog')}</span>
                        </div>
                      </Link>
                    </div>

                    <div className="divider-gradient mx-4" />

                    <div className="p-2 max-h-[400px] overflow-y-auto scrollbar-thin">
                      <div className="grid grid-cols-2 gap-0.5">
                        {categories.map((cat) => {
                          const Icon = getCategoryIcon(cat.slug || cat.name);
                          return (
                            <Link
                              key={cat.id}
                              to={`/products?category=${cat.slug}`}
                              className="flex items-center gap-3 px-4 py-3 rounded-xl text-volcanic-300 hover:text-heading hover:bg-volcanic-800/50 transition-all duration-200 group"
                            >
                              {cat.image ? (
                                <div className="w-9 h-9 rounded-lg overflow-hidden border border-volcanic-700/30 group-hover:border-ark-600/30 transition-all duration-200 shrink-0 group-hover:scale-110">
                                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-volcanic-800/60 border border-volcanic-700/30 flex items-center justify-center group-hover:bg-ark-600/15 group-hover:border-ark-600/20 transition-all duration-200 shrink-0 group-hover:scale-110">
                                  <Icon className="w-4 h-4 text-volcanic-400 group-hover:text-ark-500 transition-colors" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="block text-sm font-medium truncate">{cat.name}</span>
                                {cat.description && (
                                  <span className="block text-xs text-volcanic-500 truncate">{stripHtml(cat.description)}</span>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {menuLinks.map((item) => (
              <a
                key={`${item.title}-${item.link}`}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-volcanic-300 hover:text-heading hover:bg-volcanic-800/40 transition-all duration-200"
              >
                <Link2 className="w-4 h-4" />
                {item.title}
                <ExternalLink className="w-3 h-3 opacity-50" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {authToken && authUser ? (
              <div ref={userRef} className="relative hidden md:block">
                <button
                  onClick={() => setUserOpen((v) => !v)}
                  className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-lg text-sm font-medium text-volcanic-200 hover:text-heading hover:bg-volcanic-800/60 transition-all duration-200"
                  aria-haspopup="menu"
                  aria-expanded={userOpen}
                >
                  <span className="w-7 h-7 rounded-full overflow-hidden bg-volcanic-800 border border-volcanic-700/40 flex items-center justify-center shrink-0">
                    {authUser.profile_picture ? (
                      <img src={authUser.profile_picture} alt={authUser.username || ''} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-3.5 h-3.5 text-volcanic-400" />
                    )}
                  </span>
                  <span className="max-w-[120px] truncate">{authUser.username || authUser.email || 'Account'}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${userOpen ? 'rotate-180' : ''}`} />
                </button>
                {userOpen && (
                  <div className="absolute top-full right-0 mt-2 w-60 bg-volcanic-900/95 backdrop-blur-2xl border border-volcanic-800/60 rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-fade-in-down p-1.5 z-50">
                    <div className="px-3 py-2.5 border-b border-volcanic-800/60 mb-1">
                      <p className="text-sm font-semibold text-heading truncate">{authUser.username || 'My Account'}</p>
                      {authUser.email && (
                        <p className="text-xs text-volcanic-500 truncate">{authUser.email}</p>
                      )}
                    </div>
                    <Link
                      to="/account"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-volcanic-200 hover:text-heading hover:bg-volcanic-800/60 transition-colors"
                    >
                      <UserIcon className="w-4 h-4" />
                      My Profile
                    </Link>
                    <Link
                      to="/account?tab=payments"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-volcanic-200 hover:text-heading hover:bg-volcanic-800/60 transition-colors"
                    >
                      <CreditCard className="w-4 h-4" />
                      My Payments
                    </Link>
                    <Link
                      to="/account?tab=subscriptions"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-volcanic-200 hover:text-heading hover:bg-volcanic-800/60 transition-colors"
                    >
                      <Repeat className="w-4 h-4" />
                      My Subscriptions
                    </Link>
                    <button
                      onClick={() => {
                        authLogout();
                        setUserOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition-colors mt-1 border-t border-volcanic-800/60 pt-2.5"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={authConnect}
                disabled={!authReady}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-volcanic-300 hover:text-heading hover:bg-volcanic-800/60 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogIn className="w-4 h-4" />
                <span>{t('header.login')}</span>
              </button>
            )}

            <button
              onClick={toggleTheme}
              className="p-2.5 text-volcanic-300 hover:text-heading hover:bg-volcanic-800/60 rounded-lg transition-all duration-300 hover:rotate-12"
              title={theme === 'dark' ? t('header.theme_light') : t('header.theme_dark')}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={openCart}
              className="relative p-2.5 text-volcanic-300 hover:text-heading hover:bg-volcanic-800/60 rounded-lg transition-all duration-200 group"
            >
              <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-ark-600 text-white text-[10px] font-bold rounded-full shadow-lg shadow-ark-600/40 animate-scale-in">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-volcanic-300 hover:text-heading transition-colors"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-volcanic-950/95 backdrop-blur-xl border-b border-volcanic-800/40 animate-fade-in-down">
            <div className="px-4 py-4 space-y-1">
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname === '/'
                    ? 'text-heading bg-volcanic-800/60'
                    : 'text-volcanic-300 hover:text-heading hover:bg-volcanic-800/40'
                }`}
              >
                <Home className="w-4 h-4" />
                {t('header.home')}
              </Link>
              <Link
                to="/products"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isProductsActive
                    ? 'text-heading bg-volcanic-800/60'
                    : 'text-volcanic-300 hover:text-heading hover:bg-volcanic-800/40'
                }`}
              >
                <Package className="w-4 h-4" />
                {t('header.all_products')}
              </Link>
              {menuLinks.map((item) => (
                <a
                  key={`m-${item.title}-${item.link}`}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium text-volcanic-300 hover:text-heading hover:bg-volcanic-800/40 transition-all duration-200"
                >
                  <Link2 className="w-4 h-4" />
                  {item.title}
                  <ExternalLink className="w-3 h-3 opacity-50 ml-auto" />
                </a>
              ))}

              {authToken && authUser ? (
                <>
                  <Link
                    to="/account"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium text-volcanic-300 hover:text-heading hover:bg-volcanic-800/40 transition-all duration-200"
                  >
                    <UserIcon className="w-4 h-4" />
                    {authUser.username ? `Account (${authUser.username})` : 'My Account'}
                  </Link>
                  <button
                    onClick={() => {
                      authLogout();
                      setMobileOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium text-rose-300 hover:bg-rose-500/10 transition-all duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    authConnect();
                    setMobileOpen(false);
                  }}
                  disabled={!authReady}
                  className="w-full flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium text-volcanic-300 hover:text-heading hover:bg-volcanic-800/40 transition-all duration-200 disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  {t('header.login')}
                </button>
              )}

              {categories.length > 0 && (
                <div className="pt-2 pb-1">
                  <div className="divider-gradient mb-3" />
                  <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-volcanic-500">
                    {t('header.categories')}
                  </p>
                  <div className="grid grid-cols-2 gap-0.5">
                    {categories.map((cat) => {
                      const Icon = getCategoryIcon(cat.slug || cat.name);
                      return (
                        <Link
                          key={cat.id}
                          to={`/products?category=${cat.slug}`}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-volcanic-300 hover:text-heading hover:bg-volcanic-800/40 transition-all duration-200"
                        >
                          {cat.image ? (
                            <div className="w-7 h-7 rounded-md overflow-hidden border border-volcanic-700/30 shrink-0">
                              <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <Icon className="w-4 h-4 text-volcanic-400 shrink-0" />
                          )}
                          <span className="text-sm font-medium truncate">{cat.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setMobileOpen(false);
                  openCart();
                }}
                className="w-full flex items-center justify-center gap-2 mt-3 px-4 py-3 bg-volcanic-800/60 text-heading text-sm font-semibold rounded-lg transition-all duration-200 hover:bg-volcanic-800"
              >
                <ShoppingCart className="w-4 h-4" />
                {t('header.cart')} {itemCount > 0 && `(${itemCount})`}
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`relative inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        active
          ? 'text-heading bg-volcanic-800/60'
          : 'text-volcanic-300 hover:text-heading hover:bg-volcanic-800/40'
      }`}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-ark-500 rounded-full" />
      )}
    </Link>
  );
}
