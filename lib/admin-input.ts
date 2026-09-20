import { z } from 'zod';

export const identifierSchema = z.string().trim().min(1).max(255);

export const classInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
});

export const studentClassInputSchema = z.strictObject({
  classId: identifierSchema.nullable(),
});

export const teacherScopesInputSchema = z.strictObject({
  assignments: z.array(z.strictObject({
    classId: identifierSchema,
    subjectId: z.string().trim().min(1).max(64),
  })).max(32),
}).superRefine(({ assignments }, context) => {
  const seen = new Set<string>();
  assignments.forEach((assignment, index) => {
    const key = `${assignment.classId}\u0000${assignment.subjectId}`;
    if (seen.has(key)) {
      context.addIssue({
        code: 'custom',
        path: ['assignments', index],
        message: 'Teacher assignments must be unique.',
      });
    }
    seen.add(key);
  });
});
