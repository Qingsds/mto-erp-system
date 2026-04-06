import {
  Body,
  Controller,
  Get,
  Post,
  Req,
} from '@nestjs/common';
import { ApiResponse, LoginRequest } from '@erp/shared-types';
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
}
