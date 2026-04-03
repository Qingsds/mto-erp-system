// apps/backend/src/documents/documents.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { ExecuteSealRequest, ApiResponse } from '@erp/shared-types';
import type { Response } from 'express';

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

  @Get(':id/file')
  async getDocumentFile(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.documentsService.getSignedFile(id);
    const encodedFileName = encodeURIComponent(result.document.fileName);

    response.setHeader('Content-Type', result.contentType);
    response.setHeader('Content-Length', String(result.size));
    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodedFileName}`,
    );

    return new StreamableFile(result.stream);
  }
}
