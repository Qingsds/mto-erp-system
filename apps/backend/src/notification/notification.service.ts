import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskMessageRequest } from '@erp/shared-types';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProductionTaskService } from '../production-task/production-task.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  private buildTaskUrgencyDedupeKey(
    taskId: number,
    urgency: 'URGENT' | 'OVERDUE',
    targetDate: Date,
  ) {
    return `task:${taskId}:urgency:${urgency}:target:${targetDate.toISOString().slice(0, 10)}`;
  }

  private async createTaskNotification(params: {
    userId: number;
    taskId: number;
    urgency: 'URGENT' | 'OVERDUE';
    title: string;
    content: string;
    targetDate: Date;
  }) {
    const dedupeKey = this.buildTaskUrgencyDedupeKey(
      params.taskId,
      params.urgency,
      params.targetDate,
    );

    await this.prisma.client.systemNotification.upsert({
      where: {
        userId_dedupeKey: {
          userId: params.userId,
          dedupeKey,
        },
      },
      update: {
        title: params.title,
        content: params.content,
        relatedType: 'TASK',
        relatedId: params.taskId,
      },
      create: {
        userId: params.userId,
        dedupeKey,
        title: params.title,
        content: params.content,
        relatedType: 'TASK',
        relatedId: params.taskId,
      },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkUrgentTasks() {
    this.logger.log('Starting daily check for urgent tasks...');
    const activeTasks = await this.prisma.client.productionTask.findMany({
      where: { status: { not: 'COMPLETED' } },
      include: {
        orderItem: {
          include: {
            part: true,
            order: {
              select: {
                customerName: true,
                responsibleUser: {
                  select: { id: true, isActive: true, realName: true },
                },
              },
            },
          },
        },
      },
    });

    const admins = await this.prisma.client.user.findMany({
      where: { isActive: true, role: 'ADMIN' },
      select: { id: true, realName: true },
    });

    let count = 0;
    for (const task of activeTasks) {
      const urgency = ProductionTaskService.calculateUrgency(task.targetDate);
      if (urgency === 'URGENT' || urgency === 'OVERDUE') {
        const title = urgency === 'OVERDUE' ? '任务已逾期' : '任务即将逾期';
        const hasResponsibleUser =
          task.orderItem.order.responsibleUser &&
          task.orderItem.order.responsibleUser.isActive;
        const content = hasResponsibleUser
          ? `零件 [${task.orderItem.part.name}] 的生产任务${title}，请及时处理。`
          : `零件 [${task.orderItem.part.name}] 的生产任务${title}，且当前未分配负责人，请管理员尽快处理。`;

        if (hasResponsibleUser) {
          await this.createTaskNotification({
            userId: task.orderItem.order.responsibleUser!.id,
            taskId: task.id,
            urgency,
            title,
            content,
            targetDate: task.targetDate,
          });
          count++;
          continue;
        }

        for (const admin of admins) {
          await this.createTaskNotification({
            userId: admin.id,
            taskId: task.id,
            urgency,
            title,
            content,
            targetDate: task.targetDate,
          });
          count++;
        }
      }
    }
    this.logger.log(`Created ${count} system notifications for urgent tasks.`);
  }

  async createTaskMessage(
    taskId: number,
    userId: number,
    data: CreateTaskMessageRequest,
  ) {
    const existingTask = await this.prisma.client.productionTask.findUnique({
      where: { id: taskId },
      select: { id: true },
    });
    if (!existingTask) {
      throw new NotFoundException('生产任务不存在');
    }

    const message = await this.prisma.client.taskMessage.create({
      data: {
        productionTaskId: taskId,
        userId,
        content: data.content,
      },
      include: { user: { select: { id: true, realName: true } } },
    });
    return message;
  }

  async getMyNotifications(userId: number) {
    return this.prisma.client.systemNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        content: true,
        isRead: true,
        relatedType: true,
        relatedId: true,
        createdAt: true,
      },
    });
  }

  async markAsRead(userId: number, notificationId: number) {
    return this.prisma.client.systemNotification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: number) {
    return this.prisma.client.systemNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
