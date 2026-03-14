import {
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
} from '@nestjs/common';
import { PartsService } from './parts.service';

import {
  ApiResponse,
  CreatePartRequest,
  UpdatePartRequest,
} from '@erp/shared-types';
import { FileInterceptor } from '@nestjs/platform-express';

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

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('keyword') keyword?: string,
  ): Promise<ApiResponse> {
    const result = await this.partsService.findAll(page, pageSize, keyword);
    return { code: 200, message: '查询成功', data: result };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ApiResponse> {
    const result = await this.partsService.findOne(id);
    return { code: 200, message: '查询成功', data: result };
  }

  @Patch(':id')
  async updatePart(
    @Param('id', ParseIntPipe) id: number,
    @Body() requestBody: UpdatePartRequest,
  ): Promise<ApiResponse> {
    const result = await this.partsService.updatePart(id, requestBody);
    return { code: 200, message: '零件修改成功', data: result };
  }

  /**
   * 图纸上传接口
   * 采用 multipart/form-data 格式，字段名为 'file'
   */
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
}
