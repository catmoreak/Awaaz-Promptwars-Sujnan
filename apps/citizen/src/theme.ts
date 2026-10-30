import type { Category, IssueStatus, PriorityResult } from '@awaaz/shared';
import { Building2, CloudRain, Construction, Droplet, Ellipsis, Lightbulb, Trash2, Waves, Zap, type LucideIcon } from 'lucide-react-native';

/** Dark lime frost. */
export const color = {
  ink: '#EEF6F0',
  inkSoft: '#A9BDB1',
  inkFaint: '#7F9488',
  rain: '#0A1410',
  surface: '#111E19',
  raised: '#17271F',
  line: '#263A30',
  monsoon: '#C4F250',
  accentInk: '#C4F250',
  monsoonDeep: '#0D1813',
  onAccent: '#0A1410',
  critical: '#FF9AA9',
};

export const bandColor: Record<PriorityResult['band'], string> = {
  CRITICAL: '#FF9AA9',
  HIGH: '#F59A2C',
  MEDIUM: '#F7E48C',
  LOW: '#4FC3A1',
};

export const categoryIcon: Record<Category, LucideIcon> = {
  WATERLOGGING: CloudRain,
  DRAINAGE: Waves,
  ROAD_DAMAGE: Construction,
  WASTE: Trash2,
  STREETLIGHT: Lightbulb,
  WATER_SUPPLY: Droplet,
  ELECTRICAL_HAZARD: Zap,
  PUBLIC_SERVICE: Building2,
  OTHER: Ellipsis,
};

export const statusSteps: IssueStatus[] = ['SUBMITTED', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];

export const font = {
  regular: 'AnekKannada_400Regular',
  medium: 'AnekKannada_500Medium',
  semibold: 'AnekKannada_600SemiBold',
  bold: 'AnekKannada_700Bold',
};
