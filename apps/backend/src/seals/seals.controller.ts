// apps/backend/src/seals/seals.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { SealsService } from './seals.service';
import {
  CreateSealRequest,
  ApiResponse,
  UpdateSealStatusRequest,
} from '@erp/shared-types';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Roles } from '../auth/roles.decorator';

@Roles('ADMIN')
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

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSealFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponse> {
    if (!file) {
      throw new BadRequestException('请通过表单的 file 字段上传 PNG 印章');
    }

    const result = await this.sealsService.uploadSealFile(file);
    return { code: 200, message: '印章图片上传成功', data: result };
  }

  @Get()
  async findAll(): Promise<ApiResponse> {
    const result = await this.sealsService.findAll();
    return { code: 200, message: '查询成功', data: result };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() requestBody: UpdateSealStatusRequest,
  ): Promise<ApiResponse> {
    const result = await this.sealsService.updateStatus(id, requestBody);
    return { code: 200, message: '印章状态已更新', data: result };
  }

  @Get(':id/file')
  async getSealFile(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.sealsService.getSealFile(id);
    const encodedFileName = encodeURIComponent(result.seal.fileName);

    response.setHeader('Content-Type', result.contentType);
    response.setHeader('Content-Length', String(result.size));
    response.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodedFileName}`,
    );

    return new StreamableFile(result.stream);
  }

  @Get(':id/logs')
  async findLogs(@Param('id', ParseIntPipe) id: number): Promise<ApiResponse> {
    const result = await this.sealsService.findLogs(id);
    return { code: 200, message: '查询成功', data: result };
  }
}
