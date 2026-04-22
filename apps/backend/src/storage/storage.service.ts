import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Client } from 'minio';
import { Readable } from 'node:stream';

async function readStreamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

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

function maskAccessKey(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return '*'.repeat(trimmed.length);
  return `${trimmed.slice(0, 2)}${'*'.repeat(trimmed.length - 4)}${trimmed.slice(-2)}`;
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
  private readonly endPoint = readRequiredEnv('MINIO_ENDPOINT');
  private readonly port = parsePort(readRequiredEnv('MINIO_PORT'));
  private readonly useSSL = parseBoolean(process.env.MINIO_USE_SSL?.trim() ?? 'false');
  private readonly accessKey = readRequiredEnv('MINIO_ACCESS_KEY');
  private readonly secretKey = readRequiredEnv('MINIO_SECRET_KEY');
  private readonly skipValidation = parseBoolean(
    process.env.MINIO_SKIP_VALIDATE?.trim() ?? 'false',
  );
  private readonly client = new Client({
    endPoint: this.endPoint,
    port: this.port,
    useSSL: this.useSSL,
    accessKey: this.accessKey,
    secretKey: this.secretKey,
  });

  async onModuleInit() {
    if (this.skipValidation) {
      this.logger.warn(
        `MinIO validation skipped (MINIO_SKIP_VALIDATE=true): ${this.endPoint}:${this.port}/${this.bucket}`,
      );
      return;
    }

    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        throw new Error(`MinIO bucket "${this.bucket}" does not exist`);
      }
    } catch (error) {
      const errorCode =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: unknown }).code)
          : '';
      const baseMessage = `MinIO initialization failed for ${this.endPoint}:${this.port}/${this.bucket} (accessKey=${maskAccessKey(this.accessKey)})`;
      const message = errorCode ? `${baseMessage} code=${errorCode}` : baseMessage;
      this.logger.error(message, error as Error);
      throw new Error(
        `${message}. Check MINIO_ACCESS_KEY/MINIO_SECRET_KEY and bucket existence. Set MINIO_SKIP_VALIDATE=true to bypass validation.`,
        { cause: error as Error },
      );
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

  async getObjectBuffer(key: string): Promise<Buffer> {
    const stream = await this.getObjectStream(key);
    return await readStreamToBuffer(stream);
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

  async removeObjectSafe(key: string) {
    try {
      await this.removeObject(key);
    } catch (error) {
      this.logger.warn(`Best-effort removal failed for object: ${key}`, error as Error);
    }
  }

  async removeObjectsSafe(keys: string[]) {
    for (const key of [...new Set(keys.filter(Boolean))]) {
      await this.removeObjectSafe(key);
    }
  }

  async copyObject(params: { sourceKey: string; destinationKey: string }) {
    try {
      const { sourceKey, destinationKey } = params;
      // MinIO JS SDK: copyObject(bucketName, objectName, sourceObject, conditions)
      // sourceObject is /bucketName/sourceKey
      await this.client.copyObject(
        this.bucket,
        destinationKey,
        `/${this.bucket}/${sourceKey}`,
        new (require('minio').CopyConditions)()
      );
    } catch (error) {
      this.logger.error(`Failed to copy object from ${params.sourceKey} to ${params.destinationKey}`, error as Error);
      throw new InternalServerErrorException('文件处理失败');
    }
  }
}
