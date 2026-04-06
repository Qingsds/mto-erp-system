import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import sharp = require('sharp');

const OUTPUT_RED = { r: 188, g: 24, b: 24 };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

@Injectable()
export class SealImageService {
  private readonly logger = new Logger(SealImageService.name);

  /**
   * 清洗印章 PNG。
   *
   * 目标：
   * - 去掉棋盘格、白底、灰底等非印章背景
   * - 尽量保留红章文字、边框和五角星
   * - 输出统一红色、透明背景的可盖章 PNG
   */
  async sanitizeSealPng(source: Buffer): Promise<Buffer> {
    try {
      const { data, info } = await sharp(source)
        .ensureAlpha()
        .median(1)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const output = Buffer.alloc(data.length);

      for (let index = 0; index < data.length; index += info.channels) {
        const r = data[index] ?? 0;
        const g = data[index + 1] ?? 0;
        const b = data[index + 2] ?? 0;
        const a = data[index + 3] ?? 255;

        const alpha = a / 255;
        const maxChannel = Math.max(r, g, b);
        const minChannel = Math.min(r, g, b);
        const saturation = maxChannel - minChannel;
        const redDominance = r - Math.max(g, b);
        const brightness = (r + g + b) / 3;

        const keepAsSeal =
          alpha > 0.05 &&
          r >= 96 &&
          redDominance >= 16 &&
          saturation >= 14 &&
          !(brightness > 242 && redDominance < 28);

        if (!keepAsSeal) {
          output[index] = 0;
          output[index + 1] = 0;
          output[index + 2] = 0;
          output[index + 3] = 0;
          continue;
        }

        const density =
          redDominance / 160 +
          saturation / 255 * 0.45 +
          clamp((255 - brightness) / 255, 0, 0.35);
        const normalizedAlpha = clamp(density * alpha, 0.25, 1);

        output[index] = OUTPUT_RED.r;
        output[index + 1] = OUTPUT_RED.g;
        output[index + 2] = OUTPUT_RED.b;
        output[index + 3] = Math.round(255 * normalizedAlpha);
      }

      return await sharp(output, {
        raw: {
          width: info.width,
          height: info.height,
          channels: info.channels,
        },
      })
        .png({
          compressionLevel: 9,
          adaptiveFiltering: true,
          effort: 10,
        })
        .toBuffer();
    } catch (error) {
      this.logger.error('Seal image sanitize failed', error as Error);
      throw new InternalServerErrorException('印章图片清洗失败');
    }
  }

  toPreviewDataUrl(buffer: Buffer): string {
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }
}
