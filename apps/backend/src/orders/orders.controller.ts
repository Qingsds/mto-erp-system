import { Body, Controller, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ApiResponse, CreateOrderRequest } from '@erp/shared-types';

@Controller('api/order')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createController(
    @Body() requestBody: CreateOrderRequest,
  ): Promise<ApiResponse> {
    const result = await this.ordersService.createOrder(requestBody);

    return { code: 200, data: result, message: '订单创建成功' };
  }
}
