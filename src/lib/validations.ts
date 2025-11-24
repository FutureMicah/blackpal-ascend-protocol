import { z } from 'zod';

// Auth validation schemas
export const signupSchema = z.object({
  name: z.string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name must be less than 100 characters" }),
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  password: z.string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(128, { message: "Password must be less than 128 characters" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
});

export const loginSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  password: z.string()
    .min(1, { message: "Password is required" })
    .max(128, { message: "Password must be less than 128 characters" })
});

// Profile validation schema with friendly error messages
export const profileSchema = z.object({
  display_name: z.string()
    .trim()
    .min(1, { message: "Please enter your display name" })
    .min(2, { message: "Display name is too short - at least 2 characters needed" })
    .max(100, { message: "Display name is too long - maximum 100 characters" }),
  bio: z.string()
    .trim()
    .max(500, { message: "Bio is too long - maximum 500 characters" })
    .optional(),
  date_of_birth: z.string().optional(),
  phone_number: z.string()
    .trim()
    .regex(/^\+?[1-9]\d{1,14}$/, { message: "Phone number format should be like +1234567890" })
    .or(z.literal(''))
    .optional(),
  website_url: z.string()
    .trim()
    .url({ message: "Please enter a valid website URL" })
    .or(z.literal(''))
    .optional(),
  country: z.string().trim().optional(),
  profile_visibility: z.enum(['public', 'private', 'friends_only']).optional(),
  twitter_handle: z.string()
    .trim()
    .max(15, { message: "Twitter handle is too long - maximum 15 characters" })
    .or(z.literal(''))
    .optional(),
  linkedin_url: z.string()
    .trim()
    .url({ message: "Please enter a valid LinkedIn URL" })
    .or(z.literal(''))
    .optional(),
  github_handle: z.string()
    .trim()
    .max(39, { message: "GitHub handle is too long - maximum 39 characters" })
    .or(z.literal(''))
    .optional(),
  instagram_handle: z.string()
    .trim()
    .max(30, { message: "Instagram handle is too long - maximum 30 characters" })
    .or(z.literal(''))
    .optional()
});

export type SignupFormData = z.infer<typeof signupSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
