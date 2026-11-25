import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../../theme';

/** Renders the invoice HTML scaled to the screen width (pinch to zoom). */
export function InvoiceWebView({ html }: { html: string }) {
  const [loading, setLoading] = useState(true);
  const [width, setWidth] = useState(0);
  // The template is laid out on a 794px A4 page; zoom it to the available width (pinch zoom still works).
  const zoom = width ? Math.min(1, width / 794) : 0.45;
  const fitted = html
    .replace('<meta name="viewport" content="width=794" />', '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />')
    .replace('</head>', `<style>html { zoom: ${zoom.toFixed(4)}; }</style></head>`);
  return (
    <View style={styles.flex} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <WebView
        originWhitelist={['*']}
        source={{ html: fitted }}
        style={styles.flex}
        key={Math.round(zoom * 1000)}
        setBuiltInZoomControls
        setDisplayZoomControls={false}
        javaScriptEnabled={false}
        onLoadEnd={() => setLoading(false)}
      />
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#eef1f6' },
  loader: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
