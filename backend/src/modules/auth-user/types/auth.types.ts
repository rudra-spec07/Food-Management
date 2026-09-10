import { UserRole, UserStatus } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  jti: string;
  iat?: number;
  exp?: number;
}

export interface UserResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface AuthResponseDto {
  user: UserResponseDto;
  accessToken: string;
}
