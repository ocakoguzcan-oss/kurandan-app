// Story görselleri için içerikler, renk paletleri ve desenler.
// Not: Ayet mealleri Diyanet mealine yakın, hadislerin kaynakları belirtilmiştir.

export type Konu = 'cuma' | 'kandil' | 'bayram';
export type IcerikTuru = 'ayet' | 'hadis' | 'soz' | 'serbest';
export type Icerik = { metin: string; kaynak?: string };

export const KONULAR: { id: Konu; ad: string; baslik: string; arabic: string }[] = [
  { id: 'cuma', ad: 'Cuma', baslik: 'Hayırlı Cumalar', arabic: 'جُمُعَة مُبَارَكَة' },
  { id: 'kandil', ad: 'Kandil', baslik: 'Kandiliniz Mübarek Olsun', arabic: 'لَيْلَة مُبَارَكَة' },
  { id: 'bayram', ad: 'Bayram', baslik: 'Bayramınız Mübarek Olsun', arabic: 'عِيدٌ مُبَارَكٌ' },
];

export const ICERIK_TURLERI: { id: IcerikTuru; ad: string }[] = [
  { id: 'soz', ad: 'Söz' },
  { id: 'ayet', ad: 'Ayet' },
  { id: 'hadis', ad: 'Hadis' },
  { id: 'serbest', ad: 'Kendi yazım' },
];

export const ICERIKLER: Record<Konu, Record<Exclude<IcerikTuru, 'serbest'>, Icerik[]>> = {
  cuma: {
    soz: [
      { metin: 'Bizi eğilirken görmek isteyenler Cuma’ya gelsin.' },
      { metin: 'Secdeye eğilen baş, kimsenin önünde eğilmez.' },
      { metin: 'Haftanın en güzel buluşması: Cuma namazında saf saf, omuz omuza.' },
      { metin: 'Cuma; kalplerin arındığı, duaların yükseldiği gündür.' },
      { metin: 'Bugün duaların kabul olduğu saati gizleyen gün. Dilinden dua eksik olmasın.' },
      { metin: 'Rabbim bu mübarek Cuma hürmetine kalbimize huzur, evimize bereket versin.' },
      { metin: 'Bir hafta yorulan gönüllere Cuma bir nefestir.' },
      { metin: 'Ezan okunur, işler bırakılır. Çünkü Cuma’nın çağrısı her şeyden önce gelir.' },
      { metin: 'Dualarınızda bizi de unutmayın.' },
      { metin: 'Cuma’nın bereketi evinizden, duanın sıcaklığı gönlünüzden eksik olmasın.' },
      { metin: 'Salavatla süslenen bir Cuma, gönle nur katar.' },
      { metin: 'Allah’ım! Bu Cuma’yı günahlarımıza kefaret, dualarımıza kabul vesilesi eyle.' },
      { metin: 'Kehf’i oku, salavatı çoğalt, duayı unutma. Cuma bu.' },
      { metin: 'Saflar sıklaşsın, kalpler birleşsin.' },
      { metin: 'Cuma: Rabbimizin kapısında haftalık buluşma.' },
      { metin: 'Bugün bir dua et; birinin derdine derman olsun.' },
      { metin: 'Cami avlusunda bir selam, gönülde bin huzur.' },
      { metin: 'Bu Cuma, gönlünü kırdığın birine bir selam ver.' },
      { metin: 'Ellerimiz semaya, gönlümüz Rabbimize açık.' },
      { metin: 'Koşun Allah’ı anmaya; dünya bekler, Cuma beklemez.' },
      { metin: 'Alnımız secdede, umudumuz Rabbimizde.' },
      { metin: 'Mübarek Cuma’nız hayırlara vesile olsun.' },
    ],
    ayet: [
      { metin: 'Ey iman edenler! Cuma günü namaz için çağrıldığınızda Allah’ı anmaya koşun ve alışverişi bırakın.', kaynak: 'Cuma Suresi, 9' },
      { metin: 'Namaz kılınınca yeryüzüne dağılın, Allah’ın lütfundan rızık arayın ve Allah’ı çok anın ki kurtuluşa eresiniz.', kaynak: 'Cuma Suresi, 10' },
      { metin: 'Bilesiniz ki kalpler ancak Allah’ı anmakla huzur bulur.', kaynak: 'Ra‘d Suresi, 28' },
      { metin: 'Beni anın ki ben de sizi anayım. Bana şükredin, nankörlük etmeyin.', kaynak: 'Bakara Suresi, 152' },
      { metin: 'Şüphesiz güçlükle beraber bir kolaylık vardır.', kaynak: 'İnşirâh Suresi, 6' },
      { metin: 'Allah ve melekleri Peygamber’e salât eder. Ey iman edenler! Siz de ona salât ve selâm edin.', kaynak: 'Ahzâb Suresi, 56' },
    ],
    hadis: [
      { metin: 'Üzerine güneş doğan en hayırlı gün Cuma günüdür.', kaynak: 'Müslim, Cuma 17' },
      { metin: 'Cuma günü bana çokça salavat getirin; çünkü sizin salavatınız bana arz olunur.', kaynak: 'Ebû Dâvûd, Salât 207' },
      { metin: 'Cuma gününde bir saat vardır ki, Müslüman kul ona denk gelip Allah’tan bir hayır dilerse Allah onu mutlaka verir.', kaynak: 'Buhârî, Cuma 37' },
      { metin: 'Kim Cuma günü Kehf Suresi’ni okursa, iki Cuma arası onun için nurla aydınlanır.', kaynak: 'Hâkim, Müstedrek' },
      { metin: 'Beş vakit namaz ve bir Cuma’dan diğer Cuma’ya, büyük günahlardan sakınıldıkça aralarındaki günahlara kefarettir.', kaynak: 'Müslim, Tahâret 16' },
    ],
  },
  kandil: {
    soz: [
      { metin: 'Bu mübarek gece dualarımız kabul, gönüllerimiz huzurla dolsun.' },
      { metin: 'Kandil gecesi bir dua da sevdiklerin için et.' },
      { metin: 'Rabbim bu gecenin hürmetine bizleri affına, rahmetine ve bereketine mazhar eylesin.' },
      { metin: 'Gece mübarek, kapı açık, Rab affedici. Yeter ki el açılsın.' },
      { metin: 'Kandilinizi tebrik eder, dualarınızı beklerim.' },
    ],
    ayet: [
      { metin: 'Kullarım beni senden sorarsa, ben çok yakınım. Bana dua ettiğinde dua edenin duasına karşılık veririm.', kaynak: 'Bakara Suresi, 186' },
      { metin: 'Rabbiniz şöyle buyurdu: Bana dua edin, size karşılık vereyim.', kaynak: 'Mü’min Suresi, 60' },
      { metin: 'Allah’ın rahmetinden ümit kesmeyin. Şüphesiz Allah bütün günahları bağışlar.', kaynak: 'Zümer Suresi, 53' },
    ],
    hadis: [
      { metin: 'Dua ibadetin ta kendisidir.', kaynak: 'Tirmizî, Tefsîr 2' },
      { metin: 'Allah’ım! Sen affedicisin, affetmeyi seversin; beni de affet.', kaynak: 'Tirmizî, Daavât 84' },
    ],
  },
  bayram: {
    soz: [
      { metin: 'Bayramınız sevdiklerinizle, sofralarınız bereketle dolsun.' },
      { metin: 'Kırgınlıkların unutulduğu, gönüllerin barıştığı nice bayramlara.' },
      { metin: 'Bu bayram bir büyüğün elini öp, bir küçüğün başını okşa.' },
      { metin: 'Rabbim bu bayramı İslam âlemine huzur ve birlik vesilesi eylesin.' },
      { metin: 'Bayramınız mübarek, dualarınız kabul olsun.' },
    ],
    ayet: [
      { metin: 'Sayılı günleri tamamlamanız ve size doğru yolu gösterdiği için Allah’ı yüceltmeniz ve şükretmeniz istenir.', kaynak: 'Bakara Suresi, 185' },
      { metin: 'Şüphesiz biz sana Kevser’i verdik. Öyleyse Rabbin için namaz kıl ve kurban kes.', kaynak: 'Kevser Suresi, 1-2' },
    ],
    hadis: [
      { metin: 'Her milletin bir bayramı vardır; bu da bizim bayramımızdır.', kaynak: 'Buhârî, Îdeyn 3' },
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
  { id: 'krem', ad: 'Krem', bg: ['#F6EEDC', '#EADBBE'], title: '#18583C', text: '#3B3A33', accent: '#A87628' },
  { id: 'zumrut', ad: 'Zümrüt', bg: ['#1F6B49', '#0D3A27'], title: '#F6EEDC', text: '#E6EFE7', accent: '#E2C27A' },
  { id: 'gece', ad: 'Gece', bg: ['#1B2A4A', '#0A1222'], title: '#F6EEDC', text: '#D9DEEA', accent: '#E2C27A' },
  { id: 'gunbatimi', ad: 'Gün batımı', bg: ['#F3B562', '#C8553D', '#5B2A4E'], title: '#FFF7E8', text: '#FFEFD9', accent: '#FFE2A8' },
  { id: 'altin', ad: 'Altın', bg: ['#E7C877', '#B58A33'], title: '#2A1E07', text: '#3A2C10', accent: '#0F3D29' },
  { id: 'bordo', ad: 'Bordo', bg: ['#7A1F2B', '#3B0D15'], title: '#FCEFD9', text: '#F2DCD9', accent: '#E2C27A' },
  { id: 'mor', ad: 'Mor gece', bg: ['#4B2A6B', '#1C0F2E'], title: '#F5ECFF', text: '#E4D8F2', accent: '#E2C27A' },
  { id: 'tan', ad: 'Tan vakti', bg: ['#BFD7EA', '#F7E3C9'], title: '#1B3A5B', text: '#2E3B48', accent: '#A87628' },
];

export type Desen = 'yok' | 'yildiz' | 'kemer' | 'hilal' | 'cami' | 'kafes' | 'isik';
export const DESENLER: { id: Desen; ad: string }[] = [
  { id: 'yok', ad: 'Sade' },
  { id: 'yildiz', ad: 'Yıldız' },
  { id: 'kemer', ad: 'Mihrap' },
  { id: 'hilal', ad: 'Hilal' },
  { id: 'cami', ad: 'Cami' },
  { id: 'kafes', ad: 'Kafes' },
  { id: 'isik', ad: 'Işık' },
];

export type YaziTipi = 'serif' | 'sans' | 'arabic';
export const YAZI_TIPLERI: { id: YaziTipi; ad: string }[] = [
  { id: 'serif', ad: 'Klasik' },
  { id: 'sans', ad: 'Modern' },
  { id: 'arabic', ad: 'Hat' },
];

export const YAZI_RENKLERI = ['auto', '#FFFFFF', '#F6EEDC', '#E2C27A', '#18583C', '#1F2A24'];

/** Bu haftanın (ya da bugünün) Cuma günü. */
export function nextFriday(from: Date = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7));
  return d;
}
