'use client';

import type { ChangeEvent, ReactNode } from 'react';
import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function NumField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  step?: number;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        step={step}
        value={value ?? ''}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const raw = event.target.value;
          onChange(raw === '' ? undefined : Number(raw));
        }}
        className="h-8"
      />
    </Field>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <Input
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        className="h-8"
      />
    </Field>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const isHex = value !== undefined && /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <Field label={label}>
      <div className="flex items-center gap-1.5">
        <input
          id={id}
          type="color"
          value={isHex ? value : '#000000'}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
        />
        <Input
          value={value ?? ''}
          placeholder="#000000 / rgba(...)"
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          className="h-8"
        />
      </div>
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  allowEmpty,
}: {
  label: string;
  value: T | undefined;
  options: readonly { value: T; label?: string }[];
  onChange: (value: T | undefined) => void;
  allowEmpty?: string;
}) {
  return (
    <Field label={label}>
      <NativeSelect value={value ?? ''} onChange={(v) => onChange((v || undefined) as T | undefined)}>
        {allowEmpty !== undefined && <option value="">{allowEmpty}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label ?? option.value}
          </option>
        ))}
      </NativeSelect>
    </Field>
  );
}

export function NativeSelect({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        className,
      )}
    >
      {children}
    </select>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b px-3 py-3 last:border-b-0">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </div>
  );
}
