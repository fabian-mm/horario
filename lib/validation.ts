import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Escribe un correo válido.").max(254);

export const passwordSchema = z.string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(128, "La contraseña es demasiado larga.")
  .regex(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/, "Incluye al menos una letra.")
  .regex(/[0-9]/, "Incluye al menos un número.");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre.").max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Escribe tu contraseña.").max(128),
});

export const missionSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(180),
  subject: z.string().trim().min(1).max(100),
  subjectId: z.string().min(1).max(100).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  priority: z.enum(["normal", "important", "boss"]),
  status: z.enum(["pending", "submitted", "completed"]).optional(),
  completed: z.boolean(),
  notes: z.string().max(2000).optional(),
  grade: z.string().max(20).optional(),
  weight: z.number().min(0).max(100).optional(),
});

const dailyClassQuestSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(140),
  subject: z.string().trim().max(100).optional(),
  subjectId: z.string().min(1).max(100).optional(),
  activityTypeId: z.string().min(1).max(100).optional(),
  activityTypeName: z.string().trim().max(100).optional(),
  activityCategory: z.enum(["class", "activity"]).optional(),
  activityPoints: z.number().int().min(0).max(500).optional(),
  dayOfWeek: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7)]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  location: z.string().trim().max(140).optional(),
  notes: z.string().trim().max(1000).optional(),
  completedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(1000).optional(),
}).refine((value) => value.endTime > value.startTime, { message: "La hora final debe ser posterior a la inicial." });

export const weeklyQuestSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(120),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  active: z.boolean(),
  dailyMissions: z.array(dailyClassQuestSchema).max(70),
}).refine((value) => !value.endDate || value.endDate >= value.startDate, { message: "La fecha final debe ser posterior a la inicial." });

export const subjectSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1, "Escribe el nombre de la materia.").max(100),
});

export const activityTypeSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1, "Escribe el nombre del tipo.").max(100),
  category: z.enum(["class", "activity"]),
  points: z.number().int().min(0).max(500),
  tone: z.enum(["gold", "sage", "coral", "ocean", "violet"]),
});
