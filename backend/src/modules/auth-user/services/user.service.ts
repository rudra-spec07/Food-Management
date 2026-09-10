import { UserRepository } from '../repositories/user.repository';
import { UpdateProfileDto } from '../dto/auth.dto';
import { UserResponseDto } from '../types/auth.types';
import { NotFoundError } from '../../../shared/errors/app-error';

export class UserService {
  private userRepository = new UserRepository();

  public mapToUserResponse(user: any): UserResponseDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  public async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }
    return this.mapToUserResponse(user);
  }

  public async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    const updatedUser = await this.userRepository.updateProfile(userId, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
    });

    return this.mapToUserResponse(updatedUser);
  }
}
