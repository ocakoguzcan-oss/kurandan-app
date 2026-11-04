import { tx } from '../i18n';

// Metinler Türkçe yazılır; ekranda ve görselde t() ile seçili dile çevrilir.
// Story görselleri için içerikler, renk paletleri ve desenler.
// Not: Ayet mealleri Diyanet mealine yakın, hadislerin kaynakları belirtilmiştir.

export type Konu = 'cuma' | 'kandil' | 'bayram';
export type IcerikTuru = 'ayet' | 'hadis' | 'soz' | 'serbest';
export type Icerik = { metin: string; kaynak?: string };

export const KONULAR: { id: Konu; ad: string; baslik: string; arabic: string }[] = [
  { id: 'cuma', ad: tx('Cuma'), baslik: tx('Hayırlı Cumalar'), arabic: 'جُمُعَة مُبَارَكَة' },
  { id: 'kandil', ad: tx('Kandil'), baslik: tx('Kandiliniz Mübarek Olsun'), arabic: 'لَيْلَة مُبَارَكَة' },
  { id: 'bayram', ad: tx('Bayram'), baslik: tx('Bayramınız Mübarek Olsun'), arabic: 'عِيدٌ مُبَارَكٌ' },
];

export const ICERIK_TURLERI: { id: IcerikTuru; ad: string }[] = [
  { id: 'soz', ad: tx('Söz') },
  { id: 'ayet', ad: tx('Ayet') },
  { id: 'hadis', ad: tx('Hadis') },
  { id: 'serbest', ad: tx('Kendi yazım') },
];

export const ICERIKLER: Record<Konu, Record<Exclude<IcerikTuru, 'serbest'>, Icerik[]>> = {
  cuma: {
    soz: [
      { metin: tx('Bizi eğilirken görmek isteyenler Cuma’ya gelsin.') },
      { metin: tx('Secdeye eğilen baş, kimsenin önünde eğilmez.') },
      { metin: tx('Haftanın en güzel buluşması: Cuma namazında saf saf, omuz omuza.') },
      { metin: tx('Cuma; kalplerin arındığı, duaların yükseldiği gündür.') },
      { metin: tx('Bugün duaların kabul olduğu saati gizleyen gün. Dilinden dua eksik olmasın.') },
      { metin: tx('Rabbim bu mübarek Cuma hürmetine kalbimize huzur, evimize bereket versin.') },
      { metin: tx('Bir hafta yorulan gönüllere Cuma bir nefestir.') },
      { metin: tx('Ezan okunur, işler bırakılır. Çünkü Cuma’nın çağrısı her şeyden önce gelir.') },
      { metin: tx('Dualarınızda bizi de unutmayın.') },
      { metin: tx('Cuma’nın bereketi evinizden, duanın sıcaklığı gönlünüzden eksik olmasın.') },
      { metin: tx('Salavatla süslenen bir Cuma, gönle nur katar.') },
      { metin: tx('Allah’ım! Bu Cuma’yı günahlarımıza kefaret, dualarımıza kabul vesilesi eyle.') },
      { metin: tx('Kehf’i oku, salavatı çoğalt, duayı unutma. Cuma bu.') },
      { metin: tx('Saflar sıklaşsın, kalpler birleşsin.') },
      { metin: tx('Cuma: Rabbimizin kapısında haftalık buluşma.') },
      { metin: tx('Bugün bir dua et; birinin derdine derman olsun.') },
      { metin: tx('Cami avlusunda bir selam, gönülde bin huzur.') },
      { metin: tx('Bu Cuma, gönlünü kırdığın birine bir selam ver.') },
      { metin: tx('Ellerimiz semaya, gönlümüz Rabbimize açık.') },
      { metin: tx('Koşun Allah’ı anmaya; dünya bekler, Cuma beklemez.') },
      { metin: tx('Alnımız secdede, umudumuz Rabbimizde.') },
      { metin: tx('Mübarek Cuma’nız hayırlara vesile olsun.') },
    ],
    ayet: [
      { metin: tx('Ey iman edenler! Cuma günü namaz için çağrıldığınızda Allah’ı anmaya koşun ve alışverişi bırakın.'), kaynak: tx('Cuma Suresi, 9') },
      { metin: tx('Namaz kılınınca yeryüzüne dağılın, Allah’ın lütfundan rızık arayın ve Allah’ı çok anın ki kurtuluşa eresiniz.'), kaynak: tx('Cuma Suresi, 10') },
      { metin: tx('Bilesiniz ki kalpler ancak Allah’ı anmakla huzur bulur.'), kaynak: tx('Ra‘d Suresi, 28') },
      { metin: tx('Beni anın ki ben de sizi anayım. Bana şükredin, nankörlük etmeyin.'), kaynak: tx('Bakara Suresi, 152') },
      { metin: tx('Şüphesiz güçlükle beraber bir kolaylık vardır.'), kaynak: tx('İnşirâh Suresi, 6') },
      { metin: tx('Allah ve melekleri Peygamber’e salât eder. Ey iman edenler! Siz de ona salât ve selâm edin.'), kaynak: tx('Ahzâb Suresi, 56') },
    ],
    hadis: [
      { metin: tx('Üzerine güneş doğan en hayırlı gün Cuma günüdür.'), kaynak: tx('Müslim, Cuma 17') },
      { metin: tx('Cuma günü bana çokça salavat getirin; çünkü sizin salavatınız bana arz olunur.'), kaynak: tx('Ebû Dâvûd, Salât 207') },
      { metin: tx('Cuma gününde bir saat vardır ki, Müslüman kul ona denk gelip Allah’tan bir hayır dilerse Allah onu mutlaka verir.'), kaynak: tx('Buhârî, Cuma 37') },
      { metin: tx('Kim Cuma günü Kehf Suresi’ni okursa, iki Cuma arası onun için nurla aydınlanır.'), kaynak: tx('Hâkim, Müstedrek') },
      { metin: tx('Beş vakit namaz ve bir Cuma’dan diğer Cuma’ya, büyük günahlardan sakınıldıkça aralarındaki günahlara kefarettir.'), kaynak: tx('Müslim, Tahâret 16') },
    ],
  },
  kandil: {
    soz: [
      { metin: tx('Bu mübarek gece dualarımız kabul, gönüllerimiz huzurla dolsun.') },
      { metin: tx('Kandil gecesi bir dua da sevdiklerin için et.') },
      { metin: tx('Rabbim bu gecenin hürmetine bizleri affına, rahmetine ve bereketine mazhar eylesin.') },
      { metin: tx('Gece mübarek, kapı açık, Rab affedici. Yeter ki el açılsın.') },
      { metin: tx('Kandilinizi tebrik eder, dualarınızı beklerim.') },
    ],
    ayet: [
      { metin: tx('Kullarım beni senden sorarsa, ben çok yakınım. Bana dua ettiğinde dua edenin duasına karşılık veririm.'), kaynak: tx('Bakara Suresi, 186') },
      { metin: tx('Rabbiniz şöyle buyurdu: Bana dua edin, size karşılık vereyim.'), kaynak: tx('Mü’min Suresi, 60') },
      { metin: tx('Allah’ın rahmetinden ümit kesmeyin. Şüphesiz Allah bütün günahları bağışlar.'), kaynak: tx('Zümer Suresi, 53') },
    ],
    hadis: [
      { metin: tx('Dua ibadetin ta kendisidir.'), kaynak: tx('Tirmizî, Tefsîr 2') },
      { metin: tx('Allah’ım! Sen affedicisin, affetmeyi seversin; beni de affet.'), kaynak: tx('Tirmizî, Daavât 84') },
    ],
  },
  bayram: {
    soz: [
      { metin: tx('Bayramınız sevdiklerinizle, sofralarınız bereketle dolsun.') },
      { metin: tx('Kırgınlıkların unutulduğu, gönüllerin barıştığı nice bayramlara.') },
      { metin: tx('Bu bayram bir büyüğün elini öp, bir küçüğün başını okşa.') },
      { metin: tx('Rabbim bu bayramı İslam âlemine huzur ve birlik vesilesi eylesin.') },
      { metin: tx('Bayramınız mübarek, dualarınız kabul olsun.') },
    ],
    ayet: [
      { metin: tx('Sayılı günleri tamamlamanız ve size doğru yolu gösterdiği için Allah’ı yüceltmeniz ve şükretmeniz istenir.'), kaynak: tx('Bakara Suresi, 185') },
      { metin: tx('Şüphesiz biz sana Kevser’i verdik. Öyleyse Rabbin için namaz kıl ve kurban kes.'), kaynak: tx('Kevser Suresi, 1-2') },
    ],
    hadis: [
      { metin: tx('Her milletin bir bayramı vardır; bu da bizim bayramımızdır.'), kaynak: tx('Buhârî, Îdeyn 3') },
    ],
  },
};

export type Palet = {
  id: string;
  ad: string;
  /** Arka plan geçişi: üstten alta renkler */
  bg: string[];
  title: string;
  text: string;
  accent: string;
};

export const PALETLER: Palet[] = [
  { id: 'krem', ad: tx('Krem'), bg: ['#F6EEDC', '#EADBBE'], title: '#18583C', text: '#3B3A33', accent: '#A87628' },
  { id: 'zumrut', ad: tx('Zümrüt'), bg: ['#1F6B49', '#0D3A27'], title: '#F6EEDC', text: '#E6EFE7', accent: '#E2C27A' },
  { id: 'gece', ad: tx('Gece'), bg: ['#1B2A4A', '#0A1222'], title: '#F6EEDC', text: '#D9DEEA', accent: '#E2C27A' },
  { id: 'gunbatimi', ad: tx('Gün batımı'), bg: ['#F3B562', '#C8553D', '#5B2A4E'], title: '#FFF7E8', text: '#FFEFD9', accent: '#FFE2A8' },
  { id: 'altin', ad: tx('Altın'), bg: ['#E7C877', '#B58A33'], title: '#2A1E07', text: '#3A2C10', accent: '#0F3D29' },
  { id: 'bordo', ad: tx('Bordo'), bg: ['#7A1F2B', '#3B0D15'], title: '#FCEFD9', text: '#F2DCD9', accent: '#E2C27A' },
  { id: 'mor', ad: tx('Mor gece'), bg: ['#4B2A6B', '#1C0F2E'], title: '#F5ECFF', text: '#E4D8F2', accent: '#E2C27A' },
  { id: 'tan', ad: tx('Tan vakti'), bg: ['#BFD7EA', '#F7E3C9'], title: '#1B3A5B', text: '#2E3B48', accent: '#A87628' },
];

export type Desen = 'yok' | 'yildiz' | 'kemer' | 'hilal' | 'cami' | 'kafes' | 'isik';
export const DESENLER: { id: Desen; ad: string }[] = [
  { id: 'yok', ad: tx('Sade') },
  { id: 'yildiz', ad: tx('Yıldız') },
  { id: 'kemer', ad: tx('Mihrap') },
  { id: 'hilal', ad: tx('Hilal') },
  { id: 'cami', ad: tx('Cami') },
  { id: 'kafes', ad: tx('Kafes') },
  { id: 'isik', ad: tx('Işık') },
];

export type YaziTipi = 'serif' | 'sans' | 'arabic';
export const YAZI_TIPLERI: { id: YaziTipi; ad: string }[] = [
  { id: 'serif', ad: tx('Klasik') },
  { id: 'sans', ad: tx('Modern') },
  { id: 'arabic', ad: tx('Hat') },
];

export const YAZI_RENKLERI = ['auto', '#FFFFFF', '#F6EEDC', '#E2C27A', '#18583C', '#1F2A24'];

/** Bu haftanın (ya da bugünün) Cuma günü. */
export function nextFriday(from: Date = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7));
  return d;
}
