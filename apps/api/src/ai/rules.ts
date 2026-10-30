import type { Category, Level } from '@awaaz/shared';

const CATEGORY_KEYWORDS: Record<Exclude<Category, 'OTHER'>, string[]> = {
  ELECTRICAL_HAZARD: ['live wire', 'electric wire', 'fallen wire', 'sparking', 'transformer', 'electric shock', 'ತಂತಿ', 'ವಿದ್ಯುತ್'],
  WATERLOGGING: ['waterlog', 'flood', 'knee deep', 'standing water', 'water on the road', 'ನೀರು ನಿಂತಿದೆ', 'ಪ್ರವಾಹ'],
  DRAINAGE: ['drain', 'sewage', 'gutter', 'overflowing sewer', 'manhole', 'ಚರಂಡಿ'],
  ROAD_DAMAGE: ['pothole', 'road damage', 'broken road', 'road caved', 'crater', 'ಗುಂಡಿ', 'ರಸ್ತೆ'],
  WASTE: ['garbage', 'waste', 'trash', 'dump', 'overflowing bin', 'ಕಸ'],
  STREETLIGHT: ['streetlight', 'street light', 'lamp post', 'dark at night', 'ಬೀದಿ ದೀಪ'],
  WATER_SUPPLY: ['no water', 'water supply', 'pipeline', 'pipe burst', 'tap', 'ನೀರು ಬರುತ್ತಿಲ್ಲ', 'ನಲ್ಲಿ'],
  PUBLIC_SERVICE: ['office closed', 'bus service', 'public toilet', 'service stopped', 'ಶೌಚಾಲಯ'],
};

const HAZARD_KEYWORDS: { level: Level; words: string[] }[] = [
  {
    level: 3,
    words: ['live wire', 'electric wire', 'fallen wire', 'sparking', 'electric shock', 'electrocut', 'open manhole', 'wall collapse', 'collapsed', 'gas leak', 'fire', 'ತಂತಿ', 'ಬೆಂಕಿ'],
  },
  {
    level: 2,
    words: ['accident', 'injured', 'fell', 'deep pothole', 'knee deep', 'skidded', 'sewage', 'mosquito', 'unsafe', 'ಅಪಘಾತ', 'ಅಪಾಯ'],
  },
];

const EXPOSURE_KEYWORDS: { level: Level; words: string[] }[] = [
  { level: 3, words: ['main road', 'highway', 'whole area', 'entire ward', 'neighbourhood', 'bus stand', 'market', 'ಮುಖ್ಯ ರಸ್ತೆ'] },
  { level: 2, words: ['whole street', 'entire street', 'our street', 'all houses', 'school', 'hospital', 'ಶಾಲೆ'] },
];

const SERVICE_KEYWORDS = ['no water', 'no power', 'road blocked', 'road is blocked', 'no electricity', 'ನೀರು ಬರುತ್ತಿಲ್ಲ'];

function includesAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

export function detectCategory(text: string): Category | null {
  const lower = text.toLowerCase();
  let best: { category: Category; hits: number } | null = null;
  for (const [category, words] of Object.entries(CATEGORY_KEYWORDS) as [Category, string[]][]) {
    const hits = words.filter((word) => lower.includes(word)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { category, hits };
  }
  return best?.category ?? null;
}

export function detectHazard(text: string): Level {
  const lower = text.toLowerCase();
  return HAZARD_KEYWORDS.find(({ words }) => includesAny(lower, words))?.level ?? 1;
}

export function detectExposure(text: string): Level {
  const lower = text.toLowerCase();
  return EXPOSURE_KEYWORDS.find(({ words }) => includesAny(lower, words))?.level ?? 1;
}

export function detectServiceDisruption(text: string): boolean {
  return includesAny(text.toLowerCase(), SERVICE_KEYWORDS);
}

export function firstSentence(text: string, maxLength: number): string {
  const sentence = text.trim().split(/(?<=[.!?।])\s/)[0] ?? text;
  return sentence.length <= maxLength ? sentence : `${sentence.slice(0, maxLength - 1).trimEnd()}…`;
}
