import { describe, expect, it } from 'vitest';
import { AdminLoginSchema, CreateReportSchema, PhoneSchema, RegisterSchema, StaffReportSchema } from './schemas';

describe('CreateReportSchema', () => {
  const base = { clientRequestId: '6f1c7c1e-3f7a-4c1e-9a55-0d2f5a6b7c8d', category: 'WASTE', lat: 13.07, lng: 74.99 };
  const photo = { base64: 'a'.repeat(32), mime: 'image/jpeg' };

  it('accepts text alone, a photo alone, or both', () => {
    expect(CreateReportSchema.safeParse({ ...base, text: 'Bin is full' }).success).toBe(true);
    expect(CreateReportSchema.safeParse({ ...base, image: photo }).success).toBe(true);
    expect(CreateReportSchema.safeParse({ ...base, text: 'Bin is full', image: photo }).success).toBe(true);
  });

  it('rejects a report with neither text nor a photo', () => {
    expect(CreateReportSchema.safeParse({ ...base, text: 'hi' }).success).toBe(false);
  });

  it('accepts an address in place of a pin, but needs one of them', () => {
    const { lat: _lat, lng: _lng, ...noPin } = base;
    expect(CreateReportSchema.safeParse({ ...noPin, text: 'Bin is full', address: 'Near the bus stand' }).success).toBe(true);
    expect(CreateReportSchema.safeParse({ ...noPin, text: 'Bin is full' }).success).toBe(false);
    expect(CreateReportSchema.safeParse({ ...noPin, text: 'Bin is full', lat: 13.07 }).success).toBe(false);
  });

  it('applies the same rules to staff entries', () => {
    expect(StaffReportSchema.safeParse({ category: 'WASTE', channel: 'PHONE', text: 'hi', lat: 13.07, lng: 74.99 }).success).toBe(false);
    expect(StaffReportSchema.safeParse({ category: 'WASTE', channel: 'PHONE', text: 'Bin is full', address: 'Market' }).success).toBe(true);
  });
});

describe('PhoneSchema', () => {
  it.each(['9876543210', '+919876543210', '+91 98765 43210', '09876543210', '919876543210', '98765-43210'])(
    'normalizes %s to 10 digits',
    (input) => {
      expect(PhoneSchema.parse(input)).toBe('9876543210');
    },
  );

  it.each(['12345', '1234567890', '98765432101', 'abcdefghij', ''])('rejects %s', (input) => {
    expect(PhoneSchema.safeParse(input).success).toBe(false);
  });
});

describe('RegisterSchema', () => {
  const valid = {
    name: 'A Citizen',
    phone: '9876543210',
    password: 'longenough',
    addressLine: '12 Temple Street',
    locality: 'Moodbidri',
    pincode: '574227',
  };

  it('accepts a complete registration', () => {
    expect(RegisterSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ['a short password', { password: 'short' }],
    ['a missing name', { name: ' ' }],
    ['a missing address', { addressLine: '' }],
    ['a missing area', { locality: '' }],
    ['a bad PIN code', { pincode: '57422' }],
  ])('rejects %s', (_name, change) => {
    expect(RegisterSchema.safeParse({ ...valid, ...change }).success).toBe(false);
  });
});

describe('AdminLoginSchema', () => {
  it('normalizes the email, so its case cannot block sign-in', () => {
    expect(AdminLoginSchema.parse({ email: ' Admin@Awaaz.com ', password: 'x' }).email).toBe('admin@awaaz.com');
  });
});
