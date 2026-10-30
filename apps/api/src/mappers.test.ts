import { describe, expect, it } from 'vitest';
import { independentReports } from './mappers';

const citizen = (userId: string) => ({ userId, source: 'WEB' as const });

describe('independentReports', () => {
  it('counts one citizen repeating a complaint once', () => {
    expect(independentReports([citizen('a'), citizen('a'), citizen('a')])).toBe(1);
  });

  it('counts different citizens separately', () => {
    expect(independentReports([citizen('a'), citizen('b')])).toBe(2);
  });

  it('counts each staff entry, because each records a different caller', () => {
    const staff = { userId: 'officer', source: 'STAFF' as const };
    expect(independentReports([staff, staff, citizen('a')])).toBe(3);
  });

  it('counts anonymous and seeded reports one by one', () => {
    expect(independentReports([{ userId: null, source: 'SEED' }, { userId: null, source: 'SEED' }])).toBe(2);
  });
});
