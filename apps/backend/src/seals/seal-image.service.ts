import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import sharp = require('sharp');

const MIN_RED_CHANNEL = 120;
const MIN_RED_DOMINANCE = 26;
const MIN_SATURATION = 24;
const BACKGROUND_BRIGHTNESS_THRESHOLD = 228;
const BACKGROUND_RED_DOMINANCE_THRESHOLD = 48;
const ALPHA_MASK_CUTOFF = 0.52;

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
          r >= MIN_RED_CHANNEL &&
          redDominance >= MIN_RED_DOMINANCE &&
          saturation >= MIN_SATURATION &&
          !(
            brightness > BACKGROUND_BRIGHTNESS_THRESHOLD &&
            redDominance < BACKGROUND_RED_DOMINANCE_THRESHOLD
          );

        if (!keepAsSeal) {
          output[index] = 0;
          output[index + 1] = 0;
          output[index + 2] = 0;
          output[index + 3] = 0;
          continue;
        }

        const density =
          redDominance / 150 +
          (saturation / 255) * 0.55 +
          clamp((245 - brightness) / 255, 0, 0.28);
        const normalizedAlpha = clamp(density * alpha, 0, 1);
        const alphaMask = clamp(
          (normalizedAlpha - ALPHA_MASK_CUTOFF) /
            (1 - ALPHA_MASK_CUTOFF),
          0,
          1,
        );

        // 直接裁掉低置信度边缘，优先保证透明背景干净。
        if (alphaMask < 0.2) {
          output[index] = 0;
          output[index + 1] = 0;
          output[index + 2] = 0;
          output[index + 3] = 0;
          continue;
        }

        // 历史原图多数已经被合成到白底/棋盘格底图里，不能复用原 alpha。
        // 这里保留原始 RGB 纹理，但透明度完全由红章掩码重新生成，
        // 这样既能保留字形细节，也能真正去掉背景。
        output[index] = r;
        output[index + 1] = g;
        output[index + 2] = b;
        output[index + 3] = Math.round(255 * Math.max(0.58, alphaMask));
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
