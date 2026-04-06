import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiResponse,
  ChangePasswordRequest,
  LoginRequest,
} from '@erp/shared-types';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import type { AuthenticatedRequest } from './auth-request';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() requestBody: LoginRequest): Promise<ApiResponse> {
    const result = await this.authService.login(requestBody);
    return { code: 200, message: '登录成功', data: result };
  }

  @Get('me')
  async getCurrentUser(
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResponse> {
    const result = this.authService.getCurrentUser(request.user);
    return { code: 200, message: '查询成功', data: result };
  }

  @Patch('change-password')
  async changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() requestBody: ChangePasswordRequest,
  ): Promise<ApiResponse> {
    await this.authService.changePassword(request.user.id, requestBody);
    return { code: 200, message: '密码修改成功，请重新登录' };
  }
}
