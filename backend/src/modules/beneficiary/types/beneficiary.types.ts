import { BeneficiaryStatus } from '@prisma/client';

export interface CreateBeneficiaryParams {
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address: string;
  status?: BeneficiaryStatus;
  notes?: string | null;
}

export interface UpdateBeneficiaryParams {
  name?: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string;
  status?: BeneficiaryStatus;
  notes?: string | null;
}

export interface BeneficiaryFilterOptions {
  search?: string;
  status?: BeneficiaryStatus;
  page: number;
  limit: number;
}
