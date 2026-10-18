import { Link } from 'react-router-dom';
import { RefreshCw, Star } from 'lucide-react';
import type { Product } from '../../lib/types';
import { formatMoney, translatePeriodicity } from '../../lib/utils';
import Badge from '../ui/Badge';
import DiscountCountdown from '../ui/DiscountCountdown';
import { useLanguage } from '../../lib/i18n';
import { useStore } from '../../lib/store';

interface Props {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: Props) {
  const { t, lang } = useLanguage();
  const { store } = useStore();
  const currency = store?.currency;
  const isNew = product.slug?.toLowerCase().includes('new') ||
                product.name?.toLowerCase().includes('nouveau') ||
                (product.id && product.id > 9000);

  const stockTracked = product.enable_stock === true && typeof product.stock === 'number';
  const outOfStock = stockTracked && (product.stock ?? 0) <= 0;
  const lowStock = stockTracked && !outOfStock && (product.stock ?? 0) <= 5;

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group glass-card-hover card-shine flex flex-col animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-volcanic-800">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-volcanic-800 to-volcanic-900">
            <Star className="w-12 h-12 text-volcanic-600" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-volcanic-950/70 via-volcanic-950/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {isNew && <Badge variant="new">{t('product.badge.new')}</Badge>}
          {product.percent_off && product.percent_off > 0 && (
            <Badge variant="discount">-{product.percent_off}%</Badge>
          )}
          {product.subscription && (
            <Badge variant="subscription">
              <RefreshCw className="w-3 h-3 mr-1" />
              {t('product.badge.subscription_short')}
            </Badge>
          )}
          {product.featured && <Badge variant="featured">{t('product.badge.star')}</Badge>}
        </div>

        {stockTracked && (
          <div className="absolute top-3 right-3">
            {outOfStock ? (
              <Badge variant="out_of_stock">{t('product.stock.out_of_stock')}</Badge>
            ) : lowStock ? (
              <Badge variant="low_stock">
                {t('product.stock.low_stock', { qty: product.stock ?? 0 })}
              </Badge>
            ) : (
              <Badge variant="in_stock">{t('product.stock.in_stock')}</Badge>
            )}
          </div>
        )}

        {outOfStock && (
          <div className="absolute inset-0 bg-volcanic-950/50 backdrop-blur-[1px]" aria-hidden="true" />
        )}
      </div>

      <div className="relative p-4 lg:p-5 flex flex-col flex-1">
        <h3 className="text-base font-semibold text-heading mb-2 group-hover:text-ark-400 transition-colors duration-200">
          {product.name}
        </h3>

        {product.small_description && (
          <div
            className="text-sm text-volcanic-400 leading-relaxed mb-4 line-clamp-2 flex-1 [&_*]:inline"
            dangerouslySetInnerHTML={{ __html: product.small_description }}
          />
        )}

        <div className="mt-auto pt-3 border-t border-volcanic-800/50 space-y-2">
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-heading group-hover:text-ark-400 transition-colors duration-200">
                {formatMoney(product.price, currency)}
              </span>
              {product.old_price && (
                <span className="text-sm text-volcanic-500 line-through">
                  {formatMoney(product.old_price, currency)}
                </span>
              )}
            </div>
            {product.subscription && product.duration_periodicity && (
              <span className="text-xs text-volcanic-500">
                /{translatePeriodicity(product.duration_periodicity!, lang)}
              </span>
            )}
          </div>
          {product.discount_end && (product.discount_end < 1e12 ? product.discount_end * 1000 : product.discount_end) > Date.now() && (
            <DiscountCountdown endTimestamp={product.discount_end} compact />
          )}
        </div>
      </div>
    </Link>
  );
}
