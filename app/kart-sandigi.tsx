// Kart Sandığım: kaydedilen günün kartları (en yeni başta).
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '../src/components/Text';
import { Screen, Card } from '../src/components/ui';
import { StarOrnament } from '../src/components/Icons';
import { colors, fonts } from '../src/theme';
import { kartById, Kart, KartTur, useKartlar } from '../src/lib/kartlar';
import { t } from '../src/i18n';

const TUR_AD: Record<KartTur, string> = { ayet: 'Ayet', hadis: 'Hadis', dua: 'Dua' };

export default function KartSandigi() {
  const s = useKartlar();
  const list = s.sandik.map((id) => kartById(id)).filter((k): k is Kart => !!k);

  return (
    <Screen title={t('Kart Sandığım')}>
      {list.length === 0 ? (
        <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
          <StarOrnament size={34} />
          <Text style={st.bos}>{t('Henüz kart kaydetmediniz. Açtığınız kartı “Kart Sandığına kaydet” ile buraya ekleyebilirsiniz.')}</Text>
        </Card>
      ) : (
        <Card style={{ padding: 0, paddingHorizontal: 14 }}>
          {list.map((k, i) => (
            <Pressable
              key={k.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/kart', params: { id: k.id } })}
              style={[st.row, i < list.length - 1 && st.divider]}
            >
              <Text style={st.tur}>{t(TUR_AD[k.tur])}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={st.metin} numberOfLines={2}>{k.metin}</Text>
                <Text style={st.kaynak}>{k.kaynak}</Text>
              </View>
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 70, paddingVertical: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  tur: { width: 52, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.6, color: colors.goldText, textTransform: 'uppercase' },
  metin: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.ink },
  kaynak: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  bos: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.inkSoft, textAlign: 'center' },
});
