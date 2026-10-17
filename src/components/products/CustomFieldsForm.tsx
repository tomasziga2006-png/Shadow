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
