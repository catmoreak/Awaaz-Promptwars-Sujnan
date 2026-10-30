import type { Category } from '@awaaz/shared';
import { Building2, CloudRain, Construction, Droplet, Ellipsis, Lightbulb, Trash2, Waves, Zap, type LucideIcon } from 'lucide-react';

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
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
