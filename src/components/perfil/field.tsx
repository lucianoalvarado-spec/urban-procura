export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-medium text-slate-500 ${className ?? ""}`}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-sm text-[var(--foreground)] focus:border-[var(--brand-500)] focus:outline-none"
      />
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-medium text-slate-500 ${className ?? ""}`}>
      {label}
      <input
        type="number"
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-sm text-[var(--foreground)] focus:border-[var(--brand-500)] focus:outline-none"
      />
    </label>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-[var(--border)]"
      />
      {label}
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-medium text-slate-500 ${className ?? ""}`}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-sm text-[var(--foreground)] focus:border-[var(--brand-500)] focus:outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
