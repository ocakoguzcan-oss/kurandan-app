import React from 'react';
import Svg, { Circle, Path, Rect, G } from 'react-native-svg';
import { colors } from '../theme';

type P = { size?: number; color?: string; strokeWidth?: number };

const base = (size: number, color: string, sw: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color,
  strokeWidth: sw,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const IconHome = ({ size = 22, color = colors.green, strokeWidth = 1.8 }: P) => (
  <Svg {...base(size, color, strokeWidth)}><Path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></Svg>
);
export const IconCompass = ({ size = 22, color = colors.green, strokeWidth = 1.8 }: P) => (
  <Svg {...base(size, color, strokeWidth)}><Circle cx={12} cy={12} r={9.5} /><Path d="M15.5 8.5 13.4 13.4 8.5 15.5 10.6 10.6z" /></Svg>
);
export const IconTasbih = ({ size = 22, color = colors.green, strokeWidth = 1.8 }: P) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Circle cx={12} cy={4.5} r={1.6} /><Circle cx={17.3} cy={6.7} r={1.6} /><Circle cx={19.5} cy={12} r={1.6} />
    <Circle cx={17.3} cy={17.3} r={1.6} /><Circle cx={6.7} cy={6.7} r={1.6} /><Circle cx={4.5} cy={12} r={1.6} />
    <Circle cx={6.7} cy={17.3} r={1.6} /><Path d="M12 18v4" />
  </Svg>
);
export const IconPlus = ({ size = 22, color = colors.green, strokeWidth = 1.8 }: P) => (
  <Svg {...base(size, color, strokeWidth)}><Circle cx={12} cy={12} r={8} /><Path d="M12 8v8M8 12h8" /></Svg>
);
export const IconStory = ({ size = 22, color = colors.green, strokeWidth = 1.8 }: P) => (
  <Svg {...base(size, color, strokeWidth)}><Rect x={6} y={2.5} width={12} height={19} rx={3} /><Path d="M12 8v6M9 11l3-3 3 3" /></Svg>
);
export const IconReels = ({ size = 22, color = colors.green, strokeWidth = 1.8 }: P) => (
  <Svg {...base(size, color, strokeWidth)}><Rect x={3} y={3} width={18} height={18} rx={4} /><Path d="M3 8h18M8 3l3 5M14 3l3 5" /><Path d="M10.5 11.5v5l4-2.5z" /></Svg>
);
export const IconPlay = ({ size = 22, color = colors.green, strokeWidth = 1.8 }: P) => (
  <Svg {...base(size, color, strokeWidth)}><Rect x={3} y={3} width={18} height={18} rx={4} /><Path d="M10.5 9v6l5-3z" /></Svg>
);
export const IconMoon = ({ size = 22, color = colors.green, strokeWidth = 1.8 }: P) => (
  <Svg {...base(size, color, strokeWidth)}><Path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /><Path d="M17 3l.7 1.6 1.6.7-1.6.7L17 7.6l-.7-1.6-1.6-.7 1.6-.7z" /></Svg>
);
export const IconAlarm = ({ size = 22, color = colors.green, strokeWidth = 1.8 }: P) => (
  <Svg {...base(size, color, strokeWidth)}><Circle cx={12} cy={13} r={8} /><Path d="M12 9v4l2.5 2M5 3 2 6M19 3l3 3" /></Svg>
);
export const IconBook = ({ size = 22, color = colors.green, strokeWidth = 1.8 }: P) => (
  <Svg {...base(size, color, strokeWidth)}><Path d="M12 6.5C10 5 7 4.5 3 5v13c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5z" /><Path d="M12 6.5v13" /></Svg>
);
export const IconCalendar = ({ size = 22, color = colors.green, strokeWidth = 1.8 }: P) => (
  <Svg {...base(size, color, strokeWidth)}><Rect x={3.5} y={5} width={17} height={15.5} rx={2.5} /><Path d="M3.5 10h17M8 3v4M16 3v4" /><Path d="M15 14.5a2.3 2.3 0 1 1-2.6-2.6 1.8 1.8 0 0 0 2.6 2.6z" /></Svg>
);
export const IconBell = ({ size = 20, color = colors.green, strokeWidth = 1.8 }: P) => (
  <Svg {...base(size, color, strokeWidth)}><Path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><Path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></Svg>
);
export const IconBack = ({ size = 20, color = colors.green, strokeWidth = 2 }: P) => (
  <Svg {...base(size, color, strokeWidth)}><Path d="M15 18l-6-6 6-6" /></Svg>
);
export const IconReset = ({ size = 20, color = colors.green, strokeWidth = 2 }: P) => (
  <Svg {...base(size, color, strokeWidth)}><Path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><Path d="M3 3v5h5" /></Svg>
);
export const IconCheck = ({ size = 22, color = colors.goldLight, strokeWidth = 2 }: P) => (
  <Svg {...base(size, color, strokeWidth)}><Path d="M20 6 9 17l-5-5" /></Svg>
);
export const IconShare = ({ size = 18, color = colors.green, strokeWidth = 1.8 }: P) => (
  <Svg {...base(size, color, strokeWidth)}><Path d="M4 12v8h16v-8M16 6l-4-4-4 4M12 2v13" /></Svg>
);
export const IconBookmark = ({ size = 18, color = colors.green, strokeWidth = 1.8 }: P) => (
  <Svg {...base(size, color, strokeWidth)}><Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></Svg>
);
export const IconInstagram = ({ size = 20, color = colors.paper, strokeWidth = 1.8 }: P) => (
  <Svg {...base(size, color, strokeWidth)}><Rect x={3} y={3} width={18} height={18} rx={5} /><Circle cx={12} cy={12} r={4} /><Circle cx={17.5} cy={6.5} r={0.6} fill={color} /></Svg>
);
export const IconPin = ({ size = 18, color = colors.green, strokeWidth = 1.8 }: P) => (
  <Svg {...base(size, color, strokeWidth)}><Path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><Circle cx={12} cy={9.5} r={2.5} /></Svg>
);
export const IconSettings = ({ size = 22, color = colors.green, strokeWidth = 1.8 }: P) => (
  <Svg {...base(size, color, strokeWidth)}>
    <Circle cx={12} cy={12} r={3} />
    <Path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 14H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7.5l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.6V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3z" />
  </Svg>
);

/** Logodaki 8 köşeli yıldız süsü. */
export const StarOrnament = ({ size = 40, color = colors.gold, fill = colors.green }: { size?: number; color?: string; fill?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <G fill="none" stroke={color} strokeWidth={4}>
      <Rect x={25} y={25} width={50} height={50} />
      <Rect x={25} y={25} width={50} height={50} transform="rotate(45 50 50)" />
    </G>
    <Circle cx={50} cy={50} r={8} fill={fill} />
  </Svg>
);
