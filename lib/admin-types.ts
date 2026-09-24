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
export type UserRole = 'student' | 'teacher';
export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: UserRole | null;
  schoolId: string | null;
  schoolName: string | null;
};
export type UserDetail = {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    className: string;
    signupReferralCode: string | null;
    createdAt: string;
    updatedAt: string;
  };
  profile: {
    role: UserRole;
    schoolId: string;
    onboardingCompleted: boolean;
    onboardingCompletedAt: string | null;
    updatedAt: string;
  } | null;
  signInMethods: { providerId: string; createdAt: string }[];
  hasPassword: boolean;
  activeSessions: number;
  classAssignment: { classId: string; className: string } | null;
  teachingScopeCount: number;
};
