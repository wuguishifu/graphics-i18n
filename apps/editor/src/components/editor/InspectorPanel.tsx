'use client';

import type {
  BadgeNode,
  ImageNode,
  LineNode,
  PatchNodeOverride,
  RectNode,
  SceneNode,
  TextNode,
  TextStyle,
} from '@graphics-i18n/core';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { EditorAction } from '@/lib/editor/reducer';
import type { EditorDoc } from '@/lib/editor/types';
import {
  ColorField,
  Field,
  NumField,
  Row,
  Section,
  SelectField,
  TextField,
} from './fields';

type Dispatch = (action: EditorAction) => void;

function findNode(nodes: SceneNode[], id: string): SceneNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.type === 'group') {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

export function InspectorPanel({
  doc,
  selectedId,
  previewLocale,
  dispatch,
}: {
  doc: EditorDoc;
  selectedId?: string;
  previewLocale: string;
  dispatch: Dispatch;
}) {
  const node = selectedId ? findNode(doc.scene.root, selectedId) : undefined;
  if (!node) {
    return (
      <p className="px-3 py-4 text-sm text-muted-foreground">
        Select a node in the preview or layers panel to edit it.
      </p>
    );
  }
  const update = (fn: (n: SceneNode) => SceneNode) =>
    dispatch({ type: 'update-node', id: node.id, update: fn });

  return (
    <div className="flex flex-col overflow-y-auto">
      <Section title={`${node.type} — ${node.id}`}>
        <TextField
          label="Name"
          value={node.name}
          onChange={(name) =>
            update((n) => ({ ...n, name: name || undefined }))
          }
        />
        <Row>
          <NumField
            label="Opacity"
            step={0.05}
            value={node.opacity}
            onChange={(opacity) => update((n) => ({ ...n, opacity }))}
          />
          <Field label="Visible">
            <Switch
              checked={node.visible !== false}
              onCheckedChange={(visible: boolean) =>
                update((n) => ({ ...n, visible: visible ? undefined : false }))
              }
            />
          </Field>
        </Row>
      </Section>
      <TypeFields node={node} doc={doc} update={update} />
      <PatchSection
        doc={doc}
        node={node}
        locale={previewLocale}
        dispatch={dispatch}
      />
    </div>
  );
}

function TypeFields({
  node,
  doc,
  update,
}: {
  node: SceneNode;
  doc: EditorDoc;
  update: (fn: (n: SceneNode) => SceneNode) => void;
}) {
  const assetOptions = Object.keys(doc.manifest.assets).map((id) => ({
    value: id,
  }));
  switch (node.type) {
    case 'rect': {
      const set = (patch: Partial<RectNode>) =>
        update((n) => ({ ...(n as RectNode), ...patch }));
      return (
        <>
          <Section title="Geometry">
            <Row>
              <NumField
                label="X"
                value={node.x}
                onChange={(x) => set({ x: x ?? 0 })}
              />
              <NumField
                label="Y"
                value={node.y}
                onChange={(y) => set({ y: y ?? 0 })}
              />
            </Row>
            <Row>
              <NumField
                label="Width"
                value={node.width}
                onChange={(width) => set({ width: width ?? 0 })}
              />
              <NumField
                label="Height"
                value={node.height}
                onChange={(height) => set({ height: height ?? 0 })}
              />
            </Row>
            <NumField
              label="Corner radius"
              value={node.radius}
              onChange={(radius) => set({ radius })}
            />
          </Section>
          <Section title="Fill & stroke">
            <ColorField
              label="Fill"
              value={node.fill}
              onChange={(fill) => set({ fill })}
            />
            <ColorField
              label="Stroke color"
              value={node.stroke?.color}
              onChange={(color) =>
                set({ stroke: { width: node.stroke?.width ?? 1, color } })
              }
            />
            <NumField
              label="Stroke width"
              value={node.stroke?.width}
              onChange={(width) =>
                set({
                  stroke:
                    width === undefined
                      ? undefined
                      : { color: node.stroke?.color ?? '#000000', width },
                })
              }
            />
          </Section>
        </>
      );
    }
    case 'image':
    case 'svg': {
      const set = (
        patch: Partial<
          Pick<ImageNode, 'assetId' | 'x' | 'y' | 'width' | 'height' | 'fit'>
        >,
      ) => update((n) => ({ ...n, ...patch }) as SceneNode);
      return (
        <Section title="Asset & geometry">
          <SelectField
            label="Asset"
            value={node.assetId}
            options={assetOptions}
            onChange={(assetId) => assetId && set({ assetId })}
          />
          {node.type === 'image' && (
            <SelectField
              label="Fit"
              value={node.fit}
              options={
                [
                  { value: 'contain' },
                  { value: 'cover' },
                  { value: 'fill' },
                  { value: 'none' },
                ] as const
              }
              onChange={(fit) => set({ fit })}
              allowEmpty="fill (default)"
            />
          )}
          <Row>
            <NumField
              label="X"
              value={node.x}
              onChange={(x) => set({ x: x ?? 0 })}
            />
            <NumField
              label="Y"
              value={node.y}
              onChange={(y) => set({ y: y ?? 0 })}
            />
          </Row>
          <Row>
            <NumField
              label="Width"
              value={node.width}
              onChange={(width) => set({ width: width ?? 0 })}
            />
            <NumField
              label="Height"
              value={node.height}
              onChange={(height) => set({ height: height ?? 0 })}
            />
          </Row>
        </Section>
      );
    }
    case 'line': {
      const set = (patch: Partial<LineNode>) =>
        update((n) => ({ ...(n as LineNode), ...patch }));
      return (
        <Section title="Line">
          <Row>
            <NumField
              label="X1"
              value={node.x1}
              onChange={(x1) => set({ x1: x1 ?? 0 })}
            />
            <NumField
              label="Y1"
              value={node.y1}
              onChange={(y1) => set({ y1: y1 ?? 0 })}
            />
          </Row>
          <Row>
            <NumField
              label="X2"
              value={node.x2}
              onChange={(x2) => set({ x2: x2 ?? 0 })}
            />
            <NumField
              label="Y2"
              value={node.y2}
              onChange={(y2) => set({ y2: y2 ?? 0 })}
            />
          </Row>
          <ColorField
            label="Stroke color"
            value={node.stroke.color}
            onChange={(color) => set({ stroke: { ...node.stroke, color } })}
          />
          <NumField
            label="Stroke width"
            value={node.stroke.width}
            onChange={(width) =>
              set({ stroke: { ...node.stroke, width: width ?? 1 } })
            }
          />
        </Section>
      );
    }
    case 'text':
      return <TextFields node={node} update={update} />;
    case 'badge':
      return <BadgeFields node={node} update={update} />;
    case 'group':
      return (
        <Section title="Group layout">
          <SelectField
            label="Mode"
            value={node.layout?.mode}
            options={
              [
                { value: 'free' },
                { value: 'vertical' },
                { value: 'horizontal' },
              ] as const
            }
            allowEmpty="free (default)"
            onChange={(mode) =>
              update(
                (n) =>
                  ({
                    ...n,
                    layout: { ...(n as typeof node).layout, mode },
                  }) as SceneNode,
              )
            }
          />
          <NumField
            label="Gap"
            value={node.layout?.gap}
            onChange={(gap) =>
              update(
                (n) =>
                  ({
                    ...n,
                    layout: { ...(n as typeof node).layout, gap },
                  }) as SceneNode,
              )
            }
          />
        </Section>
      );
    default:
      return null;
  }
}

function StyleFields({
  style,
  onChange,
}: {
  style: TextStyle;
  onChange: (style: TextStyle) => void;
}) {
  const set = (patch: Partial<TextStyle>) => onChange({ ...style, ...patch });
  return (
    <Section title="Text style">
      <Row>
        <TextField
          label="Font family"
          value={style.fontFamily}
          onChange={(fontFamily) => set({ fontFamily })}
        />
        <NumField
          label="Size"
          value={style.fontSize}
          onChange={(fontSize) => set({ fontSize: fontSize ?? 12 })}
        />
      </Row>
      <Row>
        <SelectField
          label="Weight"
          value={
            style.fontWeight === undefined
              ? undefined
              : String(style.fontWeight)
          }
          options={[
            'normal',
            'bold',
            '300',
            '400',
            '500',
            '600',
            '700',
            '800',
          ].map((value) => ({ value }))}
          allowEmpty="normal (default)"
          onChange={(weight) =>
            set({
              fontWeight:
                weight === undefined
                  ? undefined
                  : /^\d+$/.test(weight)
                    ? Number(weight)
                    : (weight as 'normal' | 'bold'),
            })
          }
        />
        <NumField
          label="Line height"
          step={0.05}
          value={style.lineHeight}
          onChange={(lineHeight) => set({ lineHeight })}
        />
      </Row>
      <ColorField
        label="Color"
        value={style.color}
        onChange={(color) => set({ color })}
      />
      <Row>
        <SelectField
          label="Align"
          value={style.align}
          options={
            [
              { value: 'left' },
              { value: 'center' },
              { value: 'right' },
            ] as const
          }
          allowEmpty="left (default)"
          onChange={(align) => set({ align })}
        />
        <SelectField
          label="V-align"
          value={style.valign}
          options={
            [
              { value: 'top' },
              { value: 'middle' },
              { value: 'bottom' },
            ] as const
          }
          allowEmpty="top (default)"
          onChange={(valign) => set({ valign })}
        />
      </Row>
      <Row>
        <NumField
          label="Letter spacing"
          step={0.5}
          value={style.letterSpacing}
          onChange={(letterSpacing) => set({ letterSpacing })}
        />
        <Field label="Uppercase">
          <Switch
            checked={style.uppercase === true}
            onCheckedChange={(uppercase: boolean) =>
              set({ uppercase: uppercase || undefined })
            }
          />
        </Field>
      </Row>
    </Section>
  );
}

function BoxFields({
  box,
  onChange,
}: {
  box: { x: number; y: number; width: number; height: number };
  onChange: (box: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
}) {
  return (
    <Section title="Box">
      <Row>
        <NumField
          label="X"
          value={box.x}
          onChange={(x) => onChange({ ...box, x: x ?? 0 })}
        />
        <NumField
          label="Y"
          value={box.y}
          onChange={(y) => onChange({ ...box, y: y ?? 0 })}
        />
      </Row>
      <Row>
        <NumField
          label="Width"
          value={box.width}
          onChange={(width) => onChange({ ...box, width: width ?? 0 })}
        />
        <NumField
          label="Height"
          value={box.height}
          onChange={(height) => onChange({ ...box, height: height ?? 0 })}
        />
      </Row>
    </Section>
  );
}

function TextFields({
  node,
  update,
}: {
  node: TextNode;
  update: (fn: (n: SceneNode) => SceneNode) => void;
}) {
  const set = (patch: Partial<TextNode>) =>
    update((n) => ({ ...(n as TextNode), ...patch }));
  return (
    <>
      <Section title="Binding">
        <TextField
          label="String key (bind)"
          value={node.bind}
          onChange={(bind) => set({ bind })}
        />
        <TextField
          label="Fallback text"
          value={node.fallbackText}
          onChange={(fallbackText) =>
            set({ fallbackText: fallbackText || undefined })
          }
        />
      </Section>
      <BoxFields box={node.box} onChange={(box) => set({ box })} />
      <StyleFields style={node.style} onChange={(style) => set({ style })} />
      <Section title="Fit & wrap">
        <SelectField
          label="Fit mode"
          value={node.fit?.mode}
          options={
            [
              { value: 'none' },
              { value: 'shrink' },
              { value: 'resize-box' },
              { value: 'ellipsis' },
            ] as const
          }
          allowEmpty="none (default)"
          onChange={(mode) =>
            set({ fit: mode === undefined ? undefined : { ...node.fit, mode } })
          }
        />
        <Row>
          <NumField
            label="Min font size"
            value={node.fit?.minFontSize}
            onChange={(minFontSize) =>
              set({ fit: { mode: 'shrink', ...node.fit, minFontSize } })
            }
          />
          <NumField
            label="Step"
            value={node.fit?.step}
            onChange={(step) =>
              set({ fit: { mode: 'shrink', ...node.fit, step } })
            }
          />
        </Row>
        <Row>
          <SelectField
            label="Wrap"
            value={node.wrap?.mode}
            options={
              [{ value: 'word' }, { value: 'char' }, { value: 'none' }] as const
            }
            allowEmpty="word (default)"
            onChange={(mode) =>
              set({
                wrap: mode === undefined ? undefined : { ...node.wrap, mode },
              })
            }
          />
          <NumField
            label="Max lines"
            value={node.wrap?.maxLines}
            onChange={(maxLines) =>
              set({ wrap: { mode: 'word', ...node.wrap, maxLines } })
            }
          />
        </Row>
      </Section>
    </>
  );
}

function BadgeFields({
  node,
  update,
}: {
  node: BadgeNode;
  update: (fn: (n: SceneNode) => SceneNode) => void;
}) {
  const set = (patch: Partial<BadgeNode>) =>
    update((n) => ({ ...(n as BadgeNode), ...patch }));
  return (
    <>
      <Section title="Badge">
        <TextField
          label="Text (@key for localized)"
          value={node.text}
          onChange={(text) => set({ text })}
        />
        <ColorField
          label="Background"
          value={node.background.fill}
          onChange={(fill) => set({ background: { ...node.background, fill } })}
        />
        <NumField
          label="Background radius"
          value={node.background.radius}
          onChange={(radius) =>
            set({ background: { ...node.background, radius: radius ?? 0 } })
          }
        />
      </Section>
      <BoxFields box={node.box} onChange={(box) => set({ box })} />
      <StyleFields style={node.style} onChange={(style) => set({ style })} />
    </>
  );
}

function PatchSection({
  doc,
  node,
  locale,
  dispatch,
}: {
  doc: EditorDoc;
  node: SceneNode;
  locale: string;
  dispatch: Dispatch;
}) {
  const override: PatchNodeOverride = doc.patches[locale]?.nodes[node.id] ?? {};
  const hasOverride = Object.keys(override).length > 0;
  const set = (next: PatchNodeOverride) => {
    const cleaned = Object.fromEntries(
      Object.entries(next).filter(([, v]) => v !== undefined),
    );
    dispatch({
      type: 'set-patch-override',
      locale,
      nodeId: node.id,
      override: cleaned,
    });
  };
  const supportsBox = node.type === 'text' || node.type === 'badge';
  return (
    <Section title={`Patch overrides — ${locale}`}>
      <p className="text-xs text-muted-foreground">
        Applied only when rendering “{locale}”. Base scene stays unchanged.
      </p>
      <SelectField
        label="Visibility"
        value={
          override.visible === undefined
            ? undefined
            : override.visible
              ? 'visible'
              : 'hidden'
        }
        options={[{ value: 'visible' }, { value: 'hidden' }] as const}
        allowEmpty="inherit"
        onChange={(value) =>
          set({
            ...override,
            visible: value === undefined ? undefined : value === 'visible',
          })
        }
      />
      <Row>
        <NumField
          label="Offset X"
          value={override.transform?.x}
          onChange={(x) =>
            set({ ...override, transform: { ...override.transform, x } })
          }
        />
        <NumField
          label="Offset Y"
          value={override.transform?.y}
          onChange={(y) =>
            set({ ...override, transform: { ...override.transform, y } })
          }
        />
      </Row>
      {supportsBox && (
        <Row>
          <NumField
            label="Box width"
            value={override.box?.width}
            onChange={(width) =>
              set({ ...override, box: { ...override.box, width } })
            }
          />
          <NumField
            label="Box height"
            value={override.box?.height}
            onChange={(height) =>
              set({ ...override, box: { ...override.box, height } })
            }
          />
        </Row>
      )}
      {supportsBox && (
        <ColorField
          label="Color override"
          value={override.style?.color}
          onChange={(color) =>
            set({ ...override, style: { ...override.style, color } })
          }
        />
      )}
      {hasOverride && (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            dispatch({
              type: 'set-patch-override',
              locale,
              nodeId: node.id,
              override: undefined,
            })
          }
        >
          Clear overrides for {locale}
        </Button>
      )}
    </Section>
  );
}
