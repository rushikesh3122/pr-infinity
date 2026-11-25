import { createElement, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

/** Web build: an iframe shows the same invoice HTML, zoomed to fit the available width. */
export function InvoiceWebView({ html }: { html: string }) {
  const [width, setWidth] = useState(0);
  const zoom = width ? Math.min(1, width / 794) : 0.45;
  const fitted = html.replace('</head>', `<style>html { zoom: ${zoom.toFixed(4)}; }</style></head>`);
  return (
    <View style={{ flex: 1 }} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {createElement('iframe', { srcDoc: fitted, style: { border: 0, width: '100%', height: '100%', background: '#eef1f6' }, title: 'Invoice preview' })}
    </View>
  );
}
