/**
 * 对账单 PDF 生成器。
 *
 * 约束：
 * - 仅服务对账单场景
 * - 生成“原始版”与“已盖章归档版”两种 PDF
 * - 优先尝试加载可用中文字体，避免中文字段在 PDF 中变成乱码
 */

import { access, readFile } from 'node:fs/promises';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

type NumericLike = string | number | { toString(): string };

interface BillingPdfPart {
  partNumber: string;
  name: string;
  material: string;
  spec?: string | null;
}

interface BillingPdfDeliveryItem {
  shippedQty: number;
  remark?: string | null;
  deliveryNote: {
    id: number;
    deliveryDate: Date | string;
  };
  orderItem: {
    unitPrice: NumericLike;
    part: BillingPdfPart;
  };
}

interface BillingPdfItem {
  id: number;
  description?: string | null;
  amount: NumericLike;
  deliveryItem?: BillingPdfDeliveryItem | null;
}

export interface BillingPdfData {
  id: number;
  customerName: string;
  status: string;
  totalAmount: NumericLike;
  createdAt: Date | string;
  items: BillingPdfItem[];
}

interface CreateBillingPdfParams {
  billing: BillingPdfData;
  sealName?: string;
  archivedAt?: Date;
}

const PDF_FONT_CANDIDATES = [
  process.env.BILLING_PDF_FONT_PATH?.trim(),
  process.env.PDF_FONT_PATH?.trim(),
  '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
  '/System/Library/Fonts/Hiragino Sans GB.ttc',
  '/System/Library/Fonts/STHeiti Medium.ttc',
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
  '/usr/share/fonts/opentype/noto/NotoSansCJKsc-Regular.otf',
  '/usr/share/fonts/truetype/arphic/ukai.ttc',
].filter((value): value is string => !!value);

function formatBillingNo(id: number): string {
  return `BIL-${String(id).padStart(6, '0')}`;
}

function formatDateTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function formatMoney(value: NumericLike): string {
  const normalized =
    typeof value === 'number'
      ? value
      : Number.parseFloat(typeof value === 'string' ? value : value.toString());
  const amount = Number.isFinite(normalized) ? normalized : 0;
  return `¥${amount.toFixed(2)}`;
}

function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  measureWidth: (value: string) => number,
): string[] {
  const rawLines = text.split('\n');
  const lines: string[] = [];

  for (const rawLine of rawLines) {
    let current = '';
    for (const char of Array.from(rawLine)) {
      const next = `${current}${char}`;
      if (current && measureWidth(next) > maxWidth) {
        lines.push(current);
        current = char;
      } else {
        current = next;
      }
    }
    lines.push(current || ' ');
  }

  return lines;
}

async function loadBillingPdfFontBytes(): Promise<Uint8Array> {
  for (const candidate of PDF_FONT_CANDIDATES) {
    try {
      await access(candidate);
      const fontBytes = await readFile(candidate);
      return new Uint8Array(fontBytes);
    } catch {
      continue;
    }
  }

  throw new Error('未找到可用于生成对账 PDF 的字体文件');
}

function buildItemLines(item: BillingPdfItem): string[] {
  if (!item.deliveryItem) {
    return [
      '类型：附加费用',
      `说明：${item.description?.trim() || '未填写说明'}`,
      `金额：${formatMoney(item.amount)}`,
    ];
  }

  const { deliveryItem } = item;
  const { part } = deliveryItem.orderItem;
  const deliveryDate = formatDateTime(deliveryItem.deliveryNote.deliveryDate);
  const remark = deliveryItem.remark?.trim() || item.description?.trim() || '—';

  return [
    '类型：发货结算',
    `零件：${part.name} / ${part.partNumber}`,
    `材质规格：${part.material}${part.spec ? ` / ${part.spec}` : ''}`,
    `来源发货单：DLV-${String(deliveryItem.deliveryNote.id).padStart(6, '0')} / ${deliveryDate}`,
    `数量：${deliveryItem.shippedQty} 件`,
    `单价快照：${formatMoney(deliveryItem.orderItem.unitPrice)}`,
    `金额：${formatMoney(item.amount)}`,
    `备注：${remark}`,
  ];
}

export async function createBillingPdfBuffer(
  params: CreateBillingPdfParams,
): Promise<Uint8Array> {
  const { billing, sealName, archivedAt } = params;
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontBytes = await loadBillingPdfFontBytes();
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });

  const pageSize = { width: 595.28, height: 841.89 };
  const marginX = 40;
  const topY = pageSize.height - 44;
  const bottomPadding = 44;
  const contentWidth = pageSize.width - marginX * 2;
  const titleSize = 18;
  const bodySize = 10.5;
  const lineHeight = 16;
  const sectionGap = 10;
  const blockPadding = 10;
  const blockWidth = contentWidth - blockPadding * 2;

  let page = pdfDoc.addPage([pageSize.width, pageSize.height]);
  let cursorY = topY;

  const drawWrappedText = (
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    fontSize: number,
    color: ReturnType<typeof rgb>,
  ): number => {
    const lines = wrapText(text, maxWidth, fontSize, (value) =>
      font.widthOfTextAtSize(value, fontSize),
    );

    let nextY = y;
    for (const line of lines) {
      page.drawText(line, {
        x,
        y: nextY,
        size: fontSize,
        font,
        color,
      });
      nextY -= lineHeight;
    }

    return nextY;
  };

  const drawPageHeader = () => {
    page.drawText('对账单', {
      x: marginX,
      y: cursorY,
      size: titleSize,
      font,
      color: rgb(0.08, 0.08, 0.08),
    });

    if (sealName && archivedAt) {
      const badgeWidth = 140;
      const badgeHeight = 48;
      const badgeX = pageSize.width - marginX - badgeWidth;
      const badgeY = cursorY - 8;

      page.drawRectangle({
        x: badgeX,
        y: badgeY - badgeHeight + 10,
        width: badgeWidth,
        height: badgeHeight,
        borderWidth: 1.2,
        borderColor: rgb(0.75, 0.12, 0.12),
      });

      page.drawText('已盖章归档', {
        x: badgeX + 16,
        y: badgeY - 8,
        size: 12,
        font,
        color: rgb(0.75, 0.12, 0.12),
      });
      page.drawText(`印章：${sealName}`, {
        x: badgeX + 16,
        y: badgeY - 24,
        size: 9,
        font,
        color: rgb(0.75, 0.12, 0.12),
      });
    }

    cursorY -= 30;

    const metaLines = [
      `对账单号：${formatBillingNo(billing.id)}`,
      `客户名称：${billing.customerName}`,
      `当前状态：${billing.status}`,
      `创建时间：${formatDateTime(billing.createdAt)}`,
      `应收总额：${formatMoney(billing.totalAmount)}`,
      sealName && archivedAt
        ? `归档时间：${formatDateTime(archivedAt)}`
        : '文件类型：原始对账单 PDF',
    ];

    for (const line of metaLines) {
      cursorY = drawWrappedText(
        line,
        marginX,
        cursorY,
        contentWidth,
        bodySize,
        rgb(0.2, 0.2, 0.2),
      );
    }

    cursorY -= sectionGap;
  };

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY - requiredHeight >= bottomPadding) {
      return;
    }

    page = pdfDoc.addPage([pageSize.width, pageSize.height]);
    cursorY = topY;
    drawPageHeader();
  };

  drawPageHeader();

  const linkedCount = billing.items.filter(
    (item) => !!item.deliveryItem,
  ).length;
  const extraCount = billing.items.length - linkedCount;
  const summaryLines = [
    `结算项总数：${billing.items.length} 项`,
    `发货结算项：${linkedCount} 项`,
    `附加费用项：${extraCount} 项`,
  ];

  ensureSpace(90);
  page.drawRectangle({
    x: marginX,
    y: cursorY - 62,
    width: contentWidth,
    height: 62,
    borderWidth: 1,
    borderColor: rgb(0.86, 0.87, 0.89),
  });
  let summaryY = cursorY - 18;
  for (const line of summaryLines) {
    page.drawText(line, {
      x: marginX + blockPadding,
      y: summaryY,
      size: bodySize,
      font,
      color: rgb(0.24, 0.24, 0.24),
    });
    summaryY -= 16;
  }
  cursorY -= 78;

  for (let index = 0; index < billing.items.length; index += 1) {
    const item = billing.items[index];
    const itemTitle = item.deliveryItem
      ? `明细 ${index + 1} · 发货结算`
      : `明细 ${index + 1} · 附加费用`;
    const itemLines = buildItemLines(item);
    const lineCount = itemLines.reduce((count, line) => {
      return (
        count +
        wrapText(line, blockWidth, bodySize, (value) =>
          font.widthOfTextAtSize(value, bodySize),
        ).length
      );
    }, 0);
    const blockHeight = lineCount * lineHeight + 34;

    ensureSpace(blockHeight + sectionGap);

    page.drawRectangle({
      x: marginX,
      y: cursorY - blockHeight,
      width: contentWidth,
      height: blockHeight,
      borderWidth: 1,
      borderColor: rgb(0.86, 0.87, 0.89),
    });
    page.drawText(itemTitle, {
      x: marginX + blockPadding,
      y: cursorY - 18,
      size: 11,
      font,
      color: rgb(0.08, 0.08, 0.08),
    });

    let blockCursorY = cursorY - 36;
    for (const line of itemLines) {
      blockCursorY = drawWrappedText(
        line,
        marginX + blockPadding,
        blockCursorY,
        blockWidth,
        bodySize,
        rgb(0.22, 0.22, 0.22),
      );
    }

    cursorY -= blockHeight + sectionGap;
  }

  ensureSpace(48);
  page.drawText(`应收总额：${formatMoney(billing.totalAmount)}`, {
    x: marginX,
    y: cursorY - 12,
    size: 12,
    font,
    color: rgb(0.08, 0.08, 0.08),
  });

  return await pdfDoc.save();
}
