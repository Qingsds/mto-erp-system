import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Client } from 'minio';
import { Readable } from 'node:stream';

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid MINIO_PORT: ${value}`);
  }
  return port;
}

function parseBoolean(value: string): boolean {
  return value.trim().toLowerCase() === 'true';
}

function isMinioNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? String(error.code) : '';
  const name = 'name' in error ? String(error.name) : '';
  return (
    code === 'NoSuchBucket' ||
    code === 'NoSuchKey' ||
    code === 'NotFound' ||
    name === 'NotFound'
  );
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket = readRequiredEnv('MINIO_BUCKET');
  private readonly client = new Client({
    endPoint: readRequiredEnv('MINIO_ENDPOINT'),
    port: parsePort(readRequiredEnv('MINIO_PORT')),
    useSSL: parseBoolean(process.env.MINIO_USE_SSL?.trim() ?? 'false'),
    accessKey: readRequiredEnv('MINIO_ACCESS_KEY'),
    secretKey: readRequiredEnv('MINIO_SECRET_KEY'),
  });

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        throw new Error(`MinIO bucket "${this.bucket}" does not exist`);
      }
    } catch (error) {
      this.logger.error('MinIO bucket validation failed', error as Error);
      throw error;
    }
  }

  async uploadObject(params: {
    key: string;
    body: Buffer;
    size: number;
    contentType: string;
  }) {
    const { key, body, size, contentType } = params;

    try {
      await this.client.putObject(this.bucket, key, body, size, {
        'Content-Type': contentType,
      });
    } catch (error) {
      this.logger.error(`Failed to upload object: ${key}`, error as Error);
      throw new InternalServerErrorException('文件上传失败');
    }
  }

  async getObjectStream(key: string): Promise<Readable> {
    try {
      return await this.client.getObject(this.bucket, key);
    } catch (error) {
      this.logger.warn(`Object not found in MinIO: ${key}`);
      if (isMinioNotFoundError(error)) {
        throw new NotFoundException('文件不存在或已丢失');
      }
      throw new InternalServerErrorException('文件读取失败');
    }
  }

  async statObject(key: string) {
    try {
      return await this.client.statObject(this.bucket, key);
    } catch (error) {
      if (isMinioNotFoundError(error)) {
        throw new NotFoundException('文件不存在或已丢失');
      }
      throw new InternalServerErrorException('文件读取失败');
    }
  }

  async removeObject(key: string) {
    try {
      await this.client.removeObject(this.bucket, key);
    } catch (error) {
      if (isMinioNotFoundError(error)) {
        return;
      }
      this.logger.error(`Failed to remove object: ${key}`, error as Error);
      throw new InternalServerErrorException('文件清理失败');
    }
  }
}
