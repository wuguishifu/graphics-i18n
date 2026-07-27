'use client';

import { walkNodes } from '@graphics-i18n/core';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { EditorAction } from '@/lib/editor/reducer';
import type { EditorDoc } from '@/lib/editor/types';

function collectKeys(doc: EditorDoc): string[] {
  const keys = new Set<string>();
  walkNodes(doc.scene.root, (node) => {
    if (node.type === 'text') keys.add(node.bind);
    if (node.type === 'badge' && node.text.startsWith('@'))
      keys.add(node.text.slice(1));
  });
  for (const pack of Object.values(doc.locales)) {
    for (const key of Object.keys(pack.strings)) keys.add(key);
  }
  return [...keys].sort();
}

export function StringsPanel({
  doc,
  locale,
  dispatch,
}: {
  doc: EditorDoc;
  locale: string;
  dispatch: (action: EditorAction) => void;
}) {
  const [newKey, setNewKey] = useState('');
  const keys = collectKeys(doc);
  const pack = doc.locales[locale];
  const fallbackLocale = doc.manifest.render.fallbackLocale;
  const fallbackPack = doc.locales[fallbackLocale];

  if (!pack) {
    return (
      <p className="px-3 py-4 text-sm text-muted-foreground">
        No locale pack for “{locale}”.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto px-3 py-3">
      <p className="text-xs text-muted-foreground">
        Strings for{' '}
        <span className="font-medium text-foreground">{locale}</span>
        {locale !== fallbackLocale && (
          <> — empty values fall back to {fallbackLocale}</>
        )}
      </p>
      {keys.map((key) => {
        const value = pack.strings[key];
        const fallback = fallbackPack?.strings[key];
        return (
          <div key={key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-mono text-xs text-muted-foreground">
                {key}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                title="Remove key from all locales"
                onClick={() => dispatch({ type: 'remove-string', key })}
              >
                <Trash2 />
              </Button>
            </div>
            <Input
              value={value ?? ''}
              placeholder={locale === fallbackLocale ? '' : (fallback ?? '')}
              dir={pack.direction === 'rtl' ? 'rtl' : undefined}
              className="h-8"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                dispatch({
                  type: 'set-string',
                  locale,
                  key,
                  value: event.target.value,
                })
              }
            />
          </div>
        );
      })}
      <form
        className="mt-1 flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const key = newKey.trim();
          if (key) {
            dispatch({ type: 'set-string', locale, key, value: '' });
            setNewKey('');
          }
        }}
      >
        <Input
          value={newKey}
          placeholder="new.string.key"
          className="h-8 font-mono text-xs"
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setNewKey(event.target.value)
          }
        />
        <Button type="submit" variant="outline" size="sm">
          Add
        </Button>
      </form>
    </div>
  );
}
