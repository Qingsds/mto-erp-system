import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  ParseIntPipe,
  Query,
  Req,
} from '@nestjs/common';
import { ProductionTaskService } from './production-task.service';
import { UpdateTaskStatusRequest } from '@erp/shared-types';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { DEFAULT_PRODUCTION_TASKS_PAGE_SIZE } from './production-task.constants';

@Controller('api/production-tasks')
export class ProductionTaskController {
  constructor(private readonly taskService: ProductionTaskService) {}

  @Get()
  async getTasks(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const sizeNum = pageSize ? parseInt(pageSize, 10) : DEFAULT_PRODUCTION_TASKS_PAGE_SIZE;
    const data = await this.taskService.findAll(pageNum, sizeNum, status, keyword);
    return { code: 200, message: 'success', data };
  }

  @Get('order/:orderId')
  async getTasksByOrderId(@Param('orderId', ParseIntPipe) orderId: number) {
    const data = await this.taskService.getTasksByOrderId(orderId);
    return { code: 200, message: 'success', data };
  }

  @Get(':id')
  async getTaskById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.taskService.getTaskById(id);
    return { code: 200, message: 'success', data };
  }

  @Patch(':id/status')
  async updateTaskStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTaskStatusRequest,
    @Req() request: AuthenticatedRequest,
  ) {
    const data = await this.taskService.updateTaskStatus(id, body, request.user.id);
    return { code: 200, message: 'success', data };
  }
}
