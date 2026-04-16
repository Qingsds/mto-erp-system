import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  Patch,
  Req,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateTaskMessageRequest } from '@erp/shared-types';
import type { AuthenticatedRequest } from '../auth/auth-request';

@Controller('api/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getMyNotifications(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    const data = await this.notificationService.getMyNotifications(userId);
    return { code: 200, message: 'success', data };
  }

  @Patch(':id/read')
  async markAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = req.user.id;
    await this.notificationService.markAsRead(userId, id);
    return { code: 200, message: 'success' };
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    await this.notificationService.markAllAsRead(userId);
    return { code: 200, message: 'success' };
  }

  @Post('tasks/:taskId/messages')
  async createTaskMessage(
    @Req() req: AuthenticatedRequest,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() body: CreateTaskMessageRequest,
  ) {
    const userId = req.user.id;
    const data = await this.notificationService.createTaskMessage(
      taskId,
      userId,
      body,
    );
    return { code: 200, message: 'success', data };
  }
}
