export type BeneficiaryStatus = 'ACTIVE' | 'INACTIVE';

export interface Beneficiary {
  id: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address: string;
  status: BeneficiaryStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBeneficiaryInput {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address: string;
  status?: BeneficiaryStatus;
  notes?: string;
}

export interface UpdateBeneficiaryInput {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: BeneficiaryStatus;
  notes?: string;
}

export interface BeneficiaryFilterParams {
  search?: string;
  status?: BeneficiaryStatus;
  page?: number;
  limit?: number;
}
