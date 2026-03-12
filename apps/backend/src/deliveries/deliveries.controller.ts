import { Body, Controller, Post } from '@nestjs/common';
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
}
