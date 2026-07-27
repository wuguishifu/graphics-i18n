'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePreview } from '@/lib/editor/preview';
import { editorReducer, type EditorState } from '@/lib/editor/reducer';
import { loadDraft, saveDraft } from '@/lib/editor/storage';
import { blankDoc } from '@/lib/editor/types';
import { InspectorPanel } from './InspectorPanel';
import { LayersPanel } from './LayersPanel';
import { PackagePanel } from './PackagePanel';
import { PreviewCanvas } from './PreviewCanvas';
import { StringsPanel } from './StringsPanel';
import { Toolbar } from './Toolbar';

function initialState(): EditorState {
  const doc = blankDoc();
  return { doc, previewLocale: doc.manifest.render.fallbackLocale, debug: false };
}

export function EditorShell() {
  const [state, dispatch] = useReducer(editorReducer, undefined, initialState);
  const [error, setError] = useState<string>();
  const hydrated = useRef(false);

  // Restore the autosaved draft once on mount (localStorage is client-only).
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      dispatch({ type: 'load-doc', doc: draft });
    }
    hydrated.current = true;
  }, []);

  // Debounced autosave.
  useEffect(() => {
    if (!hydrated.current) return;
    const timer = setTimeout(() => saveDraft(state.doc), 800);
    return () => clearTimeout(timer);
  }, [state.doc]);

  const preview = usePreview(state.doc, state.previewLocale);

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <Toolbar
        doc={state.doc}
        previewLocale={state.previewLocale}
        debug={state.debug}
        dispatch={dispatch}
        onError={setError}
      />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
          <LayersPanel
            nodes={state.doc.scene.root}
            canvas={state.doc.manifest.canvas}
            firstAssetId={Object.keys(state.doc.manifest.assets)[0]}
            selectedId={state.selectedNodeId}
            dispatch={dispatch}
          />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col items-center gap-3 overflow-y-auto p-6">
          {error !== undefined && (
            <p className="w-full max-w-4xl rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {preview.scene ? (
            <>
              <PreviewCanvas
                scene={preview.scene}
                resources={preview.resources}
                selectedId={state.selectedNodeId}
                debug={state.debug}
                dispatch={dispatch}
              />
              <div className="w-full max-w-4xl text-xs text-muted-foreground">
                {preview.scene.meta.usedFallbackLocale && (
                  <span>Rendering fallback locale “{preview.scene.meta.locale}”. </span>
                )}
                {preview.scene.meta.patchApplied && <span>Patch applied. </span>}
                {preview.scene.meta.diagnostics.length > 0 && (
                  <span>
                    {preview.scene.meta.diagnostics.length} diagnostic
                    {preview.scene.meta.diagnostics.length === 1 ? '' : 's'} — enable Debug for details.
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Preview failed: {preview.error}
            </p>
          )}
        </main>

        <aside className="flex w-80 shrink-0 flex-col border-l bg-card">
          <Tabs defaultValue="node" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="mx-3 mt-2">
              <TabsTrigger value="node">Node</TabsTrigger>
              <TabsTrigger value="strings">Strings</TabsTrigger>
              <TabsTrigger value="package">Package</TabsTrigger>
            </TabsList>
            <TabsContent value="node" className="min-h-0 flex-1 overflow-y-auto">
              <InspectorPanel
                doc={state.doc}
                selectedId={state.selectedNodeId}
                previewLocale={state.previewLocale}
                dispatch={dispatch}
              />
            </TabsContent>
            <TabsContent value="strings" className="min-h-0 flex-1 overflow-y-auto">
              <StringsPanel doc={state.doc} locale={state.previewLocale} dispatch={dispatch} />
            </TabsContent>
            <TabsContent value="package" className="min-h-0 flex-1 overflow-y-auto">
              <PackagePanel doc={state.doc} dispatch={dispatch} />
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
