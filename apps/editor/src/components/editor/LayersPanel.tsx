'use client';

import type { SceneNode } from '@graphics-i18n/core';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Minus,
  Plus,
  Shapes,
  Square,
  Tag,
  Trash2,
  Type,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { EditorAction } from '@/lib/editor/reducer';
import { nextNodeId } from '@/lib/editor/types';
import { cn } from '@/lib/utils';

const NODE_ICONS: Record<string, typeof Square> = {
  rect: Square,
  text: Type,
  badge: Tag,
  image: ImageIcon,
  svg: Shapes,
  line: Minus,
  group: Shapes,
};

function makeNode(
  type: string,
  canvas: { width: number; height: number },
  firstAssetId?: string,
): SceneNode | undefined {
  const cx = Math.round(canvas.width / 3);
  const cy = Math.round(canvas.height / 3);
  switch (type) {
    case 'rect':
      return {
        id: nextNodeId('rect'),
        type: 'rect',
        x: cx,
        y: cy,
        width: 240,
        height: 140,
        radius: 8,
        fill: '#4f46e5',
      };
    case 'text':
      return {
        id: nextNodeId('text'),
        type: 'text',
        bind: nextNodeId('string'),
        fallbackText: 'Text',
        box: { x: cx, y: cy, width: 320, height: 80 },
        style: { fontFamily: 'Inter', fontSize: 40, color: '#111111' },
        fit: { mode: 'shrink', minFontSize: 12 },
      };
    case 'badge':
      return {
        id: nextNodeId('badge'),
        type: 'badge',
        text: 'Badge',
        box: { x: cx, y: cy, width: 160, height: 48 },
        style: {
          fontFamily: 'Inter',
          fontSize: 22,
          color: '#ffffff',
          align: 'center',
          valign: 'middle',
        },
        background: { fill: '#e11d48', radius: 12 },
      };
    case 'line':
      return {
        id: nextNodeId('line'),
        type: 'line',
        x1: cx,
        y1: cy,
        x2: cx + 300,
        y2: cy,
        stroke: { color: '#111111', width: 3 },
      };
    case 'image':
      if (!firstAssetId) return undefined;
      return {
        id: nextNodeId('image'),
        type: 'image',
        assetId: firstAssetId,
        x: cx,
        y: cy,
        width: 320,
        height: 200,
        fit: 'cover',
      };
    case 'svg':
      if (!firstAssetId) return undefined;
      return {
        id: nextNodeId('svg'),
        type: 'svg',
        assetId: firstAssetId,
        x: cx,
        y: cy,
        width: 160,
        height: 160,
      };
    default:
      return undefined;
  }
}

function NodeRow({
  node,
  depth,
  selectedId,
  dispatch,
}: {
  node: SceneNode;
  depth: number;
  selectedId?: string;
  dispatch: (action: EditorAction) => void;
}) {
  const Icon = NODE_ICONS[node.type] ?? Square;
  const hidden = node.visible === false;
  return (
    <>
      <div
        className={cn(
          'group flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm',
          selectedId === node.id
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-muted',
        )}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => dispatch({ type: 'select-node', id: node.id })}
      >
        <Icon className="size-3.5 shrink-0 opacity-60" />
        <span
          className={cn('flex-1 truncate', hidden && 'line-through opacity-50')}
        >
          {node.name ?? node.id}
        </span>
        <span className="hidden shrink-0 items-center group-hover:flex">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: 'move-node', id: node.id, direction: 'up' });
            }}
          >
            <ArrowUp />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: 'move-node', id: node.id, direction: 'down' });
            }}
          >
            <ArrowDown />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({
                type: 'update-node',
                id: node.id,
                update: (n) => ({
                  ...n,
                  visible: n.visible === false ? undefined : false,
                }),
              });
            }}
          >
            {hidden ? <EyeOff /> : <Eye />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: 'remove-node', id: node.id });
            }}
          >
            <Trash2 />
          </Button>
        </span>
      </div>
      {node.type === 'group' &&
        node.children.map((child) => (
          <NodeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            dispatch={dispatch}
          />
        ))}
    </>
  );
}

export function LayersPanel({
  nodes,
  canvas,
  firstAssetId,
  selectedId,
  dispatch,
}: {
  nodes: SceneNode[];
  canvas: { width: number; height: number };
  firstAssetId?: string;
  selectedId?: string;
  dispatch: (action: EditorAction) => void;
}) {
  const [adding, setAdding] = useState(false);
  const addTypes = ['rect', 'text', 'badge', 'line', 'image', 'svg'];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Layers
        </h3>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setAdding((v) => !v)}
        >
          <Plus />
        </Button>
      </div>
      {adding && (
        <div className="flex flex-wrap gap-1 px-3 pb-2">
          {addTypes.map((type) => {
            const disabled =
              (type === 'image' || type === 'svg') && !firstAssetId;
            return (
              <Button
                key={type}
                variant="outline"
                size="sm"
                disabled={disabled}
                title={
                  disabled ? 'Upload an asset first (Package tab)' : undefined
                }
                onClick={() => {
                  const node = makeNode(type, canvas, firstAssetId);
                  if (node) {
                    dispatch({ type: 'add-node', node });
                    setAdding(false);
                  }
                }}
              >
                {type}
              </Button>
            );
          })}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
        {nodes.length === 0 && (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            No nodes yet — add one with +.
          </p>
        )}
        {nodes.map((node) => (
          <NodeRow
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            dispatch={dispatch}
          />
        ))}
      </div>
    </div>
  );
}
