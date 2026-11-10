// Vakit bildirimi sesi: ezan (her vaktin kendi ezanı, Cuma öğlesinde salâ), zil sesleri,
// telefonun kendi sesi ya da sessiz. Zil sesleri scripts/zil-sesleri/ ile üretildi (VSCO-2 CE, CC0;
// kısa ezanlar kendi kayıtlarımızdan). 44,1 kHz IMA4 CAF, en fazla 30 sn (iOS sınırı).
// Bildirim sesleri uygulamayla yüklenir: yeni ses eklemek yeni mağaza sürümü gerektirir.
import { tx } from '../i18n';

export type SesId = 'ezan' | 'ney1' | 'k2' | 'k3' | 'k6' | 'k7' | 'kisa1' | 'kisa2' | 'kisa3' | 'kanun' | 'ruzgar' | 'melodi1' | 'melodi2' | 'melodi3' | 'saat' | 'dingdong' | 'uyan' | 'yuksek' | 'kus' | 'bip' | 'varsayilan' | 'sessiz';

export type Ses = { id: SesId; ad: string; aciklama: string; dosya?: string; asset?: number };

export const SESLER: Ses[] = [
  { id: 'ezan', ad: tx('Ezan'), aciklama: tx('Her vaktin kendi ezanı · Cuma günü salâ') },
  { id: 'ney1', ad: tx('Huzur'), aciklama: tx('Ney ezgisi'), dosya: 'ses_ney1.caf', asset: require('../../assets/sounds/ses_ney1.caf') },
  { id: 'k2', ad: tx('Allâhümme Salli 1'), aciklama: tx('Salavat ezgisi'), dosya: 'ses_k2.caf', asset: require('../../assets/sounds/ses_k2.caf') },
  { id: 'k3', ad: tx('Allâhümme Salli 2'), aciklama: tx('Sesli salavat'), dosya: 'ses_k3.caf', asset: require('../../assets/sounds/ses_k3.caf') },
  { id: 'k6', ad: tx('Kurandan Air'), aciklama: tx('Kısa iki notalı zil'), dosya: 'ses_k6.caf', asset: require('../../assets/sounds/ses_k6.caf') },
  { id: 'k7', ad: tx('Kurandan 1'), aciklama: tx('Kısa çan ezgisi'), dosya: 'ses_k7.caf', asset: require('../../assets/sounds/ses_k7.caf') },
  { id: 'kisa1', ad: tx('Kısa Ezan 1'), aciklama: tx('Tek “Allâhu ekber”'), dosya: 'ses_kisa1.caf', asset: require('../../assets/sounds/ses_kisa1.caf') },
  { id: 'kisa2', ad: tx('Kısa Ezan 2'), aciklama: tx('Ezanın başı, yatsı makamı'), dosya: 'ses_kisa2.caf', asset: require('../../assets/sounds/ses_kisa2.caf') },
  { id: 'kisa3', ad: tx('Kısa Ezan 3'), aciklama: tx('İlk iki tekbir, öğle makamı'), dosya: 'ses_kisa3.caf', asset: require('../../assets/sounds/ses_kisa3.caf') },
  { id: 'kanun', ad: tx('Kanun'), aciklama: tx('Hicaz makamında kısa taksim'), dosya: 'ses_kanun.caf', asset: require('../../assets/sounds/ses_kanun.caf') },
  { id: 'ruzgar', ad: tx('Rüzgâr Çanı'), aciklama: tx('Sakin, doğal çan sesi'), dosya: 'ses_ruzgar.caf', asset: require('../../assets/sounds/ses_ruzgar.caf') },
  { id: 'melodi1', ad: tx('Melodi 1'), aciklama: tx('Marimba ezgisi'), dosya: 'ses_melodi1.caf', asset: require('../../assets/sounds/ses_melodi1.caf') },
  { id: 'melodi2', ad: tx('Melodi 2'), aciklama: tx('Kanun ve çan'), dosya: 'ses_melodi2.caf', asset: require('../../assets/sounds/ses_melodi2.caf') },
  { id: 'melodi3', ad: tx('Melodi 3'), aciklama: tx('Yavaş piyano ezgisi'), dosya: 'ses_melodi3.caf', asset: require('../../assets/sounds/ses_melodi3.caf') },
  { id: 'saat', ad: tx('Masa Saati'), aciklama: tx('Saat melodisi ve üç vuruş'), dosya: 'ses_saat.caf', asset: require('../../assets/sounds/ses_saat.caf') },
  { id: 'dingdong', ad: tx('Ding Dong'), aciklama: tx('İki notalı çan'), dosya: 'ses_dingdong.caf', asset: require('../../assets/sounds/ses_dingdong.caf') },
  { id: 'uyan', ad: tx('Uyan'), aciklama: tx('Giderek yükselen, sabah için'), dosya: 'ses_uyan.caf', asset: require('../../assets/sounds/ses_uyan.caf') },
  { id: 'yuksek', ad: tx('Yüksek Ses'), aciklama: tx('Güçlü ve net çan'), dosya: 'ses_yuksek.caf', asset: require('../../assets/sounds/ses_yuksek.caf') },
  { id: 'kus', ad: tx('Kuş Sesi'), aciklama: tx('Kuş cıvıltısı'), dosya: 'ses_kus.caf', asset: require('../../assets/sounds/ses_kus.caf') },
  { id: 'bip', ad: tx('Bip'), aciklama: tx('Kısa sade uyarı'), dosya: 'ses_bip.caf', asset: require('../../assets/sounds/ses_bip.caf') },
  { id: 'varsayilan', ad: tx('Telefonun sesi'), aciklama: tx('Telefonun standart bildirim sesi') },
  { id: 'sessiz', ad: tx('Sessiz'), aciklama: tx('Ses yok, yalnızca titreşim') },
];

export const sesById = (id: SesId) => SESLER.find((s) => s.id === id) ?? SESLER[0];

/** Kayıtlı ses artık listede yoksa (eski sürümden kalan) geçerli bir sese çevirir */
export const gecerliSes = (id: string | undefined): SesId | undefined =>
  id && SESLER.some((s) => s.id === id) ? (id as SesId) : id ? 'kanun' : undefined;
