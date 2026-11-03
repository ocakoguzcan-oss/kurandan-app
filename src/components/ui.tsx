import React from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { Text } from './Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts, radius } from '../theme';
import { IconBack } from './Icons';

export function Screen({
  title,
  back = true,
  right,
  scroll = true,
  children,
  contentStyle,
}: {
  title?: string;
  back?: boolean;
  right?: React.ReactNode;
  scroll?: boolean;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const header = title ? (
    <View style={s.header}>
      <View style={s.headerLeft}>
        {back && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Geri"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={s.roundBtn}
          >
            <IconBack />
          </Pressable>
        )}
        <Text style={s.title} accessibilityRole="header">{title}</Text>
      </View>
      {right}
    </View>
  ) : null;

  const pad = { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 };
  if (!scroll) {
    return (
      <View style={[s.root, pad, contentStyle]}>
        {header}
        {children}
      </View>
    );
  }
  return (
    <ScrollView style={s.root} contentContainerStyle={[pad, s.scrollContent, contentStyle]}>
      {header}
      {children}
    </ScrollView>
  );
}

export function RoundButton({ onPress, label, children }: { onPress: () => void; label: string; children: React.ReactNode }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.roundBtn}>
      {children}
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Eyebrow({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.eyebrow, style]}>{children}</Text>;
}

export function Chip({ label, selected, onPress, style }: { label: string; selected: boolean; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[s.chip, selected ? s.chipOn : s.chipOff, style]}
    >
      <Text style={[s.chipText, { color: selected ? colors.paper : colors.green }]}>{label}</Text>
    </Pressable>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={[s.track, { backgroundColor: value ? colors.green : colors.toggleOff, justifyContent: value ? 'flex-end' : 'flex-start' }]}
    >
      <View style={s.knob} />
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = variant === 'primary' ? s.btnPrimary : variant === 'secondary' ? s.btnSecondary : s.btnText;
  const color = variant === 'primary' ? colors.paper : colors.green;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.btn, v, { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }, style]}
    >
      {icon}
      <Text style={[s.btnLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  scrollContent: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 0 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.green, flexShrink: 1 },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.buttonBorder,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.lg, padding: 16 },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', color: colors.goldText },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  chipOn: { backgroundColor: colors.green, borderColor: colors.green },
  chipOff: { backgroundColor: colors.card, borderColor: colors.buttonBorder },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 13 },
  track: { width: 52, height: 32, borderRadius: 16, padding: 3, flexDirection: 'row' },
  knob: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.white, elevation: 2, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  btn: { minHeight: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
  btnPrimary: { backgroundColor: colors.green },
  btnSecondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.buttonBorder },
  btnText: { backgroundColor: 'transparent', minHeight: 44 },
  btnLabel: { fontFamily: fonts.bodySemi, fontSize: 14 },
});
