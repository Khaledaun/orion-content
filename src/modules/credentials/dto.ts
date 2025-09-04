
import { z } from 'zod';

/**
 * Data Transfer Objects for Credential Management
 * Phase 1: Content Management System
 */

export const CreateCredentialDto = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  key: z.string().min(1, 'Key is required').max(100, 'Key too long'),
  value: z.string().min(1, 'Value is required'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateCredentialDto = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  key: z.string().min(1, 'Key is required').max(100, 'Key too long').optional(),
  value: z.string().min(1, 'Value is required').optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const TestCredentialDto = z.object({
  key: z.string().min(1, 'Key is required'),
  testEndpoint: z.string().url('Must be a valid URL').optional(),
});

export const CredentialResponseDto = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  // Note: valueEnc is never exposed in responses
});

export type CreateCredentialInput = z.infer<typeof CreateCredentialDto>;
export type UpdateCredentialInput = z.infer<typeof UpdateCredentialDto>;
export type TestCredentialInput = z.infer<typeof TestCredentialDto>;
export type CredentialResponse = z.infer<typeof CredentialResponseDto>;
