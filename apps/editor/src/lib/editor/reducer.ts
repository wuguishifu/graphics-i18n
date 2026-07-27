import type {
  AssetEntry,
  FontEntry,
  LocalePack,
  PackageManifest,
  PatchNodeOverride,
  Scene,
  SceneNode,
} from '@wuguishifu/core';
import type { EditorDoc } from './types';

export type EditorState = {
  doc: EditorDoc;
  selectedNodeId?: string;
  previewLocale: string;
  debug: boolean;
};

export type EditorAction =
  | { type: 'load-doc'; doc: EditorDoc }
  | { type: 'select-node'; id?: string }
  | { type: 'set-preview-locale'; locale: string }
  | { type: 'set-debug'; debug: boolean }
  | { type: 'update-node'; id: string; update: (node: SceneNode) => SceneNode }
  | { type: 'add-node'; node: SceneNode }
  | { type: 'remove-node'; id: string }
  | { type: 'move-node'; id: string; direction: 'up' | 'down' }
  | { type: 'update-manifest'; update: (manifest: PackageManifest) => PackageManifest }
  | { type: 'set-string'; locale: string; key: string; value: string }
  | { type: 'remove-string'; key: string }
  | { type: 'update-locale'; locale: string; update: (pack: LocalePack) => LocalePack }
  | { type: 'add-locale'; locale: string; direction?: 'ltr' | 'rtl' }
  | { type: 'remove-locale'; locale: string }
  | { type: 'set-patch-override'; locale: string; nodeId: string; override?: PatchNodeOverride }
  | { type: 'add-asset'; id: string; entry: AssetEntry; bytes: Uint8Array }
  | { type: 'remove-asset'; id: string }
  | { type: 'add-font'; id: string; entry: FontEntry; bytes: Uint8Array }
  | { type: 'remove-font'; id: string };

function mapNodes(nodes: SceneNode[], id: string, update: (node: SceneNode) => SceneNode): SceneNode[] {
  return nodes.map((node) => {
    if (node.id === id) return update(node);
    if (node.type === 'group') {
      return { ...node, children: mapNodes(node.children, id, update) };
    }
    return node;
  });
}

function removeNodes(nodes: SceneNode[], id: string): SceneNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) =>
      node.type === 'group' ? { ...node, children: removeNodes(node.children, id) } : node,
    );
}

function moveNodes(nodes: SceneNode[], id: string, direction: 'up' | 'down'): SceneNode[] {
  const index = nodes.findIndex((node) => node.id === id);
  if (index >= 0) {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= nodes.length) return nodes;
    const next = [...nodes];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  }
  return nodes.map((node) =>
    node.type === 'group' ? { ...node, children: moveNodes(node.children, id, direction) } : node,
  );
}

function withScene(doc: EditorDoc, root: SceneNode[]): EditorDoc {
  const scene: Scene = { ...doc.scene, root };
  return { ...doc, scene };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const { doc } = state;
  switch (action.type) {
    case 'load-doc': {
      const locales = Object.keys(action.doc.locales);
      const previewLocale =
        action.doc.manifest.render.defaultLocale ?? locales[0] ?? state.previewLocale;
      return { ...state, doc: action.doc, selectedNodeId: undefined, previewLocale };
    }
    case 'select-node':
      return { ...state, selectedNodeId: action.id };
    case 'set-preview-locale':
      return { ...state, previewLocale: action.locale };
    case 'set-debug':
      return { ...state, debug: action.debug };

    case 'update-node':
      return { ...state, doc: withScene(doc, mapNodes(doc.scene.root, action.id, action.update)) };
    case 'add-node':
      return {
        ...state,
        doc: withScene(doc, [...doc.scene.root, action.node]),
        selectedNodeId: action.node.id,
      };
    case 'remove-node':
      return {
        ...state,
        doc: withScene(doc, removeNodes(doc.scene.root, action.id)),
        selectedNodeId: state.selectedNodeId === action.id ? undefined : state.selectedNodeId,
      };
    case 'move-node':
      return { ...state, doc: withScene(doc, moveNodes(doc.scene.root, action.id, action.direction)) };

    case 'update-manifest':
      return { ...state, doc: { ...doc, manifest: action.update(doc.manifest) } };

    case 'set-string': {
      const pack = doc.locales[action.locale];
      if (!pack) return state;
      return {
        ...state,
        doc: {
          ...doc,
          locales: {
            ...doc.locales,
            [action.locale]: {
              ...pack,
              strings: { ...pack.strings, [action.key]: action.value },
            },
          },
        },
      };
    }
    case 'remove-string': {
      const locales = Object.fromEntries(
        Object.entries(doc.locales).map(([code, pack]) => {
          const strings = { ...pack.strings };
          delete strings[action.key];
          return [code, { ...pack, strings }];
        }),
      );
      return { ...state, doc: { ...doc, locales } };
    }
    case 'update-locale': {
      const pack = doc.locales[action.locale];
      if (!pack) return state;
      return {
        ...state,
        doc: { ...doc, locales: { ...doc.locales, [action.locale]: action.update(pack) } },
      };
    }
    case 'add-locale': {
      if (doc.locales[action.locale]) return state;
      return {
        ...state,
        doc: {
          ...doc,
          locales: {
            ...doc.locales,
            [action.locale]: { locale: action.locale, direction: action.direction, strings: {} },
          },
          manifest: {
            ...doc.manifest,
            locales: [
              ...doc.manifest.locales,
              { locale: action.locale, direction: action.direction, strings: true },
            ],
          },
        },
        previewLocale: action.locale,
      };
    }
    case 'remove-locale': {
      if (action.locale === doc.manifest.render.fallbackLocale) return state;
      const locales = { ...doc.locales };
      delete locales[action.locale];
      const patches = { ...doc.patches };
      delete patches[action.locale];
      return {
        ...state,
        doc: {
          ...doc,
          locales,
          patches,
          manifest: {
            ...doc.manifest,
            locales: doc.manifest.locales.filter((entry) => entry.locale !== action.locale),
          },
        },
        previewLocale:
          state.previewLocale === action.locale
            ? doc.manifest.render.fallbackLocale
            : state.previewLocale,
      };
    }

    case 'set-patch-override': {
      const patch = doc.patches[action.locale] ?? { nodes: {} };
      const nodes = { ...patch.nodes };
      if (action.override && Object.keys(action.override).length > 0) {
        nodes[action.nodeId] = action.override;
      } else {
        delete nodes[action.nodeId];
      }
      return { ...state, doc: { ...doc, patches: { ...doc.patches, [action.locale]: { nodes } } } };
    }

    case 'add-asset':
      return {
        ...state,
        doc: {
          ...doc,
          manifest: { ...doc.manifest, assets: { ...doc.manifest.assets, [action.id]: action.entry } },
          files: { ...doc.files, [action.entry.path]: action.bytes },
        },
      };
    case 'remove-asset': {
      const assets = { ...doc.manifest.assets };
      const path = assets[action.id]?.path;
      delete assets[action.id];
      const files = { ...doc.files };
      if (path) delete files[path];
      return { ...state, doc: { ...doc, manifest: { ...doc.manifest, assets }, files } };
    }
    case 'add-font':
      return {
        ...state,
        doc: {
          ...doc,
          manifest: { ...doc.manifest, fonts: { ...doc.manifest.fonts, [action.id]: action.entry } },
          files: { ...doc.files, [action.entry.path]: action.bytes },
        },
      };
    case 'remove-font': {
      const fonts = { ...doc.manifest.fonts };
      const path = fonts[action.id]?.path;
      delete fonts[action.id];
      const files = { ...doc.files };
      if (path) delete files[path];
      return { ...state, doc: { ...doc, manifest: { ...doc.manifest, fonts }, files } };
    }
  }
}
