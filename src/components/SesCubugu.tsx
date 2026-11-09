// Kademeli kaydırma çubuğu (ses seviyesi). Sürükleyerek ya da dokunarak seçilir; parmak kalkınca
// onRelease çağrılır (önizleme orada çalınır). VoiceOver'da yukarı/aşağı kaydırma ile ayarlanır.
import React, { useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

const KNOB = 28;

export function SesCubugu({
  steps,
  value,
  onChange,
  onRelease,
  label,
}: {
  steps: number;
  value: number;
  onChange: (i: number) => void;
  onRelease?: (i: number) => void;
  label: string;
}) {
  const [w, setW] = useState(0);
  const wRef = useRef(0);
  const cur = useRef(value);
  cur.current = value;
  const cb = useRef({ onChange, onRelease });
  cb.current = { onChange, onRelease };

  const idxAt = (x: number) => {
    const usable = Math.max(1, wRef.current - KNOB);
    const r = Math.min(1, Math.max(0, (x - KNOB / 2) / usable));
    return Math.round(r * (steps - 1));
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const i = idxAt(e.nativeEvent.locationX);
        if (i !== cur.current) cb.current.onChange(i);
      },
      onPanResponderMove: (e) => {
        const i = idxAt(e.nativeEvent.locationX);
        if (i !== cur.current) cb.current.onChange(i);
      },
      onPanResponderRelease: () => cb.current.onRelease?.(cur.current),
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    wRef.current = e.nativeEvent.layout.width;
    setW(e.nativeEvent.layout.width);
  };

  const usable = Math.max(0, w - KNOB);
  const left = steps > 1 ? (value / (steps - 1)) * usable : 0;

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 1, max: steps, now: value + 1 }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const i = e.nativeEvent.actionName === 'increment' ? Math.min(steps - 1, value + 1) : Math.max(0, value - 1);
        if (i !== value) {
          onChange(i);
          onRelease?.(i);
        }
      }}
      onLayout={onLayout}
      style={st.wrap}
      {...pan.panHandlers}
    >
      <View pointerEvents="none" style={st.track}>
        <View style={[st.fill, { width: left + KNOB / 2 }]} />
      </View>
      {Array.from({ length: steps }).map((_, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[st.tick, { left: KNOB / 2 - 2 + (steps > 1 ? (i / (steps - 1)) * usable : 0) }, i <= value && st.tickOn]}
        />
      ))}
      <View pointerEvents="none" style={[st.knob, { left }]} />
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { height: 44, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.toggleOff, marginHorizontal: KNOB / 2, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.green, marginLeft: -KNOB / 2 },
  tick: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: colors.paper, top: 20 },
  tickOn: { backgroundColor: colors.paper },
  knob: {
    position: 'absolute',
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.green,
    top: 8,
  },
});
