'use client';

import { Download, FilePlus2, FolderOpen, Sparkles } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { EditorAction } from '@/lib/editor/reducer';
import { exportLpkg, importLpkg } from '@/lib/editor/serialize';
import { blankDoc, type EditorDoc } from '@/lib/editor/types';
import { NativeSelect } from './fields';

export function Toolbar({
  doc,
  previewLocale,
  debug,
  dispatch,
  onError,
}: {
  doc: EditorDoc;
  previewLocale: string;
  debug: boolean;
  dispatch: (action: EditorAction) => void;
  onError: (message: string | undefined) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  const exportPackage = () => {
    try {
      const bytes = exportLpkg(doc);
      const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${doc.manifest.packageId}.lpkg`;
      anchor.click();
      URL.revokeObjectURL(url);
      onError(undefined);
    } catch (error) {
      onError(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const loadExample = async () => {
    try {
      const response = await fetch('/graphics/summer-promo.lpkg');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const doc = importLpkg(new Uint8Array(await response.arrayBuffer()));
      dispatch({ type: 'load-doc', doc });
      onError(undefined);
    } catch (error) {
      onError(`Failed to load example: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-card px-3 py-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (window.confirm('Start a new package? The current draft will be replaced.')) {
            dispatch({ type: 'load-doc', doc: blankDoc() });
            onError(undefined);
          }
        }}
      >
        <FilePlus2 data-icon="inline-start" /> New
      </Button>
      <Button variant="outline" size="sm" onClick={loadExample}>
        <Sparkles data-icon="inline-start" /> Example
      </Button>
      <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
        <FolderOpen data-icon="inline-start" /> Import
      </Button>
      <Button variant="default" size="sm" onClick={exportPackage}>
        <Download data-icon="inline-start" /> Export .lpkg
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept=".lpkg,.zip,.json"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            const doc = importLpkg(new Uint8Array(await file.arrayBuffer()));
            dispatch({ type: 'load-doc', doc });
            onError(undefined);
          } catch (error) {
            onError(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
          }
          event.target.value = '';
        }}
      />

      <Input
        value={doc.manifest.name ?? ''}
        placeholder="Untitled graphic"
        className="h-8 w-52"
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          dispatch({
            type: 'update-manifest',
            update: (m) => ({ ...m, name: event.target.value || undefined }),
          })
        }
      />

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground">Preview</Label>
          <NativeSelect value={previewLocale} onChange={(locale) => dispatch({ type: 'set-preview-locale', locale })}>
            {Object.keys(doc.locales).map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground">Debug</Label>
          <Switch checked={debug} onCheckedChange={(value: boolean) => dispatch({ type: 'set-debug', debug: value })} />
        </div>
      </div>
    </div>
  );
}
