export type School = { id: string; name: string };
export type Subject = { id: string; name: string; icon: string | null };
export type SchoolClass = {
  id: string;
  name: string;
  studentCount: number;
  teacherCount: number;
};
export type TeacherAssignment = {
  id: string;
  teacherId: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
};
export type Teacher = {
  id: string;
  name: string;
  email: string;
  assignments: TeacherAssignment[];
};
export type Student = {
  id: string;
  name: string;
  email: string;
  classId: string | null;
  className: string | null;
};
export type Catalog = { schools: School[]; subjects: Subject[] };
export type SchoolOverview = {
  school: School;
  classes: SchoolClass[];
  teachers: Teacher[];
  students: Student[];
};
