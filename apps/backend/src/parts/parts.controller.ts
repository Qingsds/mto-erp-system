import { Controller, Post, Body } from '@nestjs/common';
import { PartsService } from './parts.service';

import { ApiResponse, CreatePartRequest } from '@erp/shared-types';

@Controller('api/parts')
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  @Post()
  async create(@Body() requestBody: CreatePartRequest): Promise<ApiResponse> {
    const result = await this.partsService.create(requestBody);

    return {
      code: 200,
      data: result,
      message: '零件创建成功',
    };
  }
}
