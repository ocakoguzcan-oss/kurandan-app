// Kur'an'dan dualar. Her gün sırayla bir tanesi "Günün Duası" olur.
// Not: Yayından önce Arapça metin, okunuş ve mealleri bir hocaya kontrol ettirin.
export type Dua = { arabic: string; okunus: string; meal: string; kaynak: string };

export const DUALAR: Dua[] = [
  {
    arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    okunus: 'Rabbenâ âtinâ fid-dünyâ haseneten ve fil-âhirati haseneten ve kınâ azâben-nâr.',
    meal: 'Rabbimiz! Bize dünyada da iyilik ver, ahirette de iyilik ver ve bizi ateş azabından koru.',
    kaynak: 'Bakara Suresi, 201',
  },
  {
    arabic: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ',
    okunus: 'Rabbenâ tekabbel minnâ inneke entes-semîul-alîm.',
    meal: 'Rabbimiz! Bizden kabul buyur. Şüphesiz sen hakkıyla işitensin, bilensin.',
    kaynak: 'Bakara Suresi, 127',
  },
  {
    arabic: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَدُنْكَ رَحْمَةً إِنَّكَ أَنْتَ الْوَهَّابُ',
    okunus: 'Rabbenâ lâ tuziğ kulûbenâ ba‘de iz hedeytenâ ve heb lenâ min ledünke rahmeh, inneke entel-vehhâb.',
    meal: 'Rabbimiz! Bizi doğru yola ilettikten sonra kalplerimizi kaydırma. Bize katından rahmet bağışla. Şüphesiz sen çok bağışlayansın.',
    kaynak: 'Âl-i İmrân Suresi, 8',
  },
  {
    arabic: 'رَبِّ زِدْنِي عِلْمًا',
    okunus: 'Rabbi zidnî ilmâ.',
    meal: 'Rabbim! İlmimi artır.',
    kaynak: 'Tâhâ Suresi, 114',
  },
  {
    arabic: 'رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
    okunus: 'Rabbirhamhumâ kemâ rabbeyânî sağîrâ.',
    meal: 'Rabbim! Küçüklüğümde onlar beni nasıl yetiştirdilerse, sen de onlara öyle merhamet et.',
    kaynak: 'İsrâ Suresi, 24',
  },
  {
    arabic: 'رَبَّنَا ظَلَمْنَا أَنْفُسَنَا وَإِنْ لَمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ',
    okunus: 'Rabbenâ zalemnâ enfusenâ ve in lem tağfir lenâ ve terhamnâ le nekûnenne minel-hâsirîn.',
    meal: 'Rabbimiz! Biz kendimize zulmettik. Eğer bizi bağışlamaz ve bize merhamet etmezsen mutlaka kaybedenlerden oluruz.',
    kaynak: 'A‘râf Suresi, 23',
  },
  {
    arabic: 'لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
    okunus: 'Lâ ilâhe illâ ente sübhâneke innî küntü minez-zâlimîn.',
    meal: 'Senden başka ilah yoktur. Seni tenzih ederim. Gerçekten ben kendine yazık edenlerden oldum.',
    kaynak: 'Enbiyâ Suresi, 87',
  },
  {
    arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا',
    okunus: 'Rabbenâ heb lenâ min ezvâcinâ ve zürriyyâtinâ kurrate a‘yünin vec‘alnâ lil-müttekîne imâmâ.',
    meal: 'Rabbimiz! Eşlerimizi ve çocuklarımızı bize göz aydınlığı kıl ve bizi takva sahiplerine önder eyle.',
    kaynak: 'Furkân Suresi, 74',
  },
  {
    arabic: 'رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِنْ ذُرِّيَّتِي رَبَّنَا وَتَقَبَّلْ دُعَاءِ',
    okunus: 'Rabbic‘alnî mukîmes-salâti ve min zürriyyetî, Rabbenâ ve tekabbel duâ.',
    meal: 'Rabbim! Beni ve soyumdan gelecekleri namazı devamlı kılanlardan eyle. Rabbimiz! Duamı kabul et.',
    kaynak: 'İbrâhîm Suresi, 40',
  },
  {
    arabic: 'رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ',
    okunus: 'Rabbenağfirlî ve li-vâlideyye ve lil-mü’minîne yevme yekûmul-hisâb.',
    meal: 'Rabbimiz! Hesap gününde beni, anne babamı ve bütün müminleri bağışla.',
    kaynak: 'İbrâhîm Suresi, 41',
  },
  {
    arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي',
    okunus: 'Rabbişrah lî sadrî ve yessir lî emrî.',
    meal: 'Rabbim! Göğsümü genişlet, işimi kolaylaştır.',
    kaynak: 'Tâhâ Suresi, 25-26',
  },
  {
    arabic: 'رَبِّ اغْفِرْ وَارْحَمْ وَأَنْتَ خَيْرُ الرَّاحِمِينَ',
    okunus: 'Rabbiğfir verham ve ente hayrur-râhimîn.',
    meal: 'Rabbim! Bağışla, merhamet et. Sen merhamet edenlerin en hayırlısısın.',
    kaynak: 'Mü’minûn Suresi, 118',
  },
  {
    arabic: 'رَبَّنَا آتِنَا مِنْ لَدُنْكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ أَمْرِنَا رَشَدًا',
    okunus: 'Rabbenâ âtinâ min ledünke rahmeten ve heyyi’ lenâ min emrinâ raşedâ.',
    meal: 'Rabbimiz! Bize katından bir rahmet ver ve işimizde bize doğruyu bulmayı kolaylaştır.',
    kaynak: 'Kehf Suresi, 10',
  },
  {
    arabic: 'رَبَّنَا لَا تُؤَاخِذْنَا إِنْ نَسِينَا أَوْ أَخْطَأْنَا',
    okunus: 'Rabbenâ lâ tüâhiznâ in nesînâ ev ahta’nâ.',
    meal: 'Rabbimiz! Unutur veya hataya düşersek bizi sorumlu tutma.',
    kaynak: 'Bakara Suresi, 286',
  },
];

/** Yılın gününe göre sabit sırayla dua seçer (herkes aynı gün aynı duayı görür). */
export function duaForDate(d: Date): { dua: Dua; index: number } {
  const start = new Date(d.getFullYear(), 0, 0);
  const day = Math.floor((d.getTime() - start.getTime()) / 86400000);
  const index = (day + d.getFullYear()) % DUALAR.length;
  return { dua: DUALAR[index], index };
}
