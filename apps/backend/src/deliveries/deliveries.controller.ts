import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { ApiResponse, CreateDeliveryRequest } from '@erp/shared-types';

@Controller('deliveries')
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
  ): Promise<ApiResponse> {
    const result = await this.deliveriesService.findAll(
      page,
      pageSize,
      orderId,
    );
    return { code: 200, message: '查询成功', data: result };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ApiResponse> {
    const result = await this.deliveriesService.findOne(id);
    return { code: 200, message: '查询成功', data: result };
  }
}
