import { describe, expect, it } from 'vitest';
import { AdminLoginSchema, PhoneSchema, RegisterSchema } from './schemas';

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
