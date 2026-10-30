import type { IssueStatus, PriorityResult } from '@awaaz/shared';

export const color = {
  ink: '#12302F',
  inkSoft: '#46605E',
  inkFaint: '#647C7A',
  rain: '#EAF0EF',
  surface: '#FFFFFF',
  line: '#D3DFDD',
  monsoon: '#0E6B66',
  monsoonDeep: '#0A3D3B',
  mint: '#7FD0C6',
  tint: '#E4F0EE',
  critical: '#B42318',
};

export const bandColor: Record<PriorityResult['band'], string> = {
  CRITICAL: '#B42318',
  HIGH: '#B84E08',
  MEDIUM: '#806300',
  LOW: '#346656',
};

export const statusSteps: IssueStatus[] = ['SUBMITTED', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];

export const font = {
  regular: 'AnekKannada_400Regular',
  medium: 'AnekKannada_500Medium',
  semibold: 'AnekKannada_600SemiBold',
  bold: 'AnekKannada_700Bold',
};
