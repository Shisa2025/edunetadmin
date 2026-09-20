import { describe, expect, it } from 'vitest';

import { isAllowedAdmin } from '../lib/admin-access';
import { classInputSchema, studentClassInputSchema, teacherScopesInputSchema } from '../lib/admin-input';
import {
  createLocalAdminToken,
  credentialsMatch,
  verifyLocalAdminToken,
} from '../lib/local-admin-token';

describe('admin access', () => {
  it('matches only normalized allowlisted email addresses', () => {
    expect(isAllowedAdmin(' Admin@Example.com ', ['admin@example.com'])).toBe(true);
    expect(isAllowedAdmin('student@example.com', ['admin@example.com'])).toBe(false);
    expect(isAllowedAdmin(null, ['admin@example.com'])).toBe(false);
  });

  it('signs, verifies, and expires fixed-password administrator sessions', () => {
    const now = Date.UTC(2026, 8, 18);
    const secret = 'test-secret-that-is-at-least-thirty-two-characters';
    const token = createLocalAdminToken('admin@local.test', secret, now);
    expect(verifyLocalAdminToken(token, secret, now)).toBe('admin@local.test');
    expect(verifyLocalAdminToken(`${token}x`, secret, now)).toBeNull();
    expect(verifyLocalAdminToken(token, secret, now + 9 * 60 * 60 * 1000)).toBeNull();
    expect(credentialsMatch(' ADMIN@LOCAL.TEST ', 'secret', 'admin@local.test', 'secret')).toBe(true);
    expect(credentialsMatch('admin@local.test', 'wrong', 'admin@local.test', 'secret')).toBe(false);
  });
});

describe('Class assignment inputs', () => {
  it('normalizes Class names and permits student unassignment', () => {
    expect(classInputSchema.parse({ name: ' 4A ' })).toEqual({ name: '4A' });
    expect(studentClassInputSchema.parse({ classId: null })).toEqual({ classId: null });
  });

  it('accepts multiple unique teacher Class and subject pairs', () => {
    expect(teacherScopesInputSchema.safeParse({
      assignments: [
        { classId: 'class-4a', subjectId: 'e-math' },
        { classId: 'class-4a', subjectId: 'chemistry' },
      ],
    }).success).toBe(true);
    expect(teacherScopesInputSchema.safeParse({ assignments: [] }).success).toBe(true);
  });

  it('rejects duplicate scopes and client-supplied identity fields', () => {
    expect(teacherScopesInputSchema.safeParse({
      assignments: [
        { classId: 'class-4a', subjectId: 'e-math' },
        { classId: 'class-4a', subjectId: 'e-math' },
      ],
    }).success).toBe(false);
    expect(studentClassInputSchema.safeParse({ classId: 'class-4a', studentId: 'other' }).success).toBe(false);
  });
});
