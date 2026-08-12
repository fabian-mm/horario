export type Subject = {
  id: string;
  name: string;
  credits?: number;
  weeklyStudyTrackingStartDate?: string;
  aliases?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export const MINUTES_PER_CREDIT_PER_WEEK = 180;

export const getExpectedWeeklyStudyMinutes = (credits: number, scheduledClassMinutes = 0) =>
  Math.max(0, Math.round(credits * MINUTES_PER_CREDIT_PER_WEEK) - Math.max(0, scheduledClassMinutes));

export const normalizeSubjectName = (value: string) => value.trim().toLocaleLowerCase("es");

export const findSubject = (subjects: Subject[], name?: string, subjectId?: string) => {
  if (subjectId) {
    const byId = subjects.find((subject) => subject.id === subjectId);
    if (byId) return byId;
  }
  if (!name) return undefined;
  const normalized = normalizeSubjectName(name);
  return subjects.find((subject) => normalizeSubjectName(subject.name) === normalized || subject.aliases?.some((alias) => normalizeSubjectName(alias) === normalized));
};

export const resolveSubjectName = (subjects: Subject[], name: string, subjectId?: string) =>
  findSubject(subjects, name, subjectId)?.name ?? name;
