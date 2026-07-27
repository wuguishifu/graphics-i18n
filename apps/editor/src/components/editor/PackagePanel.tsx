'use client';

import { Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { EditorAction } from '@/lib/editor/reducer';
import type { EditorDoc } from '@/lib/editor/types';
import { ColorField, NativeSelect, NumField, Row, Section, SelectField, TextField } from './fields';

type Dispatch = (action: EditorAction) => void;

function sanitizeId(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fileToBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export function PackagePanel({ doc, dispatch }: { doc: EditorDoc; dispatch: Dispatch }) {
  const { manifest } = doc;
  const localeCodes = Object.keys(doc.locales);
  const localeOptions = localeCodes.map((value) => ({ value }));
  const assetInput = useRef<HTMLInputElement>(null);
  const fontInput = useRef<HTMLInputElement>(null);
  const [newLocale, setNewLocale] = useState('');

  const setManifest = (update: (m: typeof manifest) => typeof manifest) =>
    dispatch({ type: 'update-manifest', update });

  return (
    <div className="flex flex-col overflow-y-auto">
      <Section title="Package">
        <TextField
          label="Package id"
          value={manifest.packageId}
          onChange={(packageId) => setManifest((m) => ({ ...m, packageId }))}
        />
        <Row>
          <TextField label="Name" value={manifest.name} onChange={(name) => setManifest((m) => ({ ...m, name: name || undefined }))} />
          <NumField
            label="Version"
            value={manifest.packageVersion}
            onChange={(v) => setManifest((m) => ({ ...m, packageVersion: v ?? 1 }))}
          />
        </Row>
      </Section>

      <Section title="Canvas">
        <Row>
          <NumField
            label="Width"
            value={manifest.canvas.width}
            onChange={(width) => setManifest((m) => ({ ...m, canvas: { ...m.canvas, width: width ?? 1 } }))}
          />
          <NumField
            label="Height"
            value={manifest.canvas.height}
            onChange={(height) => setManifest((m) => ({ ...m, canvas: { ...m.canvas, height: height ?? 1 } }))}
          />
        </Row>
        <ColorField
          label="Background"
          value={manifest.canvas.background}
          onChange={(background) => setManifest((m) => ({ ...m, canvas: { ...m.canvas, background: background || undefined } }))}
        />
      </Section>

      <Section title="Render">
        <Row>
          <SelectField
            label="Default locale"
            value={manifest.render.defaultLocale}
            options={localeOptions}
            allowEmpty="(none)"
            onChange={(defaultLocale) => setManifest((m) => ({ ...m, render: { ...m.render, defaultLocale } }))}
          />
          <SelectField
            label="Fallback locale"
            value={manifest.render.fallbackLocale}
            options={localeOptions}
            onChange={(fallbackLocale) =>
              fallbackLocale && setManifest((m) => ({ ...m, render: { ...m.render, fallbackLocale } }))
            }
          />
        </Row>
      </Section>

      <Section title="Locales">
        {localeCodes.map((code) => (
          <div key={code} className="flex items-center gap-2">
            <span className="flex-1 font-mono text-sm">{code}</span>
            <NativeSelect
              value={doc.locales[code].direction ?? 'ltr'}
              onChange={(direction) =>
                dispatch({
                  type: 'update-locale',
                  locale: code,
                  update: (pack) => ({ ...pack, direction: direction === 'rtl' ? 'rtl' : undefined }),
                })
              }
            >
              <option value="ltr">ltr</option>
              <option value="rtl">rtl</option>
            </NativeSelect>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={code === manifest.render.fallbackLocale}
              title={code === manifest.render.fallbackLocale ? 'Fallback locale cannot be removed' : 'Remove locale'}
              onClick={() => dispatch({ type: 'remove-locale', locale: code })}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const code = newLocale.trim();
            if (code && !doc.locales[code]) {
              dispatch({ type: 'add-locale', locale: code });
              setNewLocale('');
            }
          }}
        >
          <Input
            value={newLocale}
            placeholder="locale code (fr, pt-BR…)"
            className="h-8"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setNewLocale(event.target.value)}
          />
          <Button type="submit" variant="outline" size="sm">
            Add
          </Button>
        </form>
      </Section>

      <Section title="Assets">
        {Object.entries(manifest.assets).map(([id, entry]) => (
          <div key={id} className="flex items-center gap-2 text-sm">
            <span className="flex-1 truncate font-mono text-xs">{id}</span>
            <span className="text-xs text-muted-foreground">{entry.type}</span>
            <span className="text-xs text-muted-foreground">
              {((doc.files[entry.path]?.length ?? 0) / 1024).toFixed(1)} KB
            </span>
            <Button variant="ghost" size="icon-sm" onClick={() => dispatch({ type: 'remove-asset', id })}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <input
          ref={assetInput}
          type="file"
          accept="image/*,.svg"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const bytes = await fileToBytes(file);
            const id = sanitizeId(file.name) || `asset-${Date.now().toString(36)}`;
            const isSvg = file.name.toLowerCase().endsWith('.svg') || file.type === 'image/svg+xml';
            dispatch({
              type: 'add-asset',
              id,
              entry: {
                path: `assets/${file.name}`,
                type: isSvg ? 'svg' : 'image',
                mimeType: file.type || undefined,
              },
              bytes,
            });
            event.target.value = '';
          }}
        />
        <Button variant="outline" size="sm" onClick={() => assetInput.current?.click()}>
          <Upload data-icon="inline-start" /> Upload image / SVG
        </Button>
      </Section>

      <Section title="Fonts">
        {Object.entries(manifest.fonts ?? {}).map(([id, entry]) => (
          <div key={id} className="flex flex-col gap-1 rounded-md border p-2">
            <div className="flex items-center gap-2">
              <span className="flex-1 truncate font-mono text-xs">{id}</span>
              <Button variant="ghost" size="icon-sm" onClick={() => dispatch({ type: 'remove-font', id })}>
                <Trash2 />
              </Button>
            </div>
            <Row>
              <TextField
                label="Family"
                value={entry.family}
                onChange={(family) =>
                  setManifest((m) => ({
                    ...m,
                    fonts: { ...m.fonts, [id]: { ...entry, family } },
                  }))
                }
              />
              <NumField
                label="Weight"
                value={entry.weight}
                onChange={(weight) =>
                  setManifest((m) => ({
                    ...m,
                    fonts: { ...m.fonts, [id]: { ...entry, weight } },
                  }))
                }
              />
            </Row>
          </div>
        ))}
        <input
          ref={fontInput}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const bytes = await fileToBytes(file);
            const id = sanitizeId(file.name) || `font-${Date.now().toString(36)}`;
            dispatch({
              type: 'add-font',
              id,
              entry: { path: `fonts/${file.name}`, family: sanitizeId(file.name), weight: 400 },
              bytes,
            });
            event.target.value = '';
          }}
        />
        <Button variant="outline" size="sm" onClick={() => fontInput.current?.click()}>
          <Upload data-icon="inline-start" /> Upload font
        </Button>
      </Section>
    </div>
  );
}
