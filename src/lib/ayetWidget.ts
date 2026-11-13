// Ayet widget'ı (iOS kilit ekranı ve ana ekran): seçilmiş kısa ayetler meâliyle App Group'a yazılır;
// widget 40 saniyede bir sıradakini gösterir (iOS widget'ları kilit açılışında yenilenemez).
// Metinler Quran Foundation'dan (api.quran.com) seçili dilin mealiyle indirilir ve cihazda saklanır;
// her açılışta en fazla birkaç ayet indirilir, liste zamanla tamamlanır.
import { EzanNative } from '../../modules/ezan-native';
import { ayetOnbellekte, getAyet, getChapters } from './quran';
import { SURE_ADLARI } from '../data/sureler';
import { getLang, t } from '../i18n';

const APP_GROUP = 'group.ai.kurandan.app';

/** Kısa ve gönle dokunan ayetler (sure:ayet). Meali uzun olanlar widget'a sığmadığı için atlanır. */
export const AYET_ANAHTARLARI = [
  '2:152', '2:153', '2:186', '2:45', '2:155', '2:156', '2:216', '2:201', '2:286',
  '3:8', '3:139', '3:173', '3:185', '3:200', '3:31', '3:134',
  '4:28', '4:110', '5:2', '6:162', '6:54', '7:23', '7:56', '7:199', '8:46',
  '9:51', '9:40', '10:62', '11:115', '12:87', '13:11', '13:28', '14:7', '15:99',
  '16:97', '16:128', '17:24', '17:9', '18:10', '18:46', '20:25', '20:46', '20:114',
  '21:87', '23:118', '25:74', '26:80', '28:24', '29:45', '29:69', '30:21', '31:17',
  '33:41', '33:56', '35:15', '39:10', '39:53', '40:60', '41:30', '42:30', '48:4',
  '49:13', '50:16', '51:56', '52:48', '55:13', '57:4', '59:18', '64:16', '65:2', '65:3',
  '65:7', '67:2', '73:8', '89:27', '89:28', '93:3', '93:5', '94:5', '94:6', '96:1',
  '103:1', '112:1', '1:5', '2:255',
];

const MAX_MEAL = 230;
let calisiyor = false;

/** Eksik ayetleri indirir (en fazla `adet` tane) ve widget'a yazar. Uygulama açılışında çağrılır. */
export async function ayetWidgetGuncelle(adet = 12) {
  if (!EzanNative || calisiyor) return;
  calisiyor = true;
  try {
    const lang = getLang();
    const sureler = await getChapters().catch(() => []);
    const ad = (s: number) => {
      const c = sureler.find((x) => x.id === s);
      return lang === 'tr' ? SURE_ADLARI[s - 1] : c?.nameSimple ?? SURE_ADLARI[s - 1];
    };
    const list: { a: string; m: string; s: string }[] = [];
    let indirilen = 0;
    for (const k of AYET_ANAHTARLARI) {
      try {
        // Önbellekteyse ağa gitmez; değilse bu açılışta en fazla `adet` ayet indirilir
        let v = await ayetOnbellekte(k);
        if (!v && indirilen < adet) {
          indirilen++;
          v = await getAyet(k);
        }
        if (!v) continue;
        const meal = lang === 'ar' ? '' : v.meal;
        if (meal.length > MAX_MEAL) continue;
        const [s, a] = k.split(':').map(Number);
        list.push({ a: v.ar, m: meal, s: t('{sure}, {ayet}', { sure: ad(s), ayet: a }) });
      } catch {
        // internet yoksa sonraki açılışta
      }
    }
    if (list.length) EzanNative.setWidgetData(APP_GROUP, 'ayetler', JSON.stringify({ list, baslik: t('Günün Ayeti') }));
  } finally {
    calisiyor = false;
  }
}
