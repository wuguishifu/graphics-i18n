import { StyleSheet, Text, View } from 'react-native';
import type { LoadedGraphic } from './useLocalizedGraphic.js';

/**
 * Debug read-out (spec §9): which locale pack was used, whether a patch and
 * fallbacks applied, and any diagnostics collected during the build.
 */
export function DebugOverlay({ graphic }: { graphic: LoadedGraphic }) {
  const { meta } = graphic.effectiveScene;
  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Text style={styles.line}>
        locale: {meta.locale}
        {meta.usedFallbackLocale ? ` (fallback from "${meta.requestedLocale}")` : ''}
      </Text>
      <Text style={styles.line}>fallback: {meta.fallbackLocale}</Text>
      <Text style={styles.line}>patch: {meta.patchApplied ? 'applied' : 'none'}</Text>
      {graphic.diagnostics.map((diagnostic, index) => (
        <Text key={index} style={[styles.line, styles.warning]}>
          {diagnostic.code}: {diagnostic.message}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 4,
  },
  line: {
    color: '#ffffff',
    fontSize: 10,
  },
  warning: {
    color: '#ffcc66',
  },
});
