'use client';

import {
  BookOpen,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { SignOutButton } from '@/components/sign-out-button';
import { AdminApiError, apiRequest } from '@/lib/api';
import type { Catalog, SchoolClass, SchoolOverview, Student, Subject, Teacher } from '@/lib/admin-types';

const fieldClass = 'h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[var(--admin-blue)] focus:ring-3 focus:ring-blue-100 disabled:bg-slate-100';
const primaryButton = 'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--admin-blue)] px-4 text-sm font-black text-white hover:bg-[var(--admin-blue-strong)] disabled:cursor-not-allowed disabled:opacity-45';
const secondaryButton = 'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The request could not be completed.';
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white bg-white p-5 shadow-[0_10px_35px_rgba(23,59,115,0.07)]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-500">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-[var(--admin-blue)]">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function ClassRow({ schoolClass, onSaved }: { schoolClass: SchoolClass; onSaved: (message: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(schoolClass.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!name.trim() || name.trim() === schoolClass.name) {
      setName(schoolClass.name);
      setEditing(false);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/api/admin/classes/${encodeURIComponent(schoolClass.id)}`, {
        method: 'PUT',
        body: JSON.stringify({ name }),
      });
      setEditing(false);
      await onSaved(`Renamed Class to ${name.trim()}.`);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {editing ? (
          <input
            value={name}
            maxLength={80}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void save();
              if (event.key === 'Escape') { setName(schoolClass.name); setEditing(false); }
            }}
            className={`${fieldClass} min-w-0 flex-1`}
          />
        ) : (
          <div className="min-w-0 flex-1">
            <p className="truncate font-black text-slate-900">{schoolClass.name}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {schoolClass.studentCount} students · {schoolClass.teacherCount} teachers
            </p>
          </div>
        )}
        <div className="flex gap-2">
          {editing ? (
            <>
              <button type="button" disabled={busy} onClick={() => void save()} className={primaryButton}>
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save
              </button>
              <button type="button" disabled={busy} onClick={() => { setName(schoolClass.name); setEditing(false); }} className={secondaryButton} aria-label="Cancel rename">
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className={secondaryButton}>
              <Pencil className="h-4 w-4" /> Rename
            </button>
          )}
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}

function ClassManager({ schoolId, classes, refresh }: { schoolId: string; classes: SchoolClass[]; refresh: (message: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const createdName = name.trim();
      await apiRequest(`/api/admin/schools/${encodeURIComponent(schoolId)}/classes`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setName('');
      await refresh(`Created Class ${createdName}.`);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white bg-white/75 p-5 shadow-[0_12px_40px_rgba(23,59,115,0.07)] backdrop-blur sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">School structure</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">Classes</h2>
          <p className="mt-1 text-sm text-slate-500">Create and rename the Classes used by both workspaces.</p>
        </div>
        <form onSubmit={create} className="flex w-full gap-2 sm:w-auto">
          <input
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. 4A"
            aria-label="New Class name"
            className={`${fieldClass} min-w-0 flex-1 sm:w-52`}
          />
          <button type="submit" disabled={busy || !name.trim()} className={primaryButton}>
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
          </button>
        </form>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {classes.map((schoolClass) => <ClassRow key={`${schoolClass.id}:${schoolClass.name}`} schoolClass={schoolClass} onSaved={refresh} />)}
        {classes.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500 lg:col-span-2">
            No Classes yet. Create the first Class before assigning people.
          </div>
        )}
      </div>
    </section>
  );
}

function TeacherRow({ teacher, classes, subjects, refresh }: { teacher: Teacher; classes: SchoolClass[]; subjects: Subject[]; refresh: (message: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function beginEdit() {
    setSelected(new Set(teacher.assignments.map(({ classId, subjectId }) => `${classId}\u0000${subjectId}`)));
    setError('');
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    setError('');
    const assignments = classes.flatMap((schoolClass) => subjects
      .filter((subject) => selected.has(`${schoolClass.id}\u0000${subject.id}`))
      .map((subject) => ({ classId: schoolClass.id, subjectId: subject.id })));
    try {
      await apiRequest(`/api/admin/teachers/${encodeURIComponent(teacher.id)}/scopes`, {
        method: 'PUT',
        body: JSON.stringify({ assignments }),
      });
      setOpen(false);
      await refresh(`Updated ${teacher.name}'s teaching assignments.`);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 font-black text-[var(--admin-blue)]">
          {teacher.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-black text-slate-900">{teacher.name}</p>
          <p className="truncate text-sm text-slate-500">{teacher.email}</p>
        </div>
        <button type="button" onClick={() => open ? setOpen(false) : beginEdit()} className={secondaryButton}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {open ? 'Close' : 'Edit assignments'}
        </button>
      </div>

      {!open && (
        <div className="mt-3 flex flex-wrap gap-2">
          {teacher.assignments.map((assignment) => (
            <span key={assignment.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              {assignment.className} · {assignment.subjectName}
            </span>
          ))}
          {teacher.assignments.length === 0 && <span className="text-sm font-semibold text-amber-700">Awaiting admin assignment</span>}
        </div>
      )}

      {open && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          {classes.length === 0 ? (
            <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Create a Class before assigning this teacher.</p>
          ) : (
            <div className="space-y-3">
              {classes.map((schoolClass) => (
                <fieldset key={schoolClass.id} className="rounded-xl bg-slate-50 p-3">
                  <legend className="px-1 text-sm font-black text-slate-800">{schoolClass.name}</legend>
                  <div className="mt-1 flex flex-wrap gap-4">
                    {subjects.map((subject) => {
                      const key = `${schoolClass.id}\u0000${subject.id}`;
                      return (
                        <label key={subject.id} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={selected.has(key)}
                            onChange={(event) => setSelected((current) => {
                              const next = new Set(current);
                              if (event.target.checked) next.add(key); else next.delete(key);
                              return next;
                            })}
                            className="h-4 w-4 accent-[var(--admin-blue)]"
                          />
                          {subject.icon && <span>{subject.icon}</span>}{subject.name}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          )}
          {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" disabled={busy} onClick={() => setOpen(false)} className={secondaryButton}>Cancel</button>
            <button type="button" disabled={busy || classes.length === 0} onClick={() => void save()} className={primaryButton}>
              {busy && <LoaderCircle className="h-4 w-4 animate-spin" />} Save assignments
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function StudentRow({ student, classes, refresh }: { student: Student; classes: SchoolClass[]; refresh: (message: string) => Promise<void> }) {
  const [classId, setClassId] = useState(student.classId ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/api/admin/students/${encodeURIComponent(student.id)}/class`, {
        method: 'PUT',
        body: JSON.stringify({ classId: classId || null }),
      });
      await refresh(`Updated ${student.name}'s Class.`);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  const changed = classId !== (student.classId ?? '');
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)_auto] sm:items-center">
        <div className="min-w-0">
          <p className="truncate font-black text-slate-900">{student.name}</p>
          <p className="truncate text-sm text-slate-500">{student.email}</p>
        </div>
        <select value={classId} onChange={(event) => setClassId(event.target.value)} className={fieldClass} aria-label={`Class for ${student.name}`}>
          <option value="">Unassigned</option>
          {classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}
        </select>
        <button type="button" disabled={busy || !changed} onClick={() => void save()} className={primaryButton}>
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" />} Save
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}

export function AdminDashboard({ adminName, adminEmail }: { adminName: string; adminEmail: string }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [schoolId, setSchoolId] = useState('');
  const [overview, setOverview] = useState<SchoolOverview | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingSchool, setLoadingSchool] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<'teachers' | 'students'>('teachers');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest<Catalog>('/api/admin/catalog')
      .then((result) => { if (active) setCatalog(result); })
      .catch((requestError) => {
        if (requestError instanceof AdminApiError && requestError.status === 401) window.location.replace('/login');
        else if (active) setError(errorMessage(requestError));
      })
      .finally(() => { if (active) setLoadingCatalog(false); });
    return () => { active = false; };
  }, []);

  const loadOverview = useCallback(async (selectedSchoolId: string) => {
    const result = await apiRequest<SchoolOverview>(`/api/admin/schools/${encodeURIComponent(selectedSchoolId)}`);
    setOverview(result);
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    let active = true;
    apiRequest<SchoolOverview>(`/api/admin/schools/${encodeURIComponent(schoolId)}`)
      .then((result) => { if (active) setOverview(result); })
      .catch((requestError) => { if (active) setError(errorMessage(requestError)); })
      .finally(() => { if (active) setLoadingSchool(false); });
    return () => { active = false; };
  }, [schoolId]);

  const refresh = useCallback(async (message: string) => {
    if (!schoolId) return;
    await loadOverview(schoolId);
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  }, [loadOverview, schoolId]);

  const normalizedSearch = search.trim().toLowerCase();
  const people = useMemo(() => {
    if (!overview) return [];
    const source = tab === 'teachers' ? overview.teachers : overview.students;
    if (!normalizedSearch) return source;
    return source.filter((person) => `${person.name} ${person.email}`.toLowerCase().includes(normalizedSearch));
  }, [normalizedSearch, overview, tab]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4 sm:px-8">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--admin-blue)] text-white"><GraduationCap className="h-6 w-6" /></span>
          <div>
            <p className="font-black text-slate-900">EduNets Admin</p>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-cyan-600">Class management</p>
          </div>
          <div className="ml-auto hidden text-right sm:block">
            <p className="text-sm font-black text-slate-800">{adminName}</p>
            <p className="text-xs text-slate-500">{adminEmail}</p>
          </div>
          <SignOutButton compact />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9">
        <section className="rounded-3xl bg-[var(--admin-blue)] p-6 text-white shadow-[0_20px_55px_rgba(23,59,115,0.2)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Administration workspace</p>
              <h1 className="mt-2 text-3xl font-black">Choose a school</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">Manage Classes and assignments only for people already registered at the selected school.</p>
            </div>
            <label className="block w-full max-w-xl text-sm font-black">
              School
              <select
                value={schoolId}
                disabled={loadingCatalog}
                onChange={(event) => {
                  const value = event.target.value;
                  setSchoolId(value);
                  setOverview(null);
                  setLoadingSchool(Boolean(value));
                  setError('');
                  setSearch('');
                  setNotice('');
                }}
                className="mt-2 h-12 w-full rounded-xl border border-white/25 bg-white px-4 font-bold text-slate-900 outline-none ring-cyan-200 focus:ring-3"
              >
                <option value="">Select a school…</option>
                {catalog?.schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
              </select>
            </label>
          </div>
        </section>

        {notice && <div role="status" className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"><Check className="h-4 w-4" />{notice}</div>}
        {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

        {(loadingCatalog || loadingSchool) && (
          <div className="grid min-h-72 place-items-center"><div className="text-center text-slate-500"><LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[var(--admin-blue)]" /><p className="mt-3 text-sm font-bold">Loading school data…</p></div></div>
        )}

        {!loadingCatalog && !loadingSchool && !schoolId && (
          <div className="mt-6 grid min-h-72 place-items-center rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
            <div><Building2 className="mx-auto h-10 w-10 text-slate-400" /><h2 className="mt-3 text-xl font-black text-slate-800">No school selected</h2><p className="mt-1 text-sm text-slate-500">Select a school to load its Classes, teachers, and students.</p></div>
          </div>
        )}

        {!loadingSchool && overview && catalog && (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Classes" value={overview.classes.length} icon={<Building2 className="h-5 w-5" />} />
              <StatCard label="Teachers" value={overview.teachers.length} icon={<BookOpen className="h-5 w-5" />} />
              <StatCard label="Students" value={overview.students.length} icon={<Users className="h-5 w-5" />} />
            </div>

            <ClassManager schoolId={overview.school.id} classes={overview.classes} refresh={refresh} />

            <section className="rounded-3xl border border-white bg-white/75 p-5 shadow-[0_12px_40px_rgba(23,59,115,0.07)] backdrop-blur sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex rounded-xl bg-slate-100 p-1">
                  {(['teachers', 'students'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { setTab(value); setSearch(''); }}
                      className={`rounded-lg px-5 py-2 text-sm font-black capitalize transition ${tab === value ? 'bg-white text-[var(--admin-blue)] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <label className="relative block w-full lg:max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${tab}…`} className={`${fieldClass} w-full pl-9`} />
                </label>
              </div>

              <div className="mt-5 space-y-3">
                {tab === 'teachers'
                  ? (people as Teacher[]).map((teacher) => <TeacherRow key={teacher.id} teacher={teacher} classes={overview.classes} subjects={catalog.subjects} refresh={refresh} />)
                  : (people as Student[]).map((student) => <StudentRow key={`${student.id}:${student.classId ?? ''}`} student={student} classes={overview.classes} refresh={refresh} />)}
                {people.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">
                    {search ? `No ${tab} match this search.` : `No registered ${tab} at this school.`}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
