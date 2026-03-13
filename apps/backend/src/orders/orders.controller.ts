import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  ApiResponse,
  CloseShortOrderRequest,
  CreateOrderRequest,
} from '@erp/shared-types';

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

  /**
   * 触发订单短交结案
   */
  @Patch(':id/close-short')
  async closeShortOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() requestBody: CloseShortOrderRequest,
  ): Promise<ApiResponse> {
    const result = await this.ordersService.closeShortOrder(id, requestBody);

    return {
      code: 200,
      message: '订单短交结案成功',
      data: result,
    };
  }
}
