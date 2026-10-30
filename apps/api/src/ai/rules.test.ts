import { describe, expect, it } from 'vitest';
import { detectCategory, detectExposure, detectHazard, detectServiceDisruption, firstSentence } from './rules';

describe('detectHazard', () => {
  it('treats exposed wires and open manholes as immediate danger', () => {
    expect(detectHazard('A live wire fell on the path')).toBe(3);
    expect(detectHazard('Open manhole on the walkway')).toBe(3);
    expect(detectHazard('ವಿದ್ಯುತ್ ತಂತಿ ಬಿದ್ದಿದೆ')).toBe(3);
  });

  it('does not match a keyword inside a longer word', () => {
    expect(detectHazard('The contractor was fired and misfired on the work')).toBe(1);
  });

  it('falls back to a nuisance level', () => {
    expect(detectHazard('The paint on the bench is faded')).toBe(1);
  });
});

describe('detectCategory', () => {
  it('still matches word endings such as flooded', () => {
    expect(detectCategory('The lane is flooded again')).toBe('WATERLOGGING');
  });

  it('reads Kannada keywords', () => {
    expect(detectCategory('ಚರಂಡಿ ಕಟ್ಟಿಕೊಂಡಿದೆ')).toBe('DRAINAGE');
  });

  it('returns null rather than guessing', () => {
    expect(detectCategory('Something seems wrong here')).toBeNull();
  });
});

describe('detectExposure and detectServiceDisruption', () => {
  it('recognises wide areas', () => {
    expect(detectExposure('Flooding on the main road')).toBe(3);
    expect(detectExposure('Our street has no lights')).toBe(2);
  });

  it('recognises a stopped service', () => {
    expect(detectServiceDisruption('No water for three days')).toBe(true);
    expect(detectServiceDisruption('The water tastes odd')).toBe(false);
  });
});

describe('firstSentence', () => {
  it('stops at the end of the first sentence', () => {
    expect(firstSentence('The road is broken. Please fix it.', 100)).toBe('The road is broken.');
  });

  it('truncates long text with an ellipsis', () => {
    expect(firstSentence('a'.repeat(50), 10)).toHaveLength(10);
  });
});
