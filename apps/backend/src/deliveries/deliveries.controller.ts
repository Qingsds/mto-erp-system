import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { ApiResponse, CreateDeliveryRequest } from '@erp/shared-types';
import type { AuthenticatedRequest } from '../auth/auth-request';

@Controller('api/deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Post()
  async createDelivery(
    @Body() requestBody: CreateDeliveryRequest,
  ): Promise<ApiResponse> {
    const result = await this.deliveriesService.createDelivery(requestBody);

    return {
      code: 200,
      message: '发货单创建成功，订单发货数量已原子更新',
      data: result,
    };
  }

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('orderId') orderId?: number,
    @Query('customerName') customerName?: string,
    @Query('deliveryDateStart') deliveryDateStart?: string,
    @Query('deliveryDateEnd') deliveryDateEnd?: string,
    @Query('hasRemark') hasRemark?: string,
    @Req() request?: AuthenticatedRequest,
  ): Promise<ApiResponse> {
    const result = await this.deliveriesService.findAll(
      page,
      pageSize,
      orderId,
      customerName,
      deliveryDateStart,
      deliveryDateEnd,
      hasRemark === undefined ? undefined : hasRemark === 'true',
      request?.user.role,
    );
    return { code: 200, message: '查询成功', data: result };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResponse> {
    const result = await this.deliveriesService.findOne(id, request.user.role);
    return { code: 200, message: '查询成功', data: result };
  }
}
