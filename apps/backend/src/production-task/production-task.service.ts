import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTaskStatusRequest, TaskUrgencyType } from '@erp/shared-types';

@Injectable()
export class ProductionTaskService {
  constructor(private prisma: PrismaService) {}

  static calculateUrgency(targetDate: Date): TaskUrgencyType {
    const now = new Date();
    const target = new Date(targetDate);
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'OVERDUE';
    if (diffDays <= 3) return 'URGENT';
    return 'NORMAL';
  }

  async getTasksByOrderId(orderId: number) {
    const tasks = await this.prisma.client.productionTask.findMany({
      where: { orderItem: { orderId } },
      include: {
        orderItem: {
          include: {
            part: true,
            order: {
              select: {
                customerName: true,
                responsibleUser: {
                  select: { id: true, realName: true, role: true },
                },
              },
            },
          },
        },
        lastStatusUpdatedBy: {
          select: { id: true, realName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' }
    });

    return tasks.map((task: any) => ({
      ...task,
      urgency: ProductionTaskService.calculateUrgency(task.targetDate)
    }));
  }

  async findAll(page: number = 1, pageSize: number = 10, status?: string, keyword?: string) {
    const skip = (page - 1) * pageSize;
    const where: any = {};

    if (status) {
      where.status = status;
    }
    if (keyword) {
      where.orderItem = {
        part: {
          name: { contains: keyword, mode: 'insensitive' }
        }
      };
    }

    const [total, rawData] = await Promise.all([
      this.prisma.client.productionTask.count({ where }),
      this.prisma.client.productionTask.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: {
          orderItem: {
          include: {
              part: true,
              order: {
                select: {
                  customerName: true,
                  responsibleUser: {
                    select: { id: true, realName: true, role: true },
                  },
                },
              },
            }
          },
        },
      })
    ]);

    const data = rawData.map((task: any) => ({
      ...task,
      urgency: ProductionTaskService.calculateUrgency(task.targetDate)
    }));

    return {
      total,
      data,
      page: Number(page),
      pageSize: Number(pageSize)
    };
  }

  async getTaskById(id: number) {
    const task = await this.prisma.client.productionTask.findUnique({
      where: { id },
      include: {
        orderItem: {
          include: {
            part: { include: { drawings: { where: { isLatest: true } } } },
            order: {
              select: {
                id: true,
                customerName: true,
                responsibleUser: {
                  select: { id: true, realName: true, role: true },
                },
              },
            },
          },
        },
        lastStatusUpdatedBy: {
          select: { id: true, realName: true, role: true },
        },
        messages: { include: { user: { select: { id: true, realName: true } } }, orderBy: { createdAt: 'desc' } }
      }
    });

    if (!task) throw new NotFoundException('Task not found');

    return {
      ...task,
      urgency: ProductionTaskService.calculateUrgency(task.targetDate)
    };
  }

  async updateTaskStatus(id: number, data: UpdateTaskStatusRequest, userId: number) {
    await this.prisma.client.productionTask.update({
      where: { id },
      data: {
        status: data.status,
        lastStatusUpdatedById: userId,
        lastStatusUpdatedAt: new Date(),
      },
    });
    return this.getTaskById(id);
  }
}
