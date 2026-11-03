import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IlPicker } from '../src/components/IlPicker';
import { Button, s as ui } from '../src/components/ui';
import { IconPin } from '../src/components/Icons';
import { colors, fonts } from '../src/theme';
import { useApp } from '../src/context/AppContext';

export default function KonumScreen() {
  const insets = useSafeAreaInsets();
  const { place, setIl, locateWithGps } = useApp();
  const [busy, setBusy] = useState(false);

  const gps = async () => {
    setBusy(true);
    try {
      const ok = await locateWithGps();
      if (ok) router.back();
      else Alert.alert('Konum izni verilmedi', 'Listeden ilinizi seçebilirsiniz.');
    } catch {
      Alert.alert('Konum alınamadı', 'Lütfen listeden ilinizi seçin.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[ui.root, { paddingTop: insets.top + 12 }]}>
      <IlPicker
        selected={place.source === 'il' ? place.ilPlaka : undefined}
        onSelect={(il) => {
          setIl(il);
          router.back();
        }}
        header={
          <View style={{ gap: 12 }}>
            <View style={st.head}>
              <Text style={ui.title}>Konum</Text>
              <Button variant="text" label="Kapat" onPress={() => router.back()} />
            </View>
            <Text style={st.current}>{`Şu an: ${place.label}${place.source === 'gps' ? ' (GPS)' : ''}`}</Text>
            <Button label={busy ? 'Konum bulunuyor…' : 'Konumumu kullan'} icon={<IconPin color={colors.paper} />} disabled={busy} onPress={gps} />
          </View>
        }
      />
    </View>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  current: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
});
