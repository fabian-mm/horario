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
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  priority: z.enum(["normal", "important", "boss"]),
  status: z.enum(["pending", "submitted", "completed"]).optional(),
  completed: z.boolean(),
  notes: z.string().max(2000).optional(),
  grade: z.string().max(20).optional(),
  weight: z.number().min(0).max(100).optional(),
});
