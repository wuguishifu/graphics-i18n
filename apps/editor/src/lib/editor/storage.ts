import { base64ToBytes, bytesToBase64 } from '@wuguishifu/core';
import type { EditorDoc } from './types';

const STORAGE_KEY = 'lpkg-editor-draft-v1';

type StoredDoc = Omit<EditorDoc, 'files'> & { files: Record<string, string> };

export function saveDraft(doc: EditorDoc): void {
  try {
    const stored: StoredDoc = {
      ...doc,
      files: Object.fromEntries(
        Object.entries(doc.files).map(([path, bytes]) => [path, bytesToBase64(bytes)]),
      ),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Quota exceeded or private mode — autosave is best-effort.
  }
}

export function loadDraft(): EditorDoc | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const stored = JSON.parse(raw) as StoredDoc;
    return {
      ...stored,
      files: Object.fromEntries(
        Object.entries(stored.files).map(([path, base64]) => [path, base64ToBytes(base64)]),
      ),
    };
  } catch {
    return undefined;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
