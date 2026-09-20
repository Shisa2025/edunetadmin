import { randomUUID } from 'node:crypto';

import type { PoolClient } from 'pg';
import { ZodError } from 'zod';

import { isAllowedAdmin } from '@/lib/admin-access';
import {
  classInputSchema,
  identifierSchema,
  studentClassInputSchema,
  teacherScopesInputSchema,
} from '@/lib/admin-input';
import type {
  Catalog,
  School,
  SchoolClass,
  SchoolOverview,
  Student,
  Subject,
  Teacher,
  TeacherAssignment,
} from '@/lib/admin-types';
import { auth } from '@/lib/auth';
import { pool } from '@/lib/db';
import { env } from '@/lib/env';
import { getLocalAdminEmail } from '@/lib/local-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACTIVE_SUBJECT_IDS = ['e-math', 'chemistry'] as const;

class AdminApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AdminApiError(400, 'INVALID_JSON', 'Request body must contain valid JSON.');
  }
}

async function requireAdmin(request: Request) {
  const localEmail = getLocalAdminEmail(request.headers.get('cookie'));
  if (localEmail) return { user: { email: localEmail, name: 'Administrator' } };
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new AdminApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  if (!isAllowedAdmin(session.user.email, env.adminEmails)) {
    throw new AdminApiError(403, 'ADMIN_ACCESS_REQUIRED', 'Administrator access is required.');
  }
  return session;
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; cause?: unknown };
  return candidate.code === '23505'
    || Boolean(candidate.cause && candidate.cause !== error && isUniqueViolation(candidate.cause));
}

async function withTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getCatalog(): Promise<Catalog> {
  const [schoolsResult, subjectsResult] = await Promise.all([
    pool.query<School>('SELECT id, name FROM schools ORDER BY position, name'),
    pool.query<Subject>(
      'SELECT id, name, icon FROM subjects WHERE id = ANY($1::text[]) ORDER BY position, name',
      [[...ACTIVE_SUBJECT_IDS]],
    ),
  ]);
  return { schools: schoolsResult.rows, subjects: subjectsResult.rows };
}

async function getSchoolOverview(schoolId: string): Promise<SchoolOverview> {
  const schoolResult = await pool.query<School>('SELECT id, name FROM schools WHERE id = $1 LIMIT 1', [schoolId]);
  const school = schoolResult.rows[0];
  if (!school) throw new AdminApiError(404, 'SCHOOL_NOT_FOUND', 'School was not found.');

  const [classesResult, teachersResult, studentsResult, scopesResult] = await Promise.all([
    pool.query<SchoolClass>(`
      SELECT c.id, c.name,
        count(DISTINCT a.student_user_id)::int AS "studentCount",
        count(DISTINCT t.user_id)::int AS "teacherCount"
      FROM school_class c
      LEFT JOIN student_class_assignment a ON a.class_id = c.id
      LEFT JOIN teaching_scope t ON t.class_id = c.id
      WHERE c.school_id = $1
      GROUP BY c.id, c.name
      ORDER BY c.name
    `, [schoolId]),
    pool.query<Omit<Teacher, 'assignments'>>(`
      SELECT u.id, u.name, u.email
      FROM profile p
      INNER JOIN "user" u ON u.id = p.user_id
      WHERE p.school_id = $1 AND p.role = 'teacher'
      ORDER BY u.name, u.email
    `, [schoolId]),
    pool.query<Student>(`
      SELECT u.id, u.name, u.email, c.id AS "classId", c.name AS "className"
      FROM profile p
      INNER JOIN "user" u ON u.id = p.user_id
      LEFT JOIN student_class_assignment a ON a.student_user_id = p.user_id
      LEFT JOIN school_class c ON c.id = a.class_id AND c.school_id = p.school_id
      WHERE p.school_id = $1 AND p.role = 'student'
      ORDER BY u.name, u.email
    `, [schoolId]),
    pool.query<TeacherAssignment>(`
      SELECT t.id, t.user_id AS "teacherId", c.id AS "classId", c.name AS "className",
        s.id AS "subjectId", s.name AS "subjectName"
      FROM teaching_scope t
      INNER JOIN profile p ON p.user_id = t.user_id AND p.role = 'teacher'
      INNER JOIN school_class c ON c.id = t.class_id
      INNER JOIN subjects s ON s.id = t.subject_id
      WHERE p.school_id = $1 AND c.school_id = $1
      ORDER BY t.position, c.name, s.name
    `, [schoolId]),
  ]);

  const assignments = new Map<string, TeacherAssignment[]>();
  for (const scope of scopesResult.rows) {
    const teacherScopes = assignments.get(scope.teacherId) ?? [];
    teacherScopes.push(scope);
    assignments.set(scope.teacherId, teacherScopes);
  }
  return {
    school,
    classes: classesResult.rows,
    teachers: teachersResult.rows.map((teacher) => ({
      ...teacher,
      assignments: assignments.get(teacher.id) ?? [],
    })),
    students: studentsResult.rows,
  };
}

async function createClass(schoolId: string, request: Request) {
  const input = classInputSchema.parse(await readBody(request));
  const school = await pool.query('SELECT 1 FROM schools WHERE id = $1 LIMIT 1', [schoolId]);
  if (school.rowCount === 0) throw new AdminApiError(404, 'SCHOOL_NOT_FOUND', 'School was not found.');
  const result = await pool.query<{ id: string; name: string }>(
    'INSERT INTO school_class (id, school_id, name) VALUES ($1, $2, $3) RETURNING id, name',
    [randomUUID(), schoolId, input.name],
  );
  return json({ class: result.rows[0] }, 201);
}

async function renameClass(classId: string, request: Request) {
  const input = classInputSchema.parse(await readBody(request));
  const schoolClass = await withTransaction(async (client) => {
    const result = await client.query<{ id: string; name: string }>(`
      UPDATE school_class SET name = $2, updated_at = now()
      WHERE id = $1 RETURNING id, name
    `, [classId, input.name]);
    if (!result.rows[0]) throw new AdminApiError(404, 'CLASS_NOT_FOUND', 'Class was not found.');
    await client.query(`
      UPDATE teaching_scope SET classroom_name = $2, updated_at = now() WHERE class_id = $1
    `, [classId, input.name]);
    return result.rows[0];
  });
  return json({ class: schoolClass });
}

async function updateStudentClass(studentId: string, request: Request) {
  const input = studentClassInputSchema.parse(await readBody(request));
  const personResult = await pool.query<{ id: string; role: string; schoolId: string }>(`
    SELECT u.id, p.role, p.school_id AS "schoolId"
    FROM profile p INNER JOIN "user" u ON u.id = p.user_id
    WHERE p.user_id = $1 LIMIT 1
  `, [studentId]);
  const student = personResult.rows[0];
  if (!student) throw new AdminApiError(404, 'USER_NOT_FOUND', 'User was not found.');
  if (student.role !== 'student') throw new AdminApiError(409, 'ROLE_MISMATCH', 'The selected user is not a student.');

  const classResult = input.classId === null ? null : await pool.query<{ id: string; schoolId: string; name: string }>(`
    SELECT id, school_id AS "schoolId", name FROM school_class WHERE id = $1 LIMIT 1
  `, [input.classId]);
  const schoolClass = classResult?.rows[0] ?? null;
  if (input.classId !== null && !schoolClass) throw new AdminApiError(404, 'CLASS_NOT_FOUND', 'Class was not found.');
  if (schoolClass && schoolClass.schoolId !== student.schoolId) {
    throw new AdminApiError(409, 'CROSS_SCHOOL_ASSIGNMENT', 'Users can only be assigned within their school.');
  }

  await withTransaction(async (client) => {
    if (schoolClass) {
      await client.query(`
        INSERT INTO student_class_assignment (student_user_id, class_id, assigned_at, updated_at)
        VALUES ($1, $2, now(), now())
        ON CONFLICT (student_user_id) DO UPDATE SET class_id = EXCLUDED.class_id, updated_at = now()
      `, [student.id, schoolClass.id]);
    } else {
      await client.query('DELETE FROM student_class_assignment WHERE student_user_id = $1', [student.id]);
    }
    await client.query('UPDATE "user" SET "class" = $2, updated_at = now() WHERE id = $1', [
      student.id,
      schoolClass?.name ?? '',
    ]);
  });
  return json({ classId: schoolClass?.id ?? null, className: schoolClass?.name ?? null });
}

async function updateTeacherScopes(teacherId: string, request: Request) {
  const input = teacherScopesInputSchema.parse(await readBody(request));
  const teacherResult = await pool.query<{ id: string; role: string; schoolId: string }>(`
    SELECT u.id, p.role, p.school_id AS "schoolId"
    FROM profile p INNER JOIN "user" u ON u.id = p.user_id
    WHERE p.user_id = $1 LIMIT 1
  `, [teacherId]);
  const teacher = teacherResult.rows[0];
  if (!teacher) throw new AdminApiError(404, 'USER_NOT_FOUND', 'User was not found.');
  if (teacher.role !== 'teacher') throw new AdminApiError(409, 'ROLE_MISMATCH', 'The selected user is not a teacher.');
  if (input.assignments.some(({ subjectId }) => !ACTIVE_SUBJECT_IDS.includes(subjectId as typeof ACTIVE_SUBJECT_IDS[number]))) {
    throw new AdminApiError(400, 'INVALID_SUBJECT', 'Selected subject is not active.');
  }

  const classIds = [...new Set(input.assignments.map(({ classId }) => classId))];
  const classesResult = classIds.length === 0
    ? { rows: [] as { id: string; schoolId: string; name: string }[] }
    : await pool.query<{ id: string; schoolId: string; name: string }>(`
        SELECT id, school_id AS "schoolId", name FROM school_class WHERE id = ANY($1::text[])
      `, [classIds]);
  if (classesResult.rows.length !== classIds.length) {
    throw new AdminApiError(404, 'CLASS_NOT_FOUND', 'One or more Classes were not found.');
  }
  if (classesResult.rows.some((schoolClass) => schoolClass.schoolId !== teacher.schoolId)) {
    throw new AdminApiError(409, 'CROSS_SCHOOL_ASSIGNMENT', 'Users can only be assigned within their school.');
  }
  const classById = new Map(classesResult.rows.map((schoolClass) => [schoolClass.id, schoolClass]));

  await withTransaction(async (client) => {
    const existingResult = await client.query<{ id: string; classId: string; subjectId: string }>(`
      SELECT id, class_id AS "classId", subject_id AS "subjectId" FROM teaching_scope WHERE user_id = $1
    `, [teacher.id]);
    const desiredKeys = new Set(input.assignments.map(({ classId, subjectId }) => `${classId}\u0000${subjectId}`));
    const staleIds = existingResult.rows
      .filter((scope) => !desiredKeys.has(`${scope.classId}\u0000${scope.subjectId}`))
      .map((scope) => scope.id);
    if (staleIds.length > 0) {
      await client.query('DELETE FROM teaching_scope WHERE id = ANY($1::text[])', [staleIds]);
    }

    const existing = new Map(existingResult.rows.map((scope) => [`${scope.classId}\u0000${scope.subjectId}`, scope]));
    for (const [position, assignment] of input.assignments.entries()) {
      const schoolClass = classById.get(assignment.classId)!;
      const current = existing.get(`${assignment.classId}\u0000${assignment.subjectId}`);
      if (current) {
        await client.query(`
          UPDATE teaching_scope
          SET school_id = $2, classroom_name = $3, position = $4, updated_at = now()
          WHERE id = $1
        `, [current.id, teacher.schoolId, schoolClass.name, position]);
      } else {
        await client.query(`
          INSERT INTO teaching_scope
            (id, user_id, school_id, class_id, subject_id, classroom_name, position, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
        `, [
          randomUUID(), teacher.id, teacher.schoolId, schoolClass.id,
          assignment.subjectId, schoolClass.name, position,
        ]);
      }
    }
  });
  return json({ ok: true });
}

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    if ((request.method === 'POST' || request.method === 'PUT')
      && request.headers.get('origin') !== env.authUrl) {
      throw new AdminApiError(403, 'ORIGIN_NOT_ALLOWED', 'Request origin is not allowed.');
    }
    const { path } = await context.params;
    const method = request.method;

    if (method === 'GET' && path.length === 1 && path[0] === 'catalog') return json(await getCatalog());
    if (method === 'GET' && path.length === 2 && path[0] === 'schools') {
      return json(await getSchoolOverview(identifierSchema.parse(path[1])));
    }
    if (method === 'POST' && path.length === 3 && path[0] === 'schools' && path[2] === 'classes') {
      return await createClass(identifierSchema.parse(path[1]), request);
    }
    if (method === 'PUT' && path.length === 2 && path[0] === 'classes') {
      return await renameClass(identifierSchema.parse(path[1]), request);
    }
    if (method === 'PUT' && path.length === 3 && path[0] === 'students' && path[2] === 'class') {
      return await updateStudentClass(identifierSchema.parse(path[1]), request);
    }
    if (method === 'PUT' && path.length === 3 && path[0] === 'teachers' && path[2] === 'scopes') {
      return await updateTeacherScopes(identifierSchema.parse(path[1]), request);
    }
    throw new AdminApiError(404, 'NOT_FOUND', 'Route not found.');
  } catch (error) {
    if (error instanceof AdminApiError) {
      return json({ error: { code: error.code, message: error.message } }, error.status);
    }
    if (error instanceof ZodError) {
      return json({ error: { code: 'INVALID_REQUEST', message: 'Request validation failed.' } }, 400);
    }
    if (isUniqueViolation(error)) {
      return json({ error: { code: 'CLASS_NAME_EXISTS', message: 'A Class with this name already exists at the school.' } }, 409);
    }
    console.error('Admin database request failed.', error instanceof Error ? error.name : 'UnknownError');
    return json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } }, 500);
  }
}

export { handle as GET, handle as POST, handle as PUT };
