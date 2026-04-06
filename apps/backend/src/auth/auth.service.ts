import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AuthLoginResponse,
  ChangePasswordRequest,
  LoginRequest,
  UserRoleType,
} from '@erp/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, verifyPassword } from './password.util';
import type { AuthenticatedUser } from './auth-request';

const DEFAULT_INIT_USERNAME = 'admin';
const DEFAULT_INIT_PASSWORD = 'admin123456';
const DEFAULT_INIT_REAL_NAME = '系统管理员';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.ensureInitialAdmin();
  }

  private resolveBootstrapValue(
    envName: string,
    fallback: string,
  ): string {
    const value = process.env[envName]?.trim();
    return value || fallback;
  }

  private async ensureInitialAdmin() {
    const activeUser = await this.prisma.client.user.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (activeUser) {
      return;
    }

    const username = this.resolveBootstrapValue(
      'AUTH_INIT_USERNAME',
      DEFAULT_INIT_USERNAME,
    );
    const password = this.resolveBootstrapValue(
      'AUTH_INIT_PASSWORD',
      DEFAULT_INIT_PASSWORD,
    );
    const realName = this.resolveBootstrapValue(
      'AUTH_INIT_REAL_NAME',
      DEFAULT_INIT_REAL_NAME,
    );

    const existingBootstrapUser = await this.prisma.client.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existingBootstrapUser) {
      await this.prisma.client.user.update({
        where: { id: existingBootstrapUser.id },
        data: {
          passwordHash: hashPassword(password),
          realName,
          role: 'ADMIN',
          isActive: true,
        },
      });

      this.logger.warn(
        `未检测到可用系统账号，已重置并启用初始管理员：${username}`,
      );
      return;
    }

    await this.prisma.client.user.create({
      data: {
        username,
        passwordHash: hashPassword(password),
        realName,
        role: 'ADMIN',
        isActive: true,
      },
    });

    this.logger.warn(
      `未检测到可用系统账号，已自动创建初始管理员：${username}`,
    );
  }

  private buildAuthResponse(user: AuthenticatedUser, accessToken: string): AuthLoginResponse {
    return {
      accessToken,
      user,
    };
  }

  async login(payload: LoginRequest): Promise<AuthLoginResponse> {
    const username = payload.username.trim();
    const password = payload.password;

    const user = await this.prisma.client.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        realName: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (!verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      username: user.username,
      realName: user.realName,
      role: user.role as UserRoleType,
      isActive: user.isActive,
    };
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      realName: user.realName,
      role: user.role,
    });

    return this.buildAuthResponse(authUser, accessToken);
  }

  getCurrentUser(user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  async changePassword(userId: number, payload: ChangePasswordRequest) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('当前登录状态无效，请重新登录');
    }
    if (!verifyPassword(payload.currentPassword, user.passwordHash)) {
      throw new BadRequestException('当前密码错误');
    }
    if (payload.currentPassword === payload.newPassword) {
      throw new BadRequestException('新密码不能与当前密码相同');
    }

    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashPassword(payload.newPassword),
      },
    });
  }
}
