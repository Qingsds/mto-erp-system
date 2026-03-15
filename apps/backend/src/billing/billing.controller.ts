import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import {
  CreateBillingRequest,
  ApiResponse,
  UpdateBillingStatusRequest,
  BillingStatusType,
} from '@erp/shared-types';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post()
  async createBilling(
    @Body() requestBody: CreateBillingRequest,
  ): Promise<ApiResponse> {
    const result = await this.billingService.createBilling(requestBody);
    return { code: 200, message: '财务对账单生成成功', data: result };
  }

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('status') status?: BillingStatusType,
  ): Promise<ApiResponse> {
    const result = await this.billingService.findAll(page, pageSize, status);
    return { code: 200, message: '查询成功', data: result };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() requestBody: UpdateBillingStatusRequest,
  ): Promise<ApiResponse> {
    const result = await this.billingService.updateStatus(id, requestBody);
    return { code: 200, message: '对账单状态更新成功', data: result };
  }
}
