import { LocalizedGraphic } from '@graphics-i18n/react-native';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const banner = require('../../assets/graphics/summer-promo.lpkg') as number;

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
  { code: 'ja', label: '日本語 (fallback)' },
];

export default function Index() {
  const { width } = useWindowDimensions();
  const [locale, setLocale] = useState('en');
  const [debug, setDebug] = useState(false);
  const [error, setError] = useState<string | undefined>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>LocalizedGraphic</Text>
        <Text style={styles.caption}>
          One .lpkg file, one shared scene — the locale below picks the strings,
          layout patch and asset overrides at render time.
        </Text>

        <LocalizedGraphic
          source={banner}
          locale={locale}
          width={width - 32}
          style={styles.graphic}
          debug={debug}
          onLoad={() => setError(undefined)}
          onError={(err) => setError(err.message)}
        />
        {error !== undefined && <Text style={styles.error}>{error}</Text>}

        <View style={styles.localeRow}>
          {LOCALES.map(({ code, label }) => (
            <Pressable
              key={code}
              onPress={() => setLocale(code)}
              style={[styles.pill, locale === code && styles.pillActive]}
            >
              <Text
                style={[
                  styles.pillLabel,
                  locale === code && styles.pillLabelActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.debugRow}>
          <Text style={styles.debugLabel}>Debug overlay</Text>
          <Switch value={debug} onValueChange={setDebug} />
        </View>

        <View style={styles.notes}>
          <Text style={styles.note}>
            • fr — longer title shrinks to fit, wider text box, blue logo (asset
            override), patched title color
          </Text>
          <Text style={styles.note}>
            • ar — RTL: text aligns right, patch mirrors the logo and accent bar
          </Text>
          <Text style={styles.note}>
            • ja — not in the package, falls back to en
          </Text>
          <Text style={styles.note}>
            • “terms” is only translated in en — other locales fall back per
            string (see debug overlay)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 16 },
  heading: { fontSize: 28, fontWeight: '700', color: '#0f172a' },
  caption: { fontSize: 15, lineHeight: 21, color: '#475569' },
  graphic: { borderRadius: 16, overflow: 'hidden' },
  error: { color: '#dc2626', fontSize: 14 },
  localeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
  },
  pillActive: { backgroundColor: '#1e1b4b' },
  pillLabel: { fontSize: 15, color: '#334155' },
  pillLabelActive: { color: '#ffffff', fontWeight: '600' },
  debugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  debugLabel: { fontSize: 15, color: '#334155' },
  notes: { gap: 6, paddingBottom: 32 },
  note: { fontSize: 13, lineHeight: 19, color: '#64748b' },
});
