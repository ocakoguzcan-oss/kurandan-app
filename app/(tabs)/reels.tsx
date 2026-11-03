import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Card, Chip, Button } from '../../src/components/ui';
import { IconBack } from '../../src/components/Icons';
import { colors, fonts } from '../../src/theme';
import { fetchReels, filterReels, isReelsConfigured, Reel, ReelCategory, REEL_CATEGORIES, reelTitle } from '../../src/lib/reels';

const PROFILE_URL = 'https://www.instagram.com/kurandan.ai/';

export default function ReelsScreen() {
  const insets = useSafeAreaInsets();
  const [reels, setReels] = useState<Reel[]>([]);
  const [cat, setCat] = useState<ReelCategory>('tumu');
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [playing, setPlaying] = useState<Reel | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const r = await fetchReels();
    setReels(r.reels);
    setOffline(r.fromCache && isReelsConfigured());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const list = filterReels(reels, cat);

  const header = (
    <View style={{ gap: 16, marginBottom: 6 }}>
      <View style={st.head}>
        <Text style={st.title} accessibilityRole="header">Reels</Text>
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(PROFILE_URL)} style={st.follow}>
          <Text style={st.followText}>Takip et</Text>
        </Pressable>
      </View>
      <Card style={st.profile}>
        <Image source={require('../../assets/logo.png')} style={st.logo} />
        <View style={{ flexShrink: 1 }}>
          <Text style={st.handle}>kurandan.ai</Text>
          <Text style={st.muted}>
            {offline ? 'Bağlantı yok — son kaydedilen videolar gösteriliyor' : "Instagram'daki yeni videolar otomatik eklenir"}
          </Text>
        </View>
      </Card>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {REEL_CATEGORIES.map((c) => (
          <Chip key={c.id} label={c.label} selected={cat === c.id} onPress={() => setCat(c.id)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={[st.root, { paddingTop: insets.top + 12 }]}>
      <FlatList
        data={list}
        keyExtractor={(r) => r.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 14 }}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.green} />}
        ListEmptyComponent={
          loading ? null : (
            <Card style={{ gap: 10 }}>
              <Text style={st.emptyTitle}>{isReelsConfigured() ? 'Bu kategoride video yok' : 'Reels bağlantısı kurulmadı'}</Text>
              <Text style={st.muted}>
                {isReelsConfigured()
                  ? 'Videolar açıklamadaki #sure, #dua, #hadis etiketlerine göre gruplanır.'
                  : 'Instagram videolarının gelmesi için README’deki “Reels sunucusu” adımlarını tamamlayın.'}
              </Text>
              <Button variant="secondary" label="Instagram’da aç" onPress={() => Linking.openURL(PROFILE_URL)} />
            </Card>
          )
        }
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" accessibilityLabel={reelTitle(item)} onPress={() => setPlaying(item)} style={st.item}>
            <View style={st.thumbWrap}>
              <Image source={{ uri: item.thumbnailUrl }} style={st.thumb} />
              <View style={st.playDot}>
                <Text style={{ color: colors.paper, fontSize: 11 }}>▶</Text>
              </View>
            </View>
            <Text style={st.itemTitle} numberOfLines={2}>{reelTitle(item)}</Text>
          </Pressable>
        )}
      />
      <Modal visible={!!playing} animationType="slide" onRequestClose={() => setPlaying(null)}>
        {playing && <Player reel={playing} onClose={() => setPlaying(null)} />}
      </Modal>
    </View>
  );
}

function Player({ reel, onClose }: { reel: Reel; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(reel.videoUrl, (p) => {
    p.loop = true;
    p.play();
  });
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls />
      <View style={[st.playerBar, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Kapat" onPress={onClose} style={st.closeBtn}>
          <IconBack color={colors.paper} />
        </Pressable>
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(reel.permalink)} style={st.follow}>
          <Text style={st.followText}>Instagram’da aç</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.green },
  follow: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.green, justifyContent: 'center' },
  followText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.paper },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  logo: { width: 48, height: 46, resizeMode: 'contain' },
  handle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  muted: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  item: { flex: 1, gap: 6 },
  thumbWrap: { height: 220, borderRadius: 16, overflow: 'hidden', backgroundColor: '#EFE4CB', borderWidth: 1, borderColor: colors.buttonBorder },
  thumb: { width: '100%', height: '100%' },
  playDot: {
    position: 'absolute', right: 8, bottom: 8, width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(24,88,60,0.92)', alignItems: 'center', justifyContent: 'center',
  },
  itemTitle: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 17, color: colors.ink },
  playerBar: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
});
