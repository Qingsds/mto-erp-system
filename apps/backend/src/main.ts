import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 1. 开启全局跨域，方便前端联调
  app.enableCors();

  // 2. 挂载全局强校验管道 (防御异常脏数据流入)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动剔除前端多传的非 DTO 定义字段
      transform: true, // 自动将字符串类型的入参转换为定义的 Number/Boolean 类型
    }),
  );

  // 3. 挂载全局异常拦截器 (规范化报错输出格式)
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
