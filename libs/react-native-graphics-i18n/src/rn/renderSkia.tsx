import { Canvas, Fill, Group } from '@shopify/react-native-skia';
import type { EffectiveScene } from '@wuguishifu/core';
import { drawDebugBounds, drawNode, type RenderResources } from './drawNode.js';

export type GraphicCanvasProps = {
  scene: EffectiveScene;
  resources: RenderResources;
  /** Display size in dp; the scene is scaled from canvas coordinates. */
  width: number;
  height: number;
  debug?: boolean;
};

/** Stage 5 (spec §4.2): draw the effective scene onto a Skia canvas. */
export function GraphicCanvas({ scene, resources, width, height, debug }: GraphicCanvasProps) {
  const sx = width / scene.canvas.width;
  const sy = height / scene.canvas.height;
  return (
    <Canvas style={{ width, height }}>
      {scene.canvas.background !== undefined && <Fill color={scene.canvas.background} />}
      <Group matrix={[sx, 0, 0, 0, sy, 0, 0, 0, 1]}>
        {scene.nodes.map((node) => drawNode(node, resources))}
        {debug && scene.nodes.map((node) => drawDebugBounds(node))}
      </Group>
    </Canvas>
  );
}
