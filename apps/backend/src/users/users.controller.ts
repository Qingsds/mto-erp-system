import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiResponse, CreateUserRequest, UpdateUserRequest } from '@erp/shared-types';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { Roles } from '../auth/roles.decorator';
import { UsersService } from './users.service';

@Roles('ADMIN')
@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(): Promise<ApiResponse> {
    const result = await this.usersService.findAll();
    return { code: 200, message: '查询成功', data: result };
  }

  @Post()
  async create(@Body() requestBody: CreateUserRequest): Promise<ApiResponse> {
    const result = await this.usersService.create(requestBody);
    return { code: 200, message: '用户创建成功', data: result };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() requestBody: UpdateUserRequest,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResponse> {
    const result = await this.usersService.update(id, requestBody, request.user);
    return { code: 200, message: '用户信息已更新', data: result };
  }
}
