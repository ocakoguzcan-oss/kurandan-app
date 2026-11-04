import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CityPicker, CountryList } from '../src/components/CityPicker';
import { Button, s as ui } from '../src/components/ui';
import { IconPin } from '../src/components/Icons';
import { colors, fonts } from '../src/theme';
import { useApp } from '../src/context/AppContext';
import { useTour } from '../src/tour/Tour';
import { getLang, t } from '../src/i18n';
import { countryName } from '../src/data/world';
import { utcLabel } from '../src/lib/tz';

export default function KonumScreen() {
  const insets = useSafeAreaInsets();
  const { place, setCity, locateWithGps } = useApp();
  const [busy, setBusy] = useState(false);
  const [country, setCountry] = useState(place.country);
  const [pickCountry, setPickCountry] = useState(false);
  const tour = useTour();

  const gps = async () => {
    setBusy(true);
    try {
      const ok = await locateWithGps();
      if (ok) {
        tour.cityChosen();
        router.back();
      } else Alert.alert(t('Konum izni verilmedi'), t('Listeden şehrinizi seçebilirsiniz.'));
    } catch {
      Alert.alert(t('Konum alınamadı'), t('Lütfen listeden şehrinizi seçin.'));
    } finally {
      setBusy(false);
    }
  };

  const head = (title: string, onClose: () => void, closeLabel: string) => (
    <View style={st.head}>
      <Text style={ui.title}>{title}</Text>
      <Button variant="text" label={closeLabel} onPress={onClose} />
    </View>
  );

  if (pickCountry) {
    return (
      <View style={[ui.root, { paddingTop: insets.top + 12 }]}>
        <CountryList
          selected={country}
          onSelect={(c) => {
            setCountry(c.c);
            setPickCountry(false);
          }}
          header={head(t('Ülke seç'), () => setPickCountry(false), t('Geri'))}
        />
      </View>
    );
  }

  return (
    <View style={[ui.root, { paddingTop: insets.top + 12 }]}>
      <CityPicker
        country={country}
        selectedId={place.source === 'il' ? place.cityId : undefined}
        onChangeCountry={() => setPickCountry(true)}
        onSelect={(c) => {
          setCity(c);
          tour.cityChosen();
          router.back();
        }}
        header={
          <View style={{ gap: 12 }}>
            {head(t('Konum'), () => router.back(), t('Kapat'))}
            <Text style={st.current}>
              {t('Şu an: {yer}', {
                yer: `${place.label}${place.source === 'gps' ? ' (GPS)' : ''} · ${countryName(place.country, getLang())} · ${utcLabel(place.tz)}`,
              })}
            </Text>
            <Button
              label={busy ? t('Konum bulunuyor…') : t('Konumumu kullan')}
              icon={<IconPin color={colors.paper} />}
              disabled={busy}
              onPress={gps}
            />
          </View>
        }
      />
    </View>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  current: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted },
});
