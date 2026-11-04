// Tilavet oynatıcısı: satır satır ya da sayfa sayfa okur, okunan kelimeyi bildirir,
// sürekli modda sayfa bitince çevirme sesi çalıp sonraki sayfadan devam eder.
// Ekran kilitlenince / uygulamadan çıkınca: "Kilit ekranında dinleme" satın alındıysa okuma sürer
// ve kilit ekranında kontroller görünür; alınmadıysa okuma durur (kalınan yer saklanır).
import { AppState } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { buildChunks, chapterName, Chunk, getChapterAudio, getChapters, getPage, prefetchPages, QWord, TOTAL_PAGES } from './quran';
import { isPremium } from './premium';
import { t } from '../i18n';

export type PlayerMode = 'idle' | 'line' | 'word' | 'page';
export type PlayerState = {
  mode: PlayerMode;
  loading: boolean;
  page: number | null;
  line: number | null;
  wordId: number | null;
};

type Listener = (s: PlayerState) => void;

const TICK_MS = 80;
const KEEP_AWAKE_TAG = 'kurandan-tilavet';
const RECITER = 'Mahmud Halil el-Husarî';
const ARTWORK = 'https://raw.githubusercontent.com/ocakoguzcan-oss/kurandan-app/main/assets/icon.png';

class QuranPlayer {
  private player: AudioPlayer | null = null;
  private flip: AudioPlayer | null = null;
  private currentUrl: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private token = 0; // her yeni komut eski döngüleri iptal eder
  private listeners = new Set<Listener>();
  private onPageChange: ((page: number) => void) | null = null;
  state: PlayerState = { mode: 'idle', loading: false, page: null, line: null, wordId: null };
  /** Durdur'a basıldığında kalınan yer: Play'e tekrar basınca buradan devam edilir. */
  resume: { page: number; line: number } | null = null;
  private lineById = new Map<number, number>();
  private lockScreen = false;
  /** Ücretsiz sürümde ekran kilitlendiği için durduysa (Kur'an ekranı satın alma önerir) */
  stoppedByLock = false;

  constructor() {
    AppState.addEventListener('change', (s) => {
      if (s === 'background' && this.state.mode !== 'idle' && !isPremium()) {
        this.stoppedByLock = this.state.mode === 'page';
        this.stop();
      }
    });
  }

  private get inBackground() {
    return AppState.currentState !== 'active';
  }

  subscribe(l: Listener) {
    this.listeners.add(l);
    l(this.state);
    return () => {
      this.listeners.delete(l);
    };
  }

  /** Sürekli okumada sayfa değişince ekranın da o sayfaya geçmesi için. */
  setPageChangeHandler(fn: ((page: number) => void) | null) {
    this.onPageChange = fn;
  }

  private set(p: Partial<PlayerState>) {
    this.state = { ...this.state, ...p };
    this.listeners.forEach((l) => l(this.state));
  }

  private async ensurePlayer(url: string) {
    // Kilit ekranı kontrolleri için başka uygulamaların sesiyle karışmamalı
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: isPremium(), interruptionMode: 'doNotMix' }).catch(() => {});
    if (!this.player) {
      this.player = createAudioPlayer({ uri: url });
      this.currentUrl = url;
    } else if (this.currentUrl !== url) {
      this.player.replace({ uri: url });
      this.currentUrl = url;
    }
    const p = this.player;
    for (let i = 0; i < 150 && !p.isLoaded; i++) await sleep(100); // en fazla 15 sn
    return p;
  }

  private async playFlip() {
    try {
      if (!this.flip) this.flip = createAudioPlayer(require('../../assets/sounds/sayfa.wav'));
      await this.flip.seekTo(0);
      this.flip.play();
      await sleep(650);
    } catch {
      await sleep(300);
    }
  }

  /** Parçaları sırayla çalar; iptal edilirse ya da bitince döner. */
  private async playChunks(chunks: Chunk[], token: number): Promise<boolean> {
    for (const c of chunks) {
      if (token !== this.token) return false;
      const audio = await getChapterAudio(c.chapter);
      const p = await this.ensurePlayer(audio.url);
      if (token !== this.token) return false;
      await p.seekTo(c.startMs / 1000);
      p.play();
      const finished = await new Promise<boolean>((resolve) => {
        this.stopTimer();
        let stalled = 0;
        let last = -1;
        this.timer = setInterval(() => {
          if (token !== this.token) {
            this.stopTimer();
            resolve(false);
            return;
          }
          const ms = p.currentTime * 1000;
          const w = c.words.find((x) => ms >= x.start && ms < x.end);
          if (w && w.id !== this.state.wordId) {
            this.set({ wordId: w.id });
            const line = this.lineById.get(w.id);
            if (this.state.mode === 'page' && this.state.page && line) this.resume = { page: this.state.page, line };
          }
          // Dosya erken biterse ya da takılırsa sonsuza dek beklememek için
          stalled = Math.abs(ms - last) < 1 && !p.playing ? stalled + 1 : 0;
          last = ms;
          const atEnd = p.duration > 0 && ms >= p.duration * 1000 - 400;
          if (ms >= c.endMs - 30 || (stalled > 40 && atEnd)) {
            this.stopTimer();
            resolve(true);
          } else if (stalled > 25 && !p.isBuffering && this.state.mode === 'page' && this.lockScreen) {
            // Kilit ekranından duraklatıldı: okumayı bitir, kalınan yer saklı
            this.stopTimer();
            resolve(false);
          } else if (stalled > 150) {
            this.stopTimer();
            resolve(true);
          }
        }, TICK_MS);
      });
      if (!finished) return false;
    }
    return true;
  }

  private stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Yalnızca o satırı okur. */
  async playLine(page: number, line: number, words: QWord[]) {
    const token = ++this.token;
    this.set({ mode: 'line', loading: true, page, line, wordId: null });
    try {
      const chunks = await buildChunks(words.filter((w) => w.line === line), true);
      this.set({ loading: false });
      await this.playChunks(chunks, token);
    } catch {
      // ağ hatası: sessizce dur
    }
    if (token === this.token) {
      this.player?.pause();
      this.set({ mode: 'idle', loading: false, line: null, wordId: null });
    }
  }

  /** Yalnızca o kelimeyi okur (telaffuzu tekrar dinlemek için). */
  async playWord(page: number, word: QWord) {
    const token = ++this.token;
    this.set({ mode: 'word', loading: true, page, line: word.line, wordId: word.id });
    try {
      const chunks = await buildChunks([word], false);
      this.set({ loading: false });
      await this.playChunks(chunks, token);
    } catch {
      // ağ hatası: sessizce dur
    }
    if (token === this.token) {
      this.player?.pause();
      this.set({ mode: 'idle', loading: false, line: null, wordId: null });
    }
  }

  /** Sayfadan başlayıp Durdur'a basılana kadar okur. fromLine verilirse o satırdan başlar. */
  async playFrom(page: number, fromLine = 1) {
    const token = ++this.token;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    let current = page;
    let startLine = fromLine;
    while (token === this.token && current <= TOTAL_PAGES) {
      this.set({ mode: 'page', loading: true, page: current, line: null, wordId: null });
      prefetchPages(current + 1, 2);
      let ok = false;
      try {
        const pg = await getPage(current);
        this.lineById = new Map(pg.words.map((w) => [w.id, w.line]));
        this.resume = { page: current, line: startLine };
        const words = pg.words.filter((w) => w.line >= startLine);
        const chunks = await buildChunks(words, true);
        if (token !== this.token) break;
        this.set({ loading: false });
        this.showOnLockScreen(pg.firstChapter, current);
        ok = await this.playChunks(chunks, token);
      } catch {
        ok = false;
      }
      if (!ok || token !== this.token) break;
      if (current >= TOTAL_PAGES) break;
      // Ekran kapalıyken sesi kesmeden devam et (çevirme sesi yalnız ekran açıkken)
      if (!this.inBackground) {
        this.player?.pause();
        await this.playFlip();
      }
      if (token !== this.token) break;
      current += 1;
      startLine = 1;
      this.resume = { page: current, line: 1 };
      this.onPageChange?.(current);
    }
    if (token === this.token) this.finish();
  }

  stop() {
    this.token++;
    this.finish();
  }

  /** Satın alındıysa kilit ekranında sure adı, sayfa ve okuyan görünür. */
  private async showOnLockScreen(chapter: number, page: number) {
    if (!isPremium() || !this.player) return;
    let title = t('Sayfa {n}', { n: page });
    try {
      const ch = (await getChapters()).find((c) => c.id === chapter);
      if (ch) title = `${t('{sure} Suresi', { sure: chapterName(ch) })} · ${title}`;
    } catch {
      // sure adı alınamazsa yalnız sayfa
    }
    const meta = { title, artist: RECITER, albumTitle: t("Kur'an-ı Kerim"), artworkUrl: ARTWORK };
    try {
      if (!this.lockScreen) {
        this.player.setActiveForLockScreen(true, meta, { showSeekForward: false, showSeekBackward: false });
        this.lockScreen = true;
      } else this.player.updateLockScreenMetadata(meta);
    } catch {
      // eski derlemede kilit ekranı desteği yoksa sessizce geç
    }
  }

  private finish() {
    this.stopTimer();
    if (this.lockScreen) {
      try {
        this.player?.clearLockScreenControls();
      } catch {
        // yok say
      }
      this.lockScreen = false;
    }
    this.player?.pause();
    deactivateKeepAwake(KEEP_AWAKE_TAG);
    this.set({ mode: 'idle', loading: false, line: null, wordId: null });
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const quranPlayer = new QuranPlayer();
