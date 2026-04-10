// apps/backend/src/documents/documents.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { ExecuteSealRequest, ApiResponse } from '@erp/shared-types';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { Roles } from '../auth/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('api/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Roles('ADMIN')
  @Get()
  async findManagedDocuments(
    @Query('status') status?: 'DRAFT' | 'SIGNED',
  ): Promise<ApiResponse> {
    const result = await this.documentsService.findManagedDocuments(status);
    return { code: 200, message: '查询成功', data: result };
  }

  @Roles('ADMIN')
  @Post('seal')
  async executeSeal(
    @Body() requestBody: ExecuteSealRequest,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResponse> {
    const result = await this.documentsService.executeSeal(requestBody, request);
    return { code: 200, message: '单据电子签章并归档成功', data: result };
  }

  @Roles('ADMIN')
  @Post('upload-source')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSourceDocument(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResponse> {
    if (!file) {
      throw new BadRequestException('请通过表单的 file 字段上传待盖章文件');
    }

    const result = await this.documentsService.uploadSourceDocument(
      file,
      request,
    );
    return { code: 200, message: 'PDF 草稿上传成功', data: result };
  }

  @Get('billing/:id/preview')
  @Roles('ADMIN')
  async getBillingPreview(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.documentsService.getBillingPreviewFile(id);
    const encodedFileName = encodeURIComponent(result.fileName);

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Length', String(result.content.byteLength));
    response.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodedFileName}`,
    );

    return new StreamableFile(Buffer.from(result.content));
  }

  @Get(':id')
  @Roles('ADMIN')
  async getManagedDocument(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponse> {
    const result = await this.documentsService.findManagedDocumentById(id);
    return { code: 200, message: '查询成功', data: result };
  }

  @Get(':id/preview')
  @Roles('ADMIN')
  async getDocumentPreview(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.documentsService.getDocumentPreviewFile(id);
    const encodedFileName = encodeURIComponent(result.document.fileName);

    response.setHeader('Content-Type', result.contentType);
    response.setHeader('Content-Length', String(result.size));
    response.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodedFileName}`,
    );

    return new StreamableFile(result.stream);
  }

  @Get(':id/file')
  @Roles('ADMIN')
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
