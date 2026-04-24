import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  ApiResponse,
  CloseShortOrderRequest,
  CreateOrderRequest,
  CreateOrderDraftRequest,
  CreateQuickOrderRequest,
  PaginatedOrderDrafts,
  OrderDraftDetail,
  SubmitOrderDraftResponse,
  UpdateOrderDraftRequest,
} from '@erp/shared-types';
import { OrderStatus } from '@erp/database';
import type { AuthenticatedRequest } from '../auth/auth-request';

@Controller('api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createController(
    @Body() requestBody: CreateOrderRequest,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResponse> {
    const result = await this.ordersService.createOrder(requestBody, request.user.id);

    return { code: 200, data: result, message: '订单创建成功' };
  }

  @Post('quick')
  async createQuickOrder(
    @Body() body: CreateQuickOrderRequest,
    @Req() request: AuthenticatedRequest,
  ) {
    const data = await this.ordersService.createQuickOrder(body, request.user.id);
    return { code: 200, message: 'success', data };
  }

  @Get('drafts')
  async listDrafts(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('keyword') keyword?: string,
    @Req() request?: AuthenticatedRequest,
  ): Promise<ApiResponse<PaginatedOrderDrafts>> {
    const result = await this.ordersService.listDrafts(
      page,
      pageSize,
      keyword,
      request!.user.id,
      request!.user.role,
    );
    return { code: 200, message: '查询成功', data: result };
  }

  @Get('drafts/:id')
  async getDraft(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResponse<OrderDraftDetail>> {
    const result = await this.ordersService.getDraft(id, request.user.id, request.user.role);
    return { code: 200, message: '查询成功', data: result };
  }

  @Post('drafts')
  async createDraft(
    @Body() body: CreateOrderDraftRequest,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResponse<OrderDraftDetail>> {
    const result = await this.ordersService.createDraft(body, request.user.id);
    return { code: 200, message: '保存成功', data: result };
  }

  @Patch('drafts/:id')
  async updateDraft(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateOrderDraftRequest,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResponse<OrderDraftDetail>> {
    const result = await this.ordersService.updateDraft(id, body, request.user.id, request.user.role);
    return { code: 200, message: '保存成功', data: result };
  }

  @Delete('drafts/:id')
  async deleteDraft(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResponse<{ ok: true }>> {
    await this.ordersService.deleteDraft(id, request.user.id, request.user.role);
    return { code: 200, message: '删除成功', data: { ok: true } };
  }

  @Post('drafts/:id/submit')
  async submitDraft(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResponse<SubmitOrderDraftResponse>> {
    const result = await this.ordersService.submitDraft(id, request.user.id, request.user.role);
    return { code: 200, message: '提交成功', data: result };
  }

  /**
   * 触发订单短交结案
   */
  @Patch(':id/close-short')
  async closeShortOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() requestBody: CloseShortOrderRequest,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResponse> {
    const result = await this.ordersService.closeShortOrder(
      id,
      requestBody,
      request.user.id,
    );

    return {
      code: 200,
      message: '订单短交结案成功',
      data: result,
    };
  }

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('status') status?: OrderStatus,
    @Query('customerId') customerId?: number,
    @Query('customerName') customerName?: string,
    @Req() request?: AuthenticatedRequest,
  ): Promise<ApiResponse> {
    const result = await this.ordersService.findAll(
      page,
      pageSize,
      status,
      customerId,
      customerName,
      request?.user.role,
    );
    return { code: 200, message: '查询成功', data: result };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResponse> {
    const result = await this.ordersService.findOne(id, request.user.role);
    return { code: 200, message: '查询成功', data: result };
  }
}
