import { z } from 'zod';
import { BeneficiaryStatus } from '@prisma/client';

export const createBeneficiarySchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(255, 'Name cannot exceed 255 characters'),
    contactPerson: z.string().trim().max(100, 'Contact person cannot exceed 100 characters').optional().nullable(),
    email: z.string().trim().email('Invalid email address').max(255, 'Email cannot exceed 255 characters').optional().nullable().or(z.literal('')),
    phone: z.string().trim().max(20, 'Phone cannot exceed 20 characters').optional().nullable(),
    address: z.string().trim().min(1, 'Address is required'),
    status: z.nativeEnum(BeneficiaryStatus).optional().default(BeneficiaryStatus.ACTIVE),
    notes: z.string().trim().max(2000, 'Notes cannot exceed 2000 characters').optional().nullable(),
  })
  .strict();

export const updateBeneficiarySchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(255, 'Name cannot exceed 255 characters').optional(),
    contactPerson: z.string().trim().max(100, 'Contact person cannot exceed 100 characters').optional().nullable(),
    email: z.string().trim().email('Invalid email address').max(255, 'Email cannot exceed 255 characters').optional().nullable().or(z.literal('')),
    phone: z.string().trim().max(20, 'Phone cannot exceed 20 characters').optional().nullable(),
    address: z.string().trim().min(1, 'Address is required').optional(),
    status: z.nativeEnum(BeneficiaryStatus).optional(),
    notes: z.string().trim().max(2000, 'Notes cannot exceed 2000 characters').optional().nullable(),
  })
  .strict();

export const beneficiaryQuerySchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(BeneficiaryStatus).optional(),
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(10),
});
