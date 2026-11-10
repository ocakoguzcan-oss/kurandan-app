// Kurandan.ai marka renkleri (logodaki yeşil ve altın, videolardaki krem kâğıt).
// Gece modu: iOS'ta her renk açık ve koyu değeriyle tanımlanır (DynamicColorIOS); sistem görünümü
// ya da Ayarlar → Görünüm'deki seçim (Appearance.setColorScheme) değişince ekran kendiliğinden güncellenir.
import { DynamicColorIOS, Platform } from 'react-native';

/** Açık görünüm (story görselleri gibi görüntüye dönüşen kartlar hep bunu kullanır) */
export const lightColors = {
  paper: '#F3ECDC',
  card: '#FBF7EE',
  cardBorder: '#E4D7B8',
  buttonBorder: '#DCCDAA',
  divider: '#EDE3CC',
  /** Dolgu yeşili: düğme, seçili öğe ve vakit kartı zemini */
  green: '#18583C',
  /** Yazı ve simge yeşili */
  greenText: '#18583C',
  greenDark: '#0F3D29',
  greenTint: '#E6EFE7',
  gold: '#A87628',
  goldText: '#7E5718', // küçük yazılar için (kontrast 4.5:1)
  goldLight: '#E2C27A',
  ink: '#1F2A24',
  inkSoft: '#3B3A33',
  muted: '#5C5A4E',
  mutedOnGreen: '#CFE0D4',
  /** Yeşil zemin üstündeki yazı ve simgeler */
  onGreen: '#F3ECDC',
  toggleOff: '#CFC3A6',
  white: '#FFFFFF',
  /** Uyarı kutusu zemini */
  warnBg: '#FBEBD3',
  /** Açıklama kutusu, Mushaf sure başlığı */
  creamBox: '#F6EBCF',
  /** Mushaf sayfası zemini */
  mushaf: '#FBF6EA',
  /** Tablo başlığı, görsel yer tutucu */
  tableHead: '#EFE4CB',
};

export type ColorKey = keyof typeof lightColors;

/** Koyu görünüm: krem kâğıt yerine koyu yeşil-siyah, yazılar krem */
export const darkColors: Record<ColorKey, string> = {
  paper: '#111814',
  card: '#1A231E',
  cardBorder: '#2D3A32',
  buttonBorder: '#3C4A41',
  divider: '#25302A',
  green: '#185A3E',
  greenText: '#86CBA4',
  greenDark: '#A6D9BB',
  greenTint: '#1E3328',
  gold: '#C9973F',
  goldText: '#E2C27A',
  goldLight: '#E2C27A',
  ink: '#EDE7D8',
  inkSoft: '#D5CEBD',
  muted: '#A9A592',
  mutedOnGreen: '#CFE0D4',
  onGreen: '#F6F0E2',
  toggleOff: '#4A564E',
  white: '#FFFFFF',
  warnBg: '#3A2F1A',
  creamBox: '#2A2619',
  mushaf: '#161E1A',
  tableHead: '#24302A',
};

function build(): typeof lightColors {
  if (Platform.OS !== 'ios') return lightColors;
  const out = {} as Record<ColorKey, string>;
  for (const k of Object.keys(lightColors) as ColorKey[]) {
    // DynamicColorIOS opak bir renk nesnesi döndürür; stil ve SVG özelliklerinde dize gibi kullanılabilir
    out[k] = DynamicColorIOS({ light: lightColors[k], dark: darkColors[k] }) as unknown as string;
  }
  return out;
}

export const colors = build();

export const fonts = {
  arabic: 'Amiri_400Regular',
  arabicBold: 'Amiri_700Bold',
  display: 'Lora_600SemiBold',
  displayBold: 'Lora_700Bold',
  displayItalic: 'Lora_400Regular_Italic',
  body: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodySemi: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
};

export const radius = { sm: 12, md: 16, lg: 20, xl: 24 };
