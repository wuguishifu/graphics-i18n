'use client';

import { LocalizedGraphic } from '@graphics-i18n/react';
import { useState } from 'react';

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
  { code: 'ja', label: '日本語 (fallback)' },
];

const NOTES = [
  'fr — longer title shrinks to fit, wider text box, blue logo (asset override), patched title color',
  'ar — RTL: text aligns right, patch mirrors the logo and accent bar, Arabic font via fontOverrides',
  'ja — not in the package, falls back to en',
  '“terms” is only translated in en — other locales fall back per string (see debug overlay)',
];

export default function ExamplePage() {
  const [locale, setLocale] = useState('en');
  const [debug, setDebug] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          LocalizedGraphic (web)
        </h1>
        <p className="text-muted-foreground">
          One .lpkg file, one shared scene — the locale below picks the strings,
          layout patch and asset overrides at render time. Rendered as a
          self-contained inline SVG by @graphics-i18n/react.
        </p>
      </header>

      <LocalizedGraphic
        source="/graphics/summer-promo.lpkg"
        locale={locale}
        debug={debug}
        onLoad={() => setError(undefined)}
        onError={(err) => setError(err.message)}
        className="w-full overflow-hidden rounded-2xl border"
        style={{ aspectRatio: '1200 / 630' }}
      />
      {error !== undefined && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {LOCALES.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            className={
              locale === code
                ? 'rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground'
                : 'rounded-full bg-secondary px-4 py-1.5 text-sm text-secondary-foreground hover:bg-secondary/80'
            }
          >
            {label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={debug}
            onChange={(event) => setDebug(event.target.checked)}
          />
          Debug overlay
        </label>
      </div>

      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
        {NOTES.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </main>
  );
}
