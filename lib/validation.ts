import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const commitmentSchema = z.object({
  offeringId: z.string().min(1),
  entityId: z.string().min(1),
  // amount as dollars string; converted to cents server-side
  amount: z
    .string()
    .trim()
    .regex(/^\$?[\d,]+(\.\d{1,2})?$/, 'Enter a valid dollar amount'),
  note: z.string().max(500).optional().or(z.literal('')),
  csrf: z.string().min(1),
});

export const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal('')),
  csrf: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CommitmentInput = z.infer<typeof commitmentSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
