// apps/backend/src/seals/seals.controller.ts
import { Controller, Post, Get, Body } from '@nestjs/common';
import { SealsService } from './seals.service';
import { CreateSealRequest, ApiResponse } from '@erp/shared-types';

@Controller('api/seals')
export class SealsController {
  constructor(private readonly sealsService: SealsService) {}

  @Post()
  async createSeal(
    @Body() requestBody: CreateSealRequest,
  ): Promise<ApiResponse> {
    const result = await this.sealsService.createSeal(requestBody);
    return { code: 200, message: '印章注册成功', data: result };
  }

  @Get()
  async findAllActive(): Promise<ApiResponse> {
    const result = await this.sealsService.findAllActive();
    return { code: 200, message: '查询成功', data: result };
  }
}
