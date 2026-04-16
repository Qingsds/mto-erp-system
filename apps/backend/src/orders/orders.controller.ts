import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  ApiResponse,
  CloseShortOrderRequest,
  CreateOrderRequest,
  CreateQuickOrderRequest,
} from '@erp/shared-types';
import { OrderStatus } from '@erp/database';
import type { AuthenticatedRequest } from '../auth/auth-request';

@Controller('api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createController(
    @Body() requestBody: CreateOrderRequest,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResponse> {
    const result = await this.ordersService.createOrder(requestBody, request.user.id);

    return { code: 200, data: result, message: '订单创建成功' };
  }

  @Post('quick')
  async createQuickOrder(
    @Body() body: CreateQuickOrderRequest,
    @Req() request: AuthenticatedRequest,
  ) {
    const data = await this.ordersService.createQuickOrder(body, request.user.id);
    return { code: 200, message: 'success', data };
  }

  /**
   * 触发订单短交结案
   */
  @Patch(':id/close-short')
  async closeShortOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() requestBody: CloseShortOrderRequest,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResponse> {
    const result = await this.ordersService.closeShortOrder(
      id,
      requestBody,
      request.user.id,
    );

    return {
      code: 200,
      message: '订单短交结案成功',
      data: result,
    };
  }

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('status') status?: OrderStatus,
    @Query('customerId') customerId?: number,
    @Query('customerName') customerName?: string,
    @Req() request?: AuthenticatedRequest,
  ): Promise<ApiResponse> {
    const result = await this.ordersService.findAll(
      page,
      pageSize,
      status,
      customerId,
      customerName,
      request?.user.role,
    );
    return { code: 200, message: '查询成功', data: result };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResponse> {
    const result = await this.ordersService.findOne(id, request.user.role);
    return { code: 200, message: '查询成功', data: result };
  }
}
