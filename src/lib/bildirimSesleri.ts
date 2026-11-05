// Vakit bildirimi sesi: ezan (her vaktin kendi ezanı, Cuma öğlesinde salâ), telifsiz zil sesleri,
// telefonun kendi sesi ya da sessiz. Zil sesleri scripts/bildirim-sesleri.py ile sentezlendi.
// Bildirim sesleri uygulamayla yüklenir: yeni ses eklemek yeni mağaza sürümü gerektirir.
import { tx } from '../i18n';

export type SesId = 'ezan' | 'nur' | 'seher' | 'ney' | 'kanun' | 'damla' | 'varsayilan' | 'sessiz';

export type Ses = { id: SesId; ad: string; aciklama: string; dosya?: string; asset?: number };

export const SESLER: Ses[] = [
  { id: 'ezan', ad: tx('Ezan'), aciklama: tx('Her vaktin kendi ezanı · Cuma günü salâ') },
  { id: 'nur', ad: tx('Nur'), aciklama: tx('Yumuşak marimba ezgisi'), dosya: 'ses_nur.wav', asset: require('../../assets/sounds/ses_nur.wav') },
  { id: 'seher', ad: tx('Seher'), aciklama: tx('Sakin arp akoru'), dosya: 'ses_seher.wav', asset: require('../../assets/sounds/ses_seher.wav') },
  { id: 'ney', ad: tx('Ney'), aciklama: tx('Kısa ney ezgisi'), dosya: 'ses_ney.wav', asset: require('../../assets/sounds/ses_ney.wav') },
  { id: 'kanun', ad: tx('Kanun'), aciklama: tx('Kanun tellerinde kısa ezgi'), dosya: 'ses_kanun.wav', asset: require('../../assets/sounds/ses_kanun.wav') },
  { id: 'damla', ad: tx('Damla'), aciklama: tx('Su damlası sesi'), dosya: 'ses_damla.wav', asset: require('../../assets/sounds/ses_damla.wav') },
  { id: 'varsayilan', ad: tx('Telefonun sesi'), aciklama: tx('Telefonun standart bildirim sesi') },
  { id: 'sessiz', ad: tx('Sessiz'), aciklama: tx('Ses yok, yalnızca titreşim') },
];

export const sesById = (id: SesId) => SESLER.find((s) => s.id === id) ?? SESLER[0];
