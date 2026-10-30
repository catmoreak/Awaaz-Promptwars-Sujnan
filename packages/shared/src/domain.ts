export const CATEGORIES = [
  'WATERLOGGING',
  'DRAINAGE',
  'ROAD_DAMAGE',
  'WASTE',
  'STREETLIGHT',
  'WATER_SUPPLY',
  'ELECTRICAL_HAZARD',
  'PUBLIC_SERVICE',
  'OTHER',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, { en: string; kn: string }> = {
  WATERLOGGING: { en: 'Waterlogging', kn: 'ನೀರು ನಿಲ್ಲುವಿಕೆ' },
  DRAINAGE: { en: 'Drain blockage', kn: 'ಚರಂಡಿ ಕಟ್ಟಿಕೊಂಡಿದೆ' },
  ROAD_DAMAGE: { en: 'Road damage', kn: 'ರಸ್ತೆ ಹಾನಿ' },
  WASTE: { en: 'Waste', kn: 'ಕಸ' },
  STREETLIGHT: { en: 'Streetlight', kn: 'ಬೀದಿ ದೀಪ' },
  WATER_SUPPLY: { en: 'Water supply', kn: 'ನೀರು ಸರಬರಾಜು' },
  ELECTRICAL_HAZARD: { en: 'Electrical hazard', kn: 'ವಿದ್ಯುತ್ ಅಪಾಯ' },
  PUBLIC_SERVICE: { en: 'Public service', kn: 'ಸಾರ್ವಜನಿಕ ಸೇವೆ' },
  OTHER: { en: 'Other', kn: 'ಇತರೆ' },
};

/** Categories that often share one physical cause, such as a blocked drain flooding and breaking a road. */
export const CAUSE_CHAINS: readonly (readonly Category[])[] = [
  ['DRAINAGE', 'WATERLOGGING', 'ROAD_DAMAGE'],
  ['ELECTRICAL_HAZARD', 'STREETLIGHT'],
];

export function areRelatedCategories(a: Category, b: Category): boolean {
  return a === b || CAUSE_CHAINS.some((chain) => chain.includes(a) && chain.includes(b));
}

export const ISSUE_STATUSES = [
  'SUBMITTED',
  'TRIAGED',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'REJECTED',
] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const STATUS_LABELS: Record<IssueStatus, { en: string; kn: string }> = {
  SUBMITTED: { en: 'Submitted', kn: 'ಸಲ್ಲಿಸಲಾಗಿದೆ' },
  TRIAGED: { en: 'Under review', kn: 'ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ' },
  ASSIGNED: { en: 'Assigned', kn: 'ನಿಯೋಜಿಸಲಾಗಿದೆ' },
  IN_PROGRESS: { en: 'Work in progress', kn: 'ಕೆಲಸ ನಡೆಯುತ್ತಿದೆ' },
  RESOLVED: { en: 'Resolved', kn: 'ಪರಿಹರಿಸಲಾಗಿದೆ' },
  REJECTED: { en: 'Closed without action', kn: 'ಕ್ರಮವಿಲ್ಲದೆ ಮುಚ್ಚಲಾಗಿದೆ' },
};

export const OPEN_STATUSES: readonly IssueStatus[] = ['SUBMITTED', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS'];

export const TRANSITIONS: Record<IssueStatus, readonly IssueStatus[]> = {
  SUBMITTED: ['TRIAGED', 'REJECTED'],
  TRIAGED: ['ASSIGNED', 'REJECTED'],
  ASSIGNED: ['IN_PROGRESS', 'TRIAGED'],
  IN_PROGRESS: ['RESOLVED', 'ASSIGNED'],
  RESOLVED: ['IN_PROGRESS'],
  REJECTED: ['TRIAGED'],
};

export function canTransition(from: IssueStatus, to: IssueStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Citizens see these notes, so closing an issue always has to say why. */
export function transitionNeedsNote(to: IssueStatus): boolean {
  return to === 'RESOLVED' || to === 'REJECTED';
}

/** Town centre from the PIN 574227 post office listing. Override with SERVICE_CENTER_LAT and SERVICE_CENTER_LNG. */
export const SERVICE_AREA = { name: 'Moodbidri', pin: '574227', lat: 13.07168, lng: 74.995941, radiusKm: 12 };

export const H3_RES_DUPLICATE = 10;
export const H3_RES_HOTSPOT = 9;

export const LIMITS = {
  textMax: 1000,
  textMin: 5,
  imageBytesMax: 3 * 1024 * 1024,
  audioBytesMax: 2 * 1024 * 1024,
};
