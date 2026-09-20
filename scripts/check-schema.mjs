import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

try {
  const result = await pool.query(`
    SELECT
      to_regclass('public.school_class') IS NOT NULL AS "schoolClasses",
      to_regclass('public.student_class_assignment') IS NOT NULL AS "studentAssignments",
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'teaching_scope' AND column_name = 'class_id'
      ) AS "teacherClassId",
      has_table_privilege(current_user, 'public.school_class', 'SELECT,INSERT,UPDATE') AS "classAccess",
      has_table_privilege(current_user, 'public.student_class_assignment', 'SELECT,INSERT,UPDATE,DELETE') AS "studentAccess",
      has_table_privilege(current_user, 'public.teaching_scope', 'SELECT,INSERT,UPDATE,DELETE') AS "teacherAccess",
      has_table_privilege(current_user, 'public.user', 'SELECT,UPDATE') AS "userAccess"
  `);
  const state = result.rows[0];
  console.log(JSON.stringify(state));
  if (Object.values(state).some((value) => value !== true)) process.exitCode = 1;
} finally {
  await pool.end();
}
