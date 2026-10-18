import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Repeat,
  User as UserIcon,
  Loader as Loader2,
  CircleAlert as AlertCircle,
  CircleCheck as CheckCircle2,
  CircleX as XCircle,
  Clock,
  LogOut,
  Mail,
  CalendarDays,
  Ban,
  RefreshCw,
} from 'lucide-react';
import {
  useTip4ServAuth,
  fetchUserSubscriptions,
  unsubscribeUserSubscription,
  type Tip4ServSubscription,
} from '../lib/tip4servAuth';
import { useToast } from '../lib/toast';
import { useT } from '../lib/i18n';
import { usePageTitle } from '../lib/usePageTitle';
import { formatMoney } from '../lib/utils';

type TabKey = 'profile' | 'subscriptions';

function formatDate(ts: number): string {
  if (!ts) return '—';
  const ms = ts > 1e12 ? ts : ts * 1000;
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return '—';
  }
}

function StatusPill({ status, unknownLabel }: { status: string; unknownLabel: string }) {
  const s = (status || '').toLowerCase();
  const isPaid = s === 'paid';
  const isProcessed = ['processed', 'complete', 'completed', 'succeeded', 'success', 'active'].includes(s);
  const isPending = ['pending', 'processing', 'created', 'open'].includes(s);
  const cls = isPaid
    ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
    : isProcessed
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      : isPending
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
        : 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  const Icon = isPaid || isProcessed ? CheckCircle2 : isPending ? Clock : XCircle;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold uppercase tracking-wider ${cls}`}>
      <Icon className="w-3 h-3" />
      {status || unknownLabel}
    </span>
  );
}

export default function AccountPage() {
  const navigate = useNavigate();
  const t = useT();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token, user, ready, loading, connect, logout } = useTip4ServAuth();
  const { addToast } = useToast();
  usePageTitle(t('account.title_default'));
  const initialTab = ((): TabKey => {
    const tp = searchParams.get('tab');
    return tp === 'subscriptions' ? tp : 'profile';
  })();
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    const current = searchParams.get('tab');
    const desired = tab === 'profile' ? null : tab;
    if (current === desired) return;
    const next = new URLSearchParams(searchParams);
    if (desired) next.set('tab', desired);
    else next.delete('tab');
    setSearchParams(next, { replace: true });
  }, [tab, searchParams, setSearchParams]);
  const [subs, setSubs] = useState<Tip4ServSubscription[] | null>(null);
  const [subsErr, setSubsErr] = useState<string | null>(null);
  const [subsLoading, setSubsLoading] = useState(false);
  const [unsubBusy, setUnsubBusy] = useState<number | null>(null);

  const loadSubs = useCallback(async () => {
    if (!token) return;
    setSubsLoading(true);
    setSubsErr(null);
    try {
      const r = await fetchUserSubscriptions(token);
      setSubs(r.subscriptions || []);
    } catch (e) {
      setSubsErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (tab === 'subscriptions') loadSubs();
  }, [token, tab, loadSubs]);

  useEffect(() => {
    if (!token) return;
    const onFocus = () => {
      if (tab === 'subscriptions') loadSubs();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') onFocus();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [token, tab, loadSubs]);

  const handleUnsubscribe = useCallback(
    async (subscriptionId: number) => {
      if (!token) return;
      const ok = window.confirm(t('account.subs.confirm_unsubscribe'));
      if (!ok) return;
      setUnsubBusy(subscriptionId);
      try {
        await unsubscribeUserSubscription(token, subscriptionId);
        addToast(t('account.subs.toast_unsubscribed'), 'success');
        setSubs((prev) =>
          prev
            ? prev.map((s) => (s.id === subscriptionId ? { ...s, unsubscribed: true } : s))
            : prev
        );
      } catch (e) {
        addToast(e instanceof Error ? e.message : t('account.subs.toast_error'), 'error');
      } finally {
        setUnsubBusy(null);
      }
    },
    [token, addToast, t]
  );

  if (!ready || loading) {
    return (
      <div className="pt-32 pb-16">
        <div className="max-w-md mx-auto px-4 text-center">
          <Loader2 className="w-8 h-8 text-ark-500 animate-spin mx-auto mb-4" />
          <p className="text-volcanic-400">{t('account.loading')}</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="pt-32 pb-16 animate-fade-in">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-ark-600/15 flex items-center justify-center mx-auto mb-6">
            <UserIcon className="w-10 h-10 text-ark-500" />
          </div>
          <h1 className="text-2xl font-bold text-heading mb-3">{t('account.signin.title')}</h1>
          <p className="text-volcanic-400 mb-8">
            {t('account.signin.subtitle')}
          </p>
          <button onClick={connect} className="btn-primary px-8 py-3">
            <UserIcon className="w-5 h-5" />
            {t('account.signin.button')}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 inline-flex items-center gap-2 text-sm text-volcanic-400 hover:text-heading transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: typeof UserIcon }[] = [
    { key: 'profile', label: t('account.tabs.profile'), icon: UserIcon },
    { key: 'subscriptions', label: t('account.tabs.subscriptions'), icon: Repeat },
  ];

  return (
    <div className="pt-24 lg:pt-28 pb-16 animate-fade-in">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm text-volcanic-400 mb-6">
          <Link to="/" className="inline-flex items-center gap-2 hover:text-heading transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t('header.home')}
          </Link>
          <span>/</span>
          <span className="text-volcanic-500">{t('account.breadcrumb.account')}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-volcanic-800/60 border border-volcanic-700/40 overflow-hidden flex items-center justify-center shrink-0">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt={user.username || ''} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-7 h-7 text-volcanic-400" />
              )}
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-heading">
                {user?.username || t('account.title_default')}
              </h1>
              {user?.email && (
                <p className="text-sm text-volcanic-400 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5" />
                  {user.email}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-volcanic-300 hover:text-rose-300 hover:bg-rose-500/10 border border-volcanic-800/50 hover:border-rose-500/30 transition-all duration-200 self-start md:self-auto"
          >
            <LogOut className="w-4 h-4" />
            {t('account.logout')}
          </button>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-thin -mx-4 px-4 md:mx-0 md:px-0">
          {tabs.map((tt) => {
            const active = tab === tt.key;
            const Icon = tt.icon;
            return (
              <button
                key={tt.key}
                onClick={() => setTab(tt.key)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  active
                    ? 'bg-ark-600 text-white shadow-lg shadow-ark-600/20'
                    : 'bg-volcanic-800/40 text-volcanic-300 hover:text-heading hover:bg-volcanic-800/70 border border-volcanic-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tt.label}
              </button>
            );
          })}
        </div>

        {tab === 'profile' && (
          <div className="glass-card p-6 lg:p-8 max-w-2xl">
            <h2 className="text-lg font-semibold text-heading mb-6">{t('account.profile.section_title')}</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              <div>
                <dt className="text-xs uppercase tracking-wider text-volcanic-500 font-semibold mb-1">{t('account.profile.id')}</dt>
                <dd className="text-heading font-medium">{user?.id ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-volcanic-500 font-semibold mb-1">{t('account.profile.username')}</dt>
                <dd className="text-heading font-medium">{user?.username || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-volcanic-500 font-semibold mb-1">{t('account.profile.email')}</dt>
                <dd className="text-heading font-medium break-all">{user?.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-volcanic-500 font-semibold mb-1">{t('account.profile.language')}</dt>
                <dd className="text-heading font-medium">{user?.language || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-volcanic-500 font-semibold mb-1">{t('account.profile.timezone')}</dt>
                <dd className="text-heading font-medium">{user?.timezone || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-volcanic-500 font-semibold mb-1">{t('account.profile.registered_on')}</dt>
                <dd className="text-heading font-medium flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-volcanic-500" />
                  {user?.registration_date ? formatDate(user.registration_date) : '—'}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {tab === 'subscriptions' && (
          <SubscriptionsPanel
            loading={subsLoading}
            error={subsErr}
            subs={subs}
            unsubBusy={unsubBusy}
            onUnsubscribe={handleUnsubscribe}
            onRefresh={loadSubs}
          />
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof UserIcon; title: string; description: string }) {
  return (
    <div className="glass-card p-10 text-center">
      <div className="w-16 h-16 rounded-full bg-volcanic-800/60 flex items-center justify-center mx-auto mb-5">
        <Icon className="w-8 h-8 text-volcanic-500" />
      </div>
      <h3 className="text-lg font-semibold text-heading mb-1.5">{title}</h3>
      <p className="text-volcanic-400 text-sm max-w-md mx-auto">{description}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  const t = useT();
  return (
    <div className="glass-card p-6 border border-rose-500/30">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-rose-300 font-semibold mb-1">{t('account.error.cant_load')}</p>
          <p className="text-volcanic-400 text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="glass-card p-10 text-center">
      <Loader2 className="w-7 h-7 text-ark-500 animate-spin mx-auto mb-3" />
      <p className="text-volcanic-400 text-sm">{label}</p>
    </div>
  );
}

function RefreshButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  const t = useT();
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-volcanic-300 hover:text-heading bg-volcanic-800/40 hover:bg-volcanic-800/70 border border-volcanic-800/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      {t('account.refresh')}
    </button>
  );
}

function SubscriptionsPanel({
  loading,
  error,
  subs,
  unsubBusy,
  onUnsubscribe,
  onRefresh,
}: {
  loading: boolean;
  error: string | null;
  subs: Tip4ServSubscription[] | null;
  unsubBusy: number | null;
  onUnsubscribe: (id: number) => void;
  onRefresh: () => void;
}) {
  const t = useT();
  const header = (
    <div className="flex justify-end mb-3">
      <RefreshButton onClick={onRefresh} loading={loading} />
    </div>
  );
  if (loading && !subs) return <LoadingPanel label={t('account.subs.loading')} />;
  if (error) return <><>{header}</><ErrorState message={error} /></>;
  if (!subs || subs.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={Repeat}
          title={t('account.subs.empty.title')}
          description={t('account.subs.empty.description')}
        />
      </>
    );
  }

  const periodicityKey = (p: string): string => {
    const k = (p || '').toLowerCase();
    const map: Record<string, string> = {
      month: 'periodicity.month',
      months: 'periodicity.months',
      week: 'periodicity.week',
      weeks: 'periodicity.weeks',
      day: 'periodicity.day',
      days: 'periodicity.days',
      year: 'periodicity.year',
      years: 'periodicity.years',
    };
    return map[k] ? t(map[k]) : p;
  };

  return (
    <div>
      {header}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {subs.map((s) => {
        const periodLabel = s.period_num && s.duration_periodicity
          ? `${s.period_num} ${periodicityKey(s.duration_periodicity)}`
          : periodicityKey(s.duration_periodicity || '');
        const status = (s.status || '').toLowerCase();
        const terminalStatuses = ['canceled', 'cancelled', 'expired', 'failed', 'refunded', 'unsubscribed'];
        const canCancel = !s.unsubscribed && !s.onetime && !terminalStatuses.includes(status);
        return (
          <article key={s.id} className="glass-card p-5 flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <span className="text-xs text-volcanic-500 font-mono">#{s.id}</span>
                <h3 className="text-heading font-semibold truncate mt-0.5">{s.name}</h3>
              </div>
              <StatusPill status={s.unsubscribed ? 'unsubscribed' : s.status} unknownLabel={t('account.status.unknown')} />
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-volcanic-500 font-semibold">{t('account.subs.price')}</dt>
                <dd className="text-heading font-semibold">{formatMoney(s.price, s.currency)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-volcanic-500 font-semibold">{t('account.subs.cycle')}</dt>
                <dd className="text-heading font-medium">{s.onetime ? t('account.subs.cycle_one_time') : periodLabel || '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-volcanic-500 font-semibold">{t('account.subs.start')}</dt>
                <dd className="text-heading font-medium">{formatDate(s.start_date)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-volcanic-500 font-semibold">
                  {s.unsubscribed ? t('account.subs.expires_on') : t('account.subs.next_payment')}
                </dt>
                <dd className="text-heading font-medium">
                  {formatDate(s.unsubscribed ? s.expire_date : s.next_payment)}
                </dd>
              </div>
            </dl>

            {canCancel && (
              <div className="mt-auto pt-2 border-t border-volcanic-800/40">
                <button
                  onClick={() => onUnsubscribe(s.id)}
                  disabled={unsubBusy === s.id}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {unsubBusy === s.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Ban className="w-3.5 h-3.5" />
                  )}
                  {t('account.subs.unsubscribe')}
                </button>
              </div>
            )}
          </article>
        );
      })}
      </div>
    </div>
  );
}
