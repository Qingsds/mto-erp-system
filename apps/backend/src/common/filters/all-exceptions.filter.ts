/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// apps/backend/src/common/filters/all-exceptions.filter.ts
import { Prisma } from '@erp/database';
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';

    // 1. 处理 NestJS 标准 HTTP 异常 (含 class-validator 的校验失败拦截)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res: any = exception.getResponse();
      // 如果是验证管道抛出的数组错误，提取出来友好展示
      message = Array.isArray(res.message)
        ? res.message.join(', ')
        : res.message || exception.message;
    }
    // 2. 处理 Prisma 数据库层面的已知错误拦截
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      switch (exception.code) {
        case 'P2002':
          message = '数据写入失败：违反唯一约束，该数据已被使用或已存在。';
          break;
        case 'P2003':
          message = '数据操作失败：外键约束不匹配，引用的目标数据不存在。';
          break;
        case 'P2025':
          message = '数据操作失败：未找到指定的记录。';
          break;
        default:
          message = `数据库操作异常 [${exception.code}]`;
      }
    }
    // 3. 处理其他未知崩溃
    else if (exception instanceof Error) {
      message = exception.message;
      // 生产环境中建议将此类 exception.stack 打印到日志系统而不是返回给前端
      console.error('Unhandled Exception:', exception);
    }

    // 强制转换为我们约定的 ApiResponse 结构
    response.status(status).json({
      code: status,
      message: message,
      data: null,
    });
  }
}
