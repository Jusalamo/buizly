import { z } from 'zod';

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  email: z.string().trim().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
});

// Public profile connect form
export const connectFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().trim().email('Invalid email address').max(255, 'Email is too long'),
  phone: z.string().trim().max(20, 'Phone number is too long').optional().or(z.literal('')),
  message: z.string().trim().max(500, 'Message is too long').optional().or(z.literal('')),
});

// Meeting scheduling
export const meetingSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().trim().max(1000, 'Description is too long').optional(),
  location: z.string().trim().max(200, 'Location is too long').optional(),
  date: z.date(),
  time: z.string().min(1, 'Time is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type ConnectFormData = z.infer<typeof connectFormSchema>;
export type MeetingFormData = z.infer<typeof meetingSchema>;
