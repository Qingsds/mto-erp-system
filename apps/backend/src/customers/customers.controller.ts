import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { ApiResponse } from '@erp/shared-types';
import type {
  CreateCustomerRequest,
  UpdateCustomerRequest,
  UpdateCustomerStatusRequest,
} from '@erp/shared-types';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { Roles } from '../auth/roles.decorator';
import { CustomersService } from './customers.service';

@Controller('api/customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('keyword') keyword?: string,
    @Query('isActive') isActive?: string,
    @Req() request?: AuthenticatedRequest,
  ): Promise<ApiResponse> {
    const result = await this.customersService.findAll(
      page,
      pageSize,
      keyword,
      isActive,
      request?.user.role ?? 'USER',
    );

    return { code: 200, message: '查询成功', data: result };
  }

  @Roles('ADMIN')
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponse> {
    const result = await this.customersService.findOne(id);
    return { code: 200, message: '查询成功', data: result };
  }

  @Roles('ADMIN')
  @Post()
  async create(@Body() payload: CreateCustomerRequest): Promise<ApiResponse> {
    const result = await this.customersService.create(payload);
    return { code: 200, message: '客户创建成功', data: result };
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateCustomerRequest,
  ): Promise<ApiResponse> {
    const result = await this.customersService.update(id, payload);
    return { code: 200, message: '客户更新成功', data: result };
  }

  @Roles('ADMIN')
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateCustomerStatusRequest,
  ): Promise<ApiResponse> {
    const result = await this.customersService.updateStatus(id, payload);
    return { code: 200, message: '客户状态更新成功', data: result };
  }

  @Roles('ADMIN')
  @Post(':id/parts')
  async addPart(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: { partId: number },
  ): Promise<ApiResponse> {
    const result = await this.customersService.addPart(id, payload.partId);
    return { code: 200, message: '关联零件成功', data: result };
  }

  @Roles('ADMIN')
  @Delete(':id/parts/:partId')
  async removePart(
    @Param('id', ParseIntPipe) id: number,
    @Param('partId', ParseIntPipe) partId: number,
  ): Promise<ApiResponse> {
    const result = await this.customersService.removePart(id, partId);
    return { code: 200, message: '解除关联成功', data: result };
  }
}
