import {
  StreamableFile,
  Controller,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Patch,
  Get,
  Query,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
  Delete,
  Req,
  Res,
} from '@nestjs/common';
import { PartsService } from './parts.service';
import type { Response } from 'express';

import {
  ApiResponse,
  CreatePartRequest,
  UpdatePartRequest,
} from '@erp/shared-types';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/roles.decorator';
import type { AuthenticatedRequest } from '../auth/auth-request';

@Controller('api/parts')
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  @Roles('ADMIN')
  @Post()
  async create(@Body() requestBody: CreatePartRequest): Promise<ApiResponse> {
    const result = await this.partsService.create(requestBody);

    return {
      code: 200,
      data: result,
      message: '零件创建成功',
    };
  }

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('keyword') keyword?: string,
    @Req() request?: AuthenticatedRequest,
  ): Promise<ApiResponse> {
    const result = await this.partsService.findAll(
      page,
      pageSize,
      keyword,
      request?.user.role,
    );
    return { code: 200, message: '查询成功', data: result };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResponse> {
    const result = await this.partsService.findOne(id, request.user.role);
    return { code: 200, message: '查询成功', data: result };
  }

  @Get(':id/drawings/:drawingId/file')
  async getDrawingFile(
    @Param('id', ParseIntPipe) id: number,
    @Param('drawingId', ParseIntPipe) drawingId: number,
    @Query('download') download: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.partsService.getDrawingFile(id, drawingId);
    const dispositionType =
      download === '1' || download === 'true' ? 'attachment' : 'inline';
    const encodedFileName = encodeURIComponent(result.drawing.fileName);
    const asciiFallbackFileName = result.drawing.fileName
      .replace(/[^\x20-\x7E]+/g, '_')
      .replace(/["\\]/g, '_') || 'drawing';

    response.setHeader('Content-Type', result.contentType);
    response.setHeader('Content-Length', String(result.size));
    response.setHeader(
      'Content-Disposition',
      `${dispositionType}; filename="${asciiFallbackFileName}"; filename*=UTF-8''${encodedFileName}`,
    );

    return new StreamableFile(result.stream);
  }

  @Roles('ADMIN')
  @Patch(':id')
  async updatePart(
    @Param('id', ParseIntPipe) id: number,
    @Body() requestBody: UpdatePartRequest,
  ): Promise<ApiResponse> {
    const result = await this.partsService.updatePart(id, requestBody);
    return { code: 200, message: '零件修改成功', data: result };
  }

  @Roles('ADMIN')
  @Delete(':id')
  async deletePart(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponse> {
    const result = await this.partsService.deletePart(id);
    return { code: 200, message: '零件删除成功', data: result };
  }

  /**
   * 暂存图纸，用于快捷建单时提前上传
   */
  @Roles('ADMIN')
  @Post('drawings/stash')
  @UseInterceptors(FileInterceptor('file'))
  async stashDrawing(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponse> {
    if (!file) {
      throw new BadRequestException('请通过表单的 file 字段上传文件');
    }
    const result = await this.partsService.stashDrawing(file);
    return {
      code: 200,
      message: '图纸暂存成功',
      data: result,
    };
  }

  @Roles('ADMIN')
  @Delete('drawings/stash')
  async removeStashedDrawing(
    @Query('fileKey') fileKey?: string,
  ): Promise<ApiResponse> {
    if (!fileKey) {
      throw new BadRequestException('缺少 fileKey');
    }
    const result = await this.partsService.removeStashedDrawing(fileKey);
    return {
      code: 200,
      message: '临时图纸已清理',
      data: result,
    };
  }

  /**
   * 图纸上传接口
   * 采用 multipart/form-data 格式，字段名为 'file'
   */
  @Roles('ADMIN')
  @Post(':id/drawings')
  @UseInterceptors(FileInterceptor('file')) // 拦截名为 'file' 的表单数据
  async uploadDrawing(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponse> {
    if (!file) {
      throw new BadRequestException('请通过表单的 file 字段上传文件');
    }

    const result = await this.partsService.uploadDrawing(id, file);

    return {
      code: 200,
      message: '图纸上传成功，历史版本已自动归档',
      data: result,
    };
  }

  // 新增：批量导入接口
  @Roles('ADMIN')
  @Post('batch')
  async createBatch(
    @Body() requestBody: CreatePartRequest[],
  ): Promise<ApiResponse> {
    const result = await this.partsService.createBatch(requestBody);

    return {
      code: 200,
      data: result,
      message: `Excel 导入成功，共计新增 ${result.count} 条零件数据`,
    };
  }
}
