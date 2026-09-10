import { z } from 'zod';
import { DonationCategory, DonationQuantityUnit, DonationStatus } from '@prisma/client';

const FORBIDDEN_PHOTO_EXTENSIONS = /\.(exe|sh|bat|cmd|js|py|php|dll|jar|vbs|msi)$/i;
const PHONE_REGEX = /^[+]?[0-9\s\-()]{5,20}$/;

export const createDonationSchema = z
  .object({
    category: z.nativeEnum(DonationCategory, {
      errorMap: () => ({ message: 'Invalid donation category' }),
    }),
    description: z
      .string({ required_error: 'Description is required' })
      .trim()
      .min(1, 'Description cannot be empty')
      .max(2000, 'Description must not exceed 2000 characters'),
    quantity: z
      .number({ required_error: 'Quantity is required' })
      .positive('Quantity must be greater than zero')
      .finite('Quantity must be a valid finite number'),
    quantityUnit: z.nativeEnum(DonationQuantityUnit, {
      errorMap: () => ({ message: 'Invalid quantity unit' }),
    }),
    preparedAt: z
      .string({ required_error: 'Preparation time is required' })
      .datetime({ message: 'preparedAt must be a valid ISO date-time string' }),
    expiresAt: z
      .string({ required_error: 'Expiration time is required' })
      .datetime({ message: 'expiresAt must be a valid ISO date-time string' }),
    pickupAddress: z
      .string({ required_error: 'Pickup address is required' })
      .trim()
      .min(1, 'Pickup address cannot be empty')
      .max(500, 'Pickup address must not exceed 500 characters'),
    pickupLatitude: z
      .number()
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90')
      .optional()
      .nullable(),
    pickupLongitude: z
      .number()
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180')
      .optional()
      .nullable(),
    contactName: z
      .string({ required_error: 'Contact name is required' })
      .trim()
      .min(1, 'Contact name cannot be empty')
      .max(100, 'Contact name must not exceed 100 characters'),
    contactPhone: z
      .string({ required_error: 'Contact phone is required' })
      .trim()
      .regex(PHONE_REGEX, 'Invalid contact phone number format')
      .max(20, 'Contact phone must not exceed 20 characters'),
    photoUrl: z
      .string()
      .trim()
      .url('photoUrl must be a valid URL')
      .max(500, 'photoUrl must not exceed 500 characters')
      .refine(
        (url) => !FORBIDDEN_PHOTO_EXTENSIONS.test(url),
        'photoUrl cannot point to executable files'
      )
      .optional()
      .nullable(),
    notes: z
      .string()
      .trim()
      .max(1000, 'Notes must not exceed 1000 characters')
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      const hasLat = data.pickupLatitude !== undefined && data.pickupLatitude !== null;
      const hasLng = data.pickupLongitude !== undefined && data.pickupLongitude !== null;
      return (hasLat && hasLng) || (!hasLat && !hasLng);
    },
    {
      message: 'pickupLatitude and pickupLongitude must either both be provided or both omitted',
      path: ['pickupLatitude'],
    }
  )
  .refine(
    (data) => {
      const prep = new Date(data.preparedAt).getTime();
      const exp = new Date(data.expiresAt).getTime();
      return exp > prep;
    },
    {
      message: 'expiresAt must be later than preparedAt',
      path: ['expiresAt'],
    }
  )
  .refine(
    (data) => {
      const prep = new Date(data.preparedAt).getTime();
      const now = Date.now() + 60000; // Allow 1-min clock skew tolerance
      return prep <= now;
    },
    {
      message: 'preparedAt cannot be in the future',
      path: ['preparedAt'],
    }
  )
  .refine(
    (data) => {
      const exp = new Date(data.expiresAt).getTime();
      return exp > Date.now();
    },
    {
      message: 'expiresAt must be in the future',
      path: ['expiresAt'],
    }
  );

export const updateDonationSchema = z
  .object({
    category: z.nativeEnum(DonationCategory).optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    quantity: z.number().positive().finite().optional(),
    quantityUnit: z.nativeEnum(DonationQuantityUnit).optional(),
    preparedAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),
    pickupAddress: z.string().trim().min(1).max(500).optional(),
    pickupLatitude: z.number().min(-90).max(90).optional().nullable(),
    pickupLongitude: z.number().min(-180).max(180).optional().nullable(),
    contactName: z.string().trim().min(1).max(100).optional(),
    contactPhone: z.string().trim().regex(PHONE_REGEX, 'Invalid contact phone number format').optional(),
    photoUrl: z
      .string()
      .trim()
      .url('photoUrl must be a valid URL')
      .max(500)
      .refine(
        (url) => !FORBIDDEN_PHOTO_EXTENSIONS.test(url),
        'photoUrl cannot point to executable files'
      )
      .optional()
      .nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.pickupLatitude === undefined && data.pickupLongitude === undefined) return true;
      const hasLat = data.pickupLatitude !== undefined && data.pickupLatitude !== null;
      const hasLng = data.pickupLongitude !== undefined && data.pickupLongitude !== null;
      return (hasLat && hasLng) || (!hasLat && !hasLng);
    },
    {
      message: 'pickupLatitude and pickupLongitude must either both be provided or both omitted',
      path: ['pickupLatitude'],
    }
  )
  .refine(
    (data) => {
      if (data.preparedAt && data.expiresAt) {
        return new Date(data.expiresAt).getTime() > new Date(data.preparedAt).getTime();
      }
      return true;
    },
    {
      message: 'expiresAt must be later than preparedAt',
      path: ['expiresAt'],
    }
  );

export const cancelDonationSchema = z.object({
  reason: z.string().trim().max(500, 'Reason must not exceed 500 characters').optional(),
});

export const donationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(DonationStatus).optional(),
});

export type CreateDonationDto = z.infer<typeof createDonationSchema>;
export type UpdateDonationDto = z.infer<typeof updateDonationSchema>;
export type CancelDonationDto = z.infer<typeof cancelDonationSchema>;
export type DonationQueryDto = z.infer<typeof donationQuerySchema>;
