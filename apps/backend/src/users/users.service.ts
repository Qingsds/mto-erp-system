import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserRequest, UpdateUserRequest } from '@erp/shared-types';
import type { AuthenticatedUser } from '../auth/auth-request';
import { hashPassword } from '../auth/password.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.client.user.findMany({
      orderBy: [{ role: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        username: true,
        realName: true,
        role: true,
        isActive: true,
      },
    });
  }

  async create(payload: CreateUserRequest) {
    const username = payload.username.trim();
    const realName = payload.realName.trim();

    const existingUser = await this.prisma.client.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (existingUser) {
      throw new BadRequestException('用户名已存在');
    }

    return await this.prisma.client.user.create({
      data: {
        username,
        realName,
        role: payload.role,
        passwordHash: hashPassword(payload.password),
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        realName: true,
        role: true,
        isActive: true,
      },
    });
  }

  async update(
    id: number,
    payload: UpdateUserRequest,
    currentUser: AuthenticatedUser,
  ) {
    const user = await this.prisma.client.user.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (user.id === currentUser.id && payload.isActive === false) {
      throw new BadRequestException('不能停用当前登录账号');
    }

    return await this.prisma.client.user.update({
      where: { id },
      data: {
        ...(typeof payload.realName === 'string'
          ? { realName: payload.realName.trim() }
          : {}),
        ...(payload.role ? { role: payload.role } : {}),
        ...(typeof payload.isActive === 'boolean'
          ? { isActive: payload.isActive }
          : {}),
        ...(payload.password
          ? { passwordHash: hashPassword(payload.password) }
          : {}),
      },
      select: {
        id: true,
        username: true,
        realName: true,
        role: true,
        isActive: true,
      },
    });
  }
}
