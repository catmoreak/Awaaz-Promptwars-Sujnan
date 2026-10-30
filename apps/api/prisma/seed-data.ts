import { SERVICE_AREA, type Category, type IssueStatus } from '@awaaz/shared';

/**
 * Synthetic reports for the demo. Every one is invented: the coordinates fall in
 * Moodbidri, but no report describes a real event, person, shop or institution.
 *
 * `group` is the ground truth for the duplicate evaluation: reports that share a
 * group describe one physical problem. Reports in different groups must stay apart,
 * even when they sit close together and use similar words.
 */
export interface SeedReport {
  group: string;
  text: string;
  category: Category;
  /** Metres north and east of the town centre. */
  north: number;
  east: number;
  hoursAgo: number;
  demoOwner?: boolean;
}

export interface SeedOutcome {
  group: string;
  status: IssueStatus;
  team: string;
  note?: string;
  resolvedHoursAgo?: number;
}

export const TEAMS: { name: string; categories: Category[] }[] = [
  { name: 'Roads and Works', categories: ['ROAD_DAMAGE', 'PUBLIC_SERVICE', 'OTHER'] },
  { name: 'Drainage and Storm Water', categories: ['DRAINAGE', 'WATERLOGGING'] },
  { name: 'Sanitation', categories: ['WASTE'] },
  { name: 'Electrical', categories: ['STREETLIGHT', 'ELECTRICAL_HAZARD'] },
  { name: 'Water Supply', categories: ['WATER_SUPPLY'] },
];

const HOURS_PER_DAY = 24;
const days = (count: number) => count * HOURS_PER_DAY;

export const SEED_REPORTS: SeedReport[] = [
  // Immediate danger, reported four times, once in Kannada.
  { group: 'live-wire', text: 'A live electric wire has fallen on the footpath on the school road and is sparking. Children walk here every morning.', category: 'ELECTRICAL_HAZARD', north: 900, east: -300, hoursAgo: 9, demoOwner: true },
  { group: 'live-wire', text: 'Fallen electric wire sparking on the footpath of the school road. Very dangerous for students walking to school.', category: 'ELECTRICAL_HAZARD', north: 915, east: -290, hoursAgo: 7 },
  { group: 'live-wire', text: 'Electric wire snapped and lying on the walkway near the school gate, it is sparking when wet.', category: 'ELECTRICAL_HAZARD', north: 890, east: -315, hoursAgo: 6 },
  { group: 'live-wire', text: 'ಶಾಲೆ ರಸ್ತೆಯ ಕಾಲುದಾರಿಯಲ್ಲಿ ವಿದ್ಯುತ್ ತಂತಿ ಬಿದ್ದಿದೆ. ಕಿಡಿ ಬರುತ್ತಿದೆ, ಮಕ್ಕಳಿಗೆ ತುಂಬಾ ಅಪಾಯ.', category: 'ELECTRICAL_HAZARD', north: 905, east: -305, hoursAgo: 5 },

  // A single open manhole, which must stay critical with only one report.
  { group: 'open-manhole', text: 'Open manhole with no cover on the walkway beside the temple lane. Someone will fall in at night.', category: 'DRAINAGE', north: -700, east: 600, hoursAgo: 4 },

  // One overflowing bin, reported five times.
  { group: 'market-waste', text: 'The garbage bin at the market entrance is overflowing and waste is spreading onto the road.', category: 'WASTE', north: -200, east: 350, hoursAgo: days(3), demoOwner: true },
  { group: 'market-waste', text: 'Overflowing garbage bin at the market entrance, waste is all over the road and it smells terrible.', category: 'WASTE', north: -190, east: 365, hoursAgo: days(3) - 5 },
  { group: 'market-waste', text: 'Garbage bin near the market entrance is overflowing for three days, not cleared.', category: 'WASTE', north: -210, east: 340, hoursAgo: days(2) },
  { group: 'market-waste', text: 'Waste from the market bin is spread on the road near the entrance, overflowing again.', category: 'WASTE', north: -195, east: 355, hoursAgo: days(2) - 8 },
  { group: 'market-waste', text: 'Market entrance garbage bin overflowing, stray dogs are spreading the waste across the road.', category: 'WASTE', north: -205, east: 345, hoursAgo: days(1) },

  // One street near the bus stand: drain, flooding and road damage that may share a cause.
  { group: 'bus-drain', text: 'The roadside drain beside the bus stand is completely blocked with silt and plastic.', category: 'DRAINAGE', north: 20, east: -40, hoursAgo: days(4), demoOwner: true },
  { group: 'bus-drain', text: 'Drain beside the bus stand is blocked with plastic and silt, water is not flowing at all.', category: 'DRAINAGE', north: 30, east: -30, hoursAgo: days(4) - 6 },
  { group: 'bus-drain', text: 'Blocked drain near the bus stand, full of plastic waste and silt, smells bad.', category: 'DRAINAGE', north: 10, east: -50, hoursAgo: days(3) },
  { group: 'bus-flood', text: 'After every rain the main road next to the bus stand is flooded with knee deep water and bikes cannot pass.', category: 'WATERLOGGING', north: 110, east: 90, hoursAgo: days(3) },
  { group: 'bus-flood', text: 'Main road by the bus stand flooded again after rain, knee deep water, two wheelers cannot pass.', category: 'WATERLOGGING', north: 120, east: 100, hoursAgo: days(2) },
  { group: 'bus-flood', text: 'Knee deep flood on the main road near the bus stand after the rain, road is blocked for bikes.', category: 'WATERLOGGING', north: 100, east: 110, hoursAgo: days(2) - 3 },
  { group: 'bus-road', text: 'The road surface has caved in along the main road after the flooding, a big crater is forming.', category: 'ROAD_DAMAGE', north: 210, east: 200, hoursAgo: days(1) },
  { group: 'bus-road', text: 'Big crater on the main road where the road surface caved in, buses are swerving around it.', category: 'ROAD_DAMAGE', north: 220, east: 215, hoursAgo: 20 },

  // A water outage reported by three households.
  { group: 'water-outage', text: 'No water supply in our street for four days. The tap is completely dry for all houses.', category: 'WATER_SUPPLY', north: -1200, east: -900, hoursAgo: days(2) },
  { group: 'water-outage', text: 'Our whole street has had no water for four days, taps are dry in all houses.', category: 'WATER_SUPPLY', north: -1190, east: -885, hoursAgo: days(2) - 4 },
  { group: 'water-outage', text: 'No water in the taps on our street since four days, every house is affected.', category: 'WATER_SUPPLY', north: -1210, east: -910, hoursAgo: days(1) },

  // Similar wording but different physical problems, which must NOT merge.
  { group: 'pothole-a', text: 'Deep pothole on the college road near the first bend, bikes are skidding.', category: 'ROAD_DAMAGE', north: 1500, east: 700, hoursAgo: days(5) },
  { group: 'pothole-b', text: 'Deep pothole on the college road near the second bend, bikes are skidding.', category: 'ROAD_DAMAGE', north: 1500, east: 830, hoursAgo: days(4) },
  { group: 'pothole-c', text: 'Pothole on the college road by the bridge, water collects in it.', category: 'ROAD_DAMAGE', north: 1500, east: 1100, hoursAgo: days(4) },
  { group: 'light-1', text: 'Streetlight pole number 14 on the hill road is not working, the stretch is dark at night.', category: 'STREETLIGHT', north: 2000, east: -500, hoursAgo: days(6) },
  { group: 'light-1', text: 'Pole 14 streetlight on the hill road is out, very dark at night.', category: 'STREETLIGHT', north: 2010, east: -490, hoursAgo: days(5) },
  { group: 'light-2', text: 'Streetlight pole number 22 on the hill road is flickering and goes off after 9 pm.', category: 'STREETLIGHT', north: 2000, east: -220, hoursAgo: days(5) },
  { group: 'light-3', text: 'Streetlight pole number 31 on the hill road has been dark for a week.', category: 'STREETLIGHT', north: 2000, east: 60, hoursAgo: days(4) },

  // A drain and a pothole at one spot: same place, different problems.
  { group: 'junction-drain', text: 'Small drain at the junction near the bank is slow and water stands there for hours.', category: 'DRAINAGE', north: -500, east: -700, hoursAgo: days(3) },
  { group: 'junction-road', text: 'Pothole at the same junction near the bank is getting wider.', category: 'ROAD_DAMAGE', north: -490, east: -690, hoursAgo: days(2) },

  // Routine, scattered reports across town.
  { group: 'single-1', text: 'Waste is being dumped on the empty plot behind the community hall.', category: 'WASTE', north: 1300, east: -1500, hoursAgo: days(7) },
  { group: 'single-2', text: 'The public toilet near the park is locked and has not been cleaned.', category: 'PUBLIC_SERVICE', north: -1600, east: 300, hoursAgo: days(6) },
  { group: 'single-3', text: 'A water pipeline is leaking at the corner of the lake road, water is running down the road.', category: 'WATER_SUPPLY', north: 500, east: 1900, hoursAgo: days(2) },
  { group: 'single-4', text: 'Tree branch is hanging low over the lane and touching passing vehicles.', category: 'OTHER', north: -2100, east: -1200, hoursAgo: days(3) },
  { group: 'single-5', text: 'The bus shelter roof near the lake road is broken and leaks in the rain.', category: 'PUBLIC_SERVICE', north: 700, east: 2300, hoursAgo: days(5) },
  { group: 'single-6', text: 'Streetlight near the playground stays on during the day and wastes power.', category: 'STREETLIGHT', north: -1800, east: 1600, hoursAgo: days(8) },
  { group: 'single-7', text: 'Waste bin near the temple tank has a broken lid.', category: 'WASTE', north: -900, east: 1100, hoursAgo: days(9) },
  { group: 'single-8', text: 'Road edge is crumbling beside the paddy field on the village road.', category: 'ROAD_DAMAGE', north: -2600, east: 2100, hoursAgo: days(6) },
  { group: 'single-9', text: 'Stagnant water behind the shop row is breeding mosquitoes.', category: 'WATERLOGGING', north: 300, east: -1400, hoursAgo: days(2) },
  { group: 'single-10', text: 'Sewage is leaking from a broken pipe into the side lane near the hostel.', category: 'DRAINAGE', north: 1700, east: 1400, hoursAgo: days(1) },

  // Past work at the bus stand, which shows this area keeps recurring.
  { group: 'old-drain-1', text: 'Drain near the bus stand was overflowing onto the road last month.', category: 'DRAINAGE', north: 40, east: -70, hoursAgo: days(35) },
  { group: 'old-drain-2', text: 'Drain beside the main road near the bus stand blocked, cleaned once already.', category: 'DRAINAGE', north: 60, east: 10, hoursAgo: days(20) },

  // Closed history, which gives the trend chart earlier weeks.
  { group: 'old-waste', text: 'Bin at the bus stand was not cleared for a week.', category: 'WASTE', north: -40, east: 60, hoursAgo: days(28) },
  { group: 'old-light', text: 'Streetlight at the temple lane was out for several days.', category: 'STREETLIGHT', north: -650, east: 560, hoursAgo: days(24) },
  { group: 'old-water', text: 'Water pipeline burst near the lake road and flooded the lane.', category: 'WATER_SUPPLY', north: 450, east: 1800, hoursAgo: days(30) },
  { group: 'old-road', text: 'Pothole near the market was filled after complaints.', category: 'ROAD_DAMAGE', north: -260, east: 420, hoursAgo: days(18) },
];

export const SEED_OUTCOMES: SeedOutcome[] = [
  { group: 'old-drain-1', status: 'RESOLVED', team: 'Drainage and Storm Water', note: 'Drain desilted.', resolvedHoursAgo: days(30) },
  { group: 'old-drain-2', status: 'RESOLVED', team: 'Drainage and Storm Water', note: 'Blockage cleared.', resolvedHoursAgo: days(14) },
  { group: 'old-waste', status: 'RESOLVED', team: 'Sanitation', note: 'Bin cleared and pickup rescheduled.', resolvedHoursAgo: days(26) },
  { group: 'old-light', status: 'RESOLVED', team: 'Electrical', note: 'Lamp replaced.', resolvedHoursAgo: days(22) },
  { group: 'old-water', status: 'RESOLVED', team: 'Water Supply', note: 'Pipe joint repaired.', resolvedHoursAgo: days(29) },
  { group: 'old-road', status: 'RESOLVED', team: 'Roads and Works', note: 'Pothole patched.', resolvedHoursAgo: days(16) },
  { group: 'water-outage', status: 'IN_PROGRESS', team: 'Water Supply' },
  { group: 'market-waste', status: 'ASSIGNED', team: 'Sanitation' },
];

const METERS_PER_DEGREE_LAT = 111_320;

export function toCoordinates(report: Pick<SeedReport, 'north' | 'east'>) {
  const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.cos((SERVICE_AREA.lat * Math.PI) / 180);
  return {
    lat: SERVICE_AREA.lat + report.north / METERS_PER_DEGREE_LAT,
    lng: SERVICE_AREA.lng + report.east / metersPerDegreeLng,
  };
}
