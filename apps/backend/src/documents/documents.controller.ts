// apps/backend/src/documents/documents.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { ExecuteSealRequest, ApiResponse } from '@erp/shared-types';

@Controller('api/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('seal')
  async executeSeal(
    @Body() requestBody: ExecuteSealRequest,
  ): Promise<ApiResponse> {
    const result = await this.documentsService.executeSeal(requestBody);
    return { code: 200, message: '单据电子签章并归档成功', data: result };
  }
}
