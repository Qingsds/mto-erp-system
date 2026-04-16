import {
  Body,
  Delete,
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
import { DeliveriesService } from './deliveries.service';
import { ApiResponse, CreateDeliveryRequest } from '@erp/shared-types';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

@Controller('api/deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Post('photos/stash')
  @UseInterceptors(FileInterceptor('file'))
  async stashPhoto(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponse> {
    if (!file) {
      throw new BadRequestException('请通过表单的 file 字段上传文件');
    }

    const result = await this.deliveriesService.stashPhoto(file);
    return {
      code: 200,
      message: '发货照片暂存成功',
      data: result,
    };
  }

  @Delete('photos/stash')
  async removeStashedPhoto(
    @Query('fileKey') fileKey?: string,
  ): Promise<ApiResponse> {
    if (!fileKey) {
      throw new BadRequestException('缺少 fileKey');
    }

    const result = await this.deliveriesService.removeStashedPhoto(fileKey);
    return {
      code: 200,
      message: '临时发货照片已清理',
      data: result,
    };
  }

  @Post()
  async createDelivery(
    @Body() requestBody: CreateDeliveryRequest,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResponse> {
    const result = await this.deliveriesService.createDelivery(
      requestBody,
      request.user.id,
    );

    return {
      code: 200,
      message: '发货单创建成功，订单发货数量已原子更新',
      data: result,
    };
  }

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('orderId') orderId?: number,
    @Query('customerId') customerId?: number,
    @Query('customerName') customerName?: string,
    @Query('deliveryDateStart') deliveryDateStart?: string,
    @Query('deliveryDateEnd') deliveryDateEnd?: string,
    @Query('hasRemark') hasRemark?: string,
    @Req() request?: AuthenticatedRequest,
  ): Promise<ApiResponse> {
    const result = await this.deliveriesService.findAll(
      page,
      pageSize,
      orderId,
      customerId,
      customerName,
      deliveryDateStart,
      deliveryDateEnd,
      hasRemark === undefined ? undefined : hasRemark === 'true',
      request?.user.role,
    );
    return { code: 200, message: '查询成功', data: result };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResponse> {
    const result = await this.deliveriesService.findOne(id, request.user.role);
    return { code: 200, message: '查询成功', data: result };
  }

  @Get(':id/photos/:photoId/file')
  async getPhotoFile(
    @Param('id', ParseIntPipe) id: number,
    @Param('photoId', ParseIntPipe) photoId: number,
    @Query('download') download: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.deliveriesService.getPhotoFile(id, photoId);
    const dispositionType =
      download === '1' || download === 'true' ? 'attachment' : 'inline';
    const encodedFileName = encodeURIComponent(result.photo.fileName);
    const asciiFallbackFileName = result.photo.fileName
      .replace(/[^\x20-\x7E]+/g, '_')
      .replace(/["\\]/g, '_') || 'photo';

    response.setHeader('Content-Type', result.contentType);
    response.setHeader('Content-Length', String(result.size));
    response.setHeader(
      'Content-Disposition',
      `${dispositionType}; filename="${asciiFallbackFileName}"; filename*=UTF-8''${encodedFileName}`,
    );

    return new StreamableFile(result.stream);
  }
}
