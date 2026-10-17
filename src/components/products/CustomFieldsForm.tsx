import React, { useCallback, useMemo } from 'react';
import { ChevronDown, CircleAlert as AlertCircle } from 'lucide-react';
import type { CustomField, CustomRule } from '../../lib/types';
import { formatMoney, isNiveauHidden, isNiveauField } from '../../lib/utils';

function isSelectType(type: string) {
  return type === 'select' || type === 'selection';
}

const STAT_DESCRIPTIONS: Record<string, string> = {
  hp: 'Points de vie du dino',
  stam: 'Endurance du dino',
  oxy: 'Oxygene du dino',
  food: 'Nourriture du dino',
  poids: 'Poids du dino',
  damage: 'Degats du dino',
  degat: 'Degats de l\'objet',
  dura: 'Durabilite de l\'objet',
};

function getFieldDescription(field: CustomField): string | undefined {
  const marker = field.marker?.toLowerCase();
  if (marker && STAT_DESCRIPTIONS[marker]) return STAT_DESCRIPTIONS[marker];
  return field.instruction || undefined;
}

interface Props {
  fields: CustomField[];
  values: Record<string, string | number>;
  onChange: (values: Record<string, string | number>) => void;
  rules?: CustomRule[];
  currency?: string;
}

export default function CustomFieldsForm({ fields, values, onChange, rules, currency }: Props) {
  const updateValue = useCallback(
    (fieldId: number, value: string | number) => {
      const next = { ...values, [String(fieldId)]: value };
      const parentField = fields.find((f) => f.id === fieldId);
      if (parentField && isSelectType(parentField.type)) {
        for (const child of fields) {
          if (child.parent && child.parent.customFieldId === fieldId) {
            delete next[String(child.id)];
          }
        }
        const selectedOpt = parentField.options?.find(
          (o) => String(o.id) === String(value)
        );
        if (selectedOpt) {
          for (const child of fields) {
            if (
              child.parent &&
              child.parent.customFieldId === fieldId &&
              String(child.parent.optionId) === String(selectedOpt.id)
            ) {
              if (child.type === 'number') {
                const dv = String(child.default_value ?? child.minimum ?? 0);
                next[String(child.id)] = dv.includes('-') ? (Number(dv.split('-')[0]) || 0) : (Number(dv) || 0);
              } else if (child.type === 'checkbox') {
                next[String(child.id)] = Number(child.default_value) || 0;
              } else if (isSelectType(child.type) && child.options?.length) {
                const s = [...child.options].sort((a, b) => Number(a.order) - Number(b.order));
                const defOpt = child.default_value !== undefined
                  ? s.find((o) => String(o.id) === String(child.default_value) || String(o.value) === String(child.default_value))
                  : undefined;
                next[String(child.id)] = defOpt ? defOpt.id : s[0].id;
              } else if (child.default_value !== undefined) {
                next[String(child.id)] = child.default_value;
              }
            }
          }
        }
      }
      onChange(next);
    },
    [values, onChange, fields]
  );

  const sorted = useMemo(() => [...fields].sort((a, b) => a.order - b.order), [fields]);

  const hideNiveau = useMemo(() => isNiveauHidden(fields, values), [fields, values]);

  const isFieldVisible = useCallback(
    (field: CustomField): boolean => {
      if (hideNiveau && isNiveauField(field)) return false;
      if (!field.parent) return true;
      const parentValue = values[String(field.parent.customFieldId)];
      if (parentValue === undefined) return false;
      const parentField = fields.find((f) => f.id === field.parent!.customFieldId);
      if (!parentField?.options) return false;
      const selectedOption = parentField.options.find(
        (o) => String(o.id) === String(parentValue)
      );
      if (!selectedOption) return false;
      return String(selectedOption.id) === String(field.parent.optionId);
    },
    [fields, values, hideNiveau]
  );

  const numberLimitRules = useMemo(
    () => (rules || []).filter((r) => r.type === 'number_limit'),
    [rules]
  );

  const getRuleForField = useCallback(
    (fieldId: number) => numberLimitRules.find((r) => r.fields.includes(fieldId)),
    [numberLimitRules]
  );

  const ruleTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    for (const rule of numberLimitRules) {
      totals[rule.id] = rule.fields.reduce((sum, fid) => {
        const field = fields.find((f) => f.id === fid);
        if (field && !isFieldVisible(field)) return sum;
        return sum + (Number(values[String(fid)]) || 0);
      }, 0);
    }
    return totals;
  }, [numberLimitRules, values, fields, isFieldVisible]);

  const updateRuleConstrainedValue = useCallback(
    (fieldId: number, value: number, rule: CustomRule) => {
      const newValues = { ...values, [String(fieldId)]: value };
      const newTotal = rule.fields.reduce((sum, fid) => {
        const f = fields.find((ff) => ff.id === fid);
        if (f && !isFieldVisible(f)) return sum;
        return sum + (Number(newValues[String(fid)]) || 0);
      }, 0);
      if (newTotal <= rule.max) {
        onChange(newValues);
      }
    },
    [values, onChange, fields, isFieldVisible]
  );

  const visibleRuleIds = useMemo(() => {
    const ids = new Set<number>();
    for (const rule of numberLimitRules) {
      if (rule.fields.some((fid) => {
        const field = fields.find((f) => f.id === fid);
        return field && isFieldVisible(field);
      })) {
        ids.add(rule.id);
      }
    }
    return ids;
  }, [numberLimitRules, fields, isFieldVisible]);

  const firstFieldIdPerRule = useMemo(() => {
    const map = new Map<number, number>();
    for (const field of sorted) {
      if (!isFieldVisible(field)) continue;
      const rule = getRuleForField(field.id);
      if (rule && !map.has(rule.id)) {
        map.set(rule.id, field.id);
      }
    }
    return map;
  }, [sorted, isFieldVisible, getRuleForField]);

  function renderRuleCounter(rule: CustomRule) {
    const total = ruleTotals[rule.id] || 0;
    const target = rule.max;
    const isExact = rule.min === rule.max;

    return (
      <div
        key={`rule-${rule.id}`}
        className={`glass-card p-4 border-2 transition-colors ${
          total === target
            ? 'border-ark-500/40 bg-ark-500/5'
            : total > target
            ? 'border-red-500/40 bg-red-500/5'
            : 'border-sand-500/40 bg-sand-500/5'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertCircle
              className={`w-4 h-4 ${
                total === target
                  ? 'text-ark-500'
                  : total > target
                  ? 'text-red-400'
                  : 'text-sand-400'
              }`}
            />
            <span className="text-sm font-semibold text-heading">{rule.name}</span>
          </div>
          <span
            className={`text-2xl font-bold ${
              total === target
                ? 'text-ark-400'
                : total > target
                ? 'text-red-400'
                : 'text-sand-400'
            }`}
          >
            {total} / {target}
          </span>
        </div>

        <div className="relative h-2 bg-volcanic-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              total === target
                ? 'bg-gradient-to-r from-ark-600 to-ark-500'
                : total > target
                ? 'bg-gradient-to-r from-red-600 to-red-500'
                : 'bg-gradient-to-r from-sand-600 to-sand-500'
            }`}
            style={{ width: `${Math.min((total / target) * 100, 100)}%` }}
          />
        </div>

        {total !== target && (
          <p
            className={`text-xs mt-2 ${
              total > target ? 'text-red-400' : 'text-sand-400'
            }`}
          >
            {total > target
              ? `Reduisez de ${total - target} points`
              : isExact
              ? `Il vous reste ${target - total} points a repartir`
              : `${target - total} points restants (min ${rule.min})`}
          </p>
        )}
      </div>
    );
  }

  const elements: React.ReactElement[] = [];

  for (const field of sorted) {
    if (!isFieldVisible(field)) continue;

    for (const rule of numberLimitRules) {
      if (visibleRuleIds.has(rule.id) && firstFieldIdPerRule.get(rule.id) === field.id) {
        elements.push(renderRuleCounter(rule));
      }
    }

    const key = String(field.id);
    const currentValue = values[key];
    const rule = getRuleForField(field.id);
    const description = getFieldDescription(field);

    if (isSelectType(field.type) && field.options && field.options.length > 0) {
      elements.push(
        <SelectField
          key={field.id}
          field={field}
          value={currentValue}
          onUpdate={(v) => updateValue(field.id, v)}
          description={description}
          currency={currency}
        />
      );
    } else if (field.type === 'number') {
      elements.push(
        <SliderField
          key={field.id}
          field={field}
          value={currentValue}
          onUpdate={(v) =>
            rule
              ? updateRuleConstrainedValue(field.id, v, rule)
              : updateValue(field.id, v)
          }
          description={description}
          currency={currency}
        />
      );
    } else if (field.type === 'checkbox') {
      elements.push(
        <CheckboxField
          key={field.id}
          field={field}
          value={currentValue}
          onUpdate={(v) => updateValue(field.id, v)}
          description={description}
          currency={currency}
        />
      );
    } else {
      elements.push(
        <TextField
          key={field.id}
          field={field}
          value={currentValue}
          onUpdate={(v) => updateValue(field.id, v)}
          description={description}
          currency={currency}
        />
      );
    }
  }

  return <div className="space-y-5">{elements}</div>;
}

function FieldLabel({
  field,
  description,
  currency,
}: {
  field: CustomField;
  description?: string;
  currency?: string;
}) {
  return (
    <div className="mb-2">
      <label className="flex items-center gap-2 text-sm font-medium text-volcanic-200">
        {field.name}
        {!!field.required && (
          <span className="text-[10px] px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded font-medium">
            Required
          </span>
        )}
        {field.price !== undefined && Number(field.price) > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 bg-ark-500/15 text-ark-400 rounded font-medium ml-auto">
            {field.type === 'number' ? `${formatMoney(Number(field.price), currency)}/pt` : `+${formatMoney(Number(field.price), currency)}`}
          </span>
        )}
      </label>
      {description && (
        <p className="text-xs text-volcanic-400 mt-0.5">{description}</p>
      )}
    </div>
  );
}

function SelectField({
  field,
  value,
  onUpdate,
  description,
  currency,
}: {
  field: CustomField;
  value: string | number | undefined;
  onUpdate: (v: string | number) => void;
  description?: string;
  currency?: string;
}) {
  const options = [...(field.options || [])].sort((a, b) => Number(a.order) - Number(b.order));
  const selectedOpt = options.find((o) => String(o.id) === String(value));
  const selectedPrice = selectedOpt ? (Number(selectedOpt.price) || 0) : 0;

  return (
    <div>
      <FieldLabel field={field} description={description} currency={currency} />
      <div className="relative">
        <select
          value={value ?? ''}
          onChange={(e) => onUpdate(e.target.value)}
          className="w-full appearance-none px-4 py-3 pr-10 bg-volcanic-800/80 border border-volcanic-700/50 rounded-xl text-heading text-sm focus:outline-none focus:border-ark-600/50 focus:ring-1 focus:ring-ark-600/20 transition-all cursor-pointer"
        >
          {field.placeholder && value === undefined && (
            <option value="" disabled>
              {field.placeholder}
            </option>
          )}
          {options.map((opt) => {
            const optPrice = Number(opt.price) || 0;
            return (
              <option key={opt.id} value={opt.id}>
                {opt.name}
                {optPrice > 0 ? ` (+${formatMoney(optPrice, currency)})` : ''}
              </option>
            );
          })}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-volcanic-400 pointer-events-none" />
      </div>
      {selectedPrice > 0 && (
        <p className="text-xs text-ark-400 mt-1.5">
          +{formatMoney(selectedPrice, currency)} pour cette option
        </p>
      )}
    </div>
  );
}

function SliderField({
  field,
  value,
  onUpdate,
  description,
  currency,
}: {
  field: CustomField;
  value: string | number | undefined;
  onUpdate: (v: number) => void;
  description?: string;
  currency?: string;
}) {
  const min = Number(field.minimum ?? 0);
  const max = Number(field.maximum ?? 100);
  const step = Number(field.step) || 1;
  const numValue = value !== undefined ? Number(value) : min;
  const pct = max > min ? ((numValue - min) / (max - min)) * 100 : 0;
  const unitPrice = Number(field.price) || 0;
  const relExtra = Math.max(0, numValue - min) * unitPrice;

  return (
    <div>
      <FieldLabel field={field} description={description} currency={currency} />
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 group">
            <div className="absolute inset-0 flex items-center pointer-events-none px-0.5">
              <div className="w-full h-2 rounded-full bg-volcanic-700/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-ark-600 to-ark-500 transition-all duration-150"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={numValue}
              onChange={(e) => onUpdate(Number(e.target.value))}
              className="relative w-full h-6 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-ark-500/30 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ark-500 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-ark-500 [&::-moz-range-track]:bg-transparent"
            />
          </div>
          <div className="shrink-0 min-w-[4rem] text-center px-3 py-1.5 bg-volcanic-800/80 border border-volcanic-700/50 rounded-lg">
            <span className="text-sm font-semibold text-heading">{numValue}</span>
          </div>
        </div>
        {step > 1 && (
          <div className="flex justify-center text-[11px] text-volcanic-600 px-0.5">
            <span>pas de {step}</span>
          </div>
        )}
        {unitPrice > 0 && relExtra > 0 && (
          <p className="text-xs text-ark-400">
            +{formatMoney(relExtra, currency)} (+{numValue - min} pts x {formatMoney(unitPrice, currency)})
          </p>
        )}
      </div>
    </div>
  );
}

function CheckboxField({
  field,
  value,
  onUpdate,
  description,
  currency,
}: {
  field: CustomField;
  value: string | number | undefined;
  onUpdate: (v: number) => void;
  description?: string;
  currency?: string;
}) {
  const checked = value === 1 || value === '1' || value === 'true';

  return (
    <div>
      <label className="flex items-center gap-3 p-3 bg-volcanic-800/40 rounded-xl cursor-pointer group transition-colors hover:bg-volcanic-800/60">
        <div className="relative shrink-0">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onUpdate(e.target.checked ? 1 : 0)}
            className="sr-only peer"
          />
          <div className="w-10 h-6 bg-volcanic-700 rounded-full peer-checked:bg-ark-600 transition-colors" />
          <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform peer-checked:translate-x-4" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-heading">{field.name}</span>
          {!!field.required && (
            <span className="text-[10px] px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded font-medium ml-2">
              Required
            </span>
          )}
        </div>
        {field.price !== undefined && Number(field.price) > 0 && (
          <span className="text-xs text-ark-400 font-medium shrink-0">
            +{formatMoney(Number(field.price), currency)}
          </span>
        )}
      </label>
      {description && (
        <p className="text-xs text-volcanic-400 mt-1.5 px-1">{description}</p>
      )}
    </div>
  );
}

function TextField({
  field,
  value,
  onUpdate,
  description,
  currency,
}: {
  field: CustomField;
  value: string | number | undefined;
  onUpdate: (v: string) => void;
  description?: string;
  currency?: string;
}) {
  return (
    <div>
      <FieldLabel field={field} description={description} currency={currency} />
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onUpdate(e.target.value)}
        placeholder={field.placeholder || `Enter ${field.name.toLowerCase()}...`}
        className="w-full px-4 py-3 bg-volcanic-800/80 border border-volcanic-700/50 rounded-xl text-heading text-sm placeholder-volcanic-500 focus:outline-none focus:border-ark-600/50 focus:ring-1 focus:ring-ark-600/20 transition-all"
      />
    </div>
  );
}
