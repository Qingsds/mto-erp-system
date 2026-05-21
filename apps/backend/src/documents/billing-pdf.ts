/**
 * 对账单 PDF 生成器。
 *
 * 生成结构：
 * - 第 1 页起为合集表格
 * - 后续按订单号分别生成 A4 发货单
 * - 表格样式对齐客户样例：公司抬头、清单标题、日期/名称/单位/数量/单价/总价六列、合计行
 */

import { access, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { PDFDocument, PDFPage, PDFFont, rgb } from 'pdf-lib';
import * as fontkit from '@pdf-lib/fontkit';
import sharp = require('sharp');

type NumericLike = string | number | { toString(): string };

interface BillingPdfPart {
  partNumber: string;
  name: string;
  material: string;
  spec?: string | null;
}

interface BillingPdfOrder {
  id: number;
  customerName?: string | null;
  createdAt?: Date | string;
}

interface BillingPdfDeliveryItem {
  shippedQty: number;
  remark?: string | null;
  deliveryNote: {
    id: number;
    deliveryDate: Date | string;
  };
  orderItem: {
    orderId: number;
    orderedQty: number;
    shippedQty: number;
    unitPrice: NumericLike;
    order?: BillingPdfOrder | null;
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
  archivedAt?: Date;
}

export interface BillingSealPlacement {
  pageIndex: number;
  xRatio: number;
  yRatio: number;
  widthRatio: number;
}

export interface BillingSeamSealOptions {
  enabled?: boolean;
}

interface StatementRow {
  type: 'delivery' | 'extra';
  orderId: number | null;
  date: Date | string | null;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  shortageQty: number;
}

interface OrderGroup {
  orderId: number;
  rows: StatementRow[];
  totalAmount: number;
  minDate: Date | string | null;
  maxDate: Date | string | null;
}

interface SummaryRow {
  orderNo: string;
  date: string;
  amount: number;
}

interface TableColumn {
  title: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  value: (row: StatementRow) => string;
}

interface SummaryColumn {
  title: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  value: (row: SummaryRow) => string;
}

const localRequire = createRequire(__filename);

const COMPANY_NAME = '濮阳市瑞海隆鑫设备制造有限公司';
const PAGE_SIZE = { width: 595.28, height: 841.89 };
const MARGIN_X = 42;
const TOP_Y = PAGE_SIZE.height - 86;
const BOTTOM_Y = 70;
const TABLE_WIDTH = PAGE_SIZE.width - MARGIN_X * 2;
const TEXT_COLOR = rgb(0.08, 0.08, 0.08);
const LINE_COLOR = rgb(0.12, 0.12, 0.12);

const COLUMNS: TableColumn[] = [
  {
    title: '日期',
    width: 75,
    align: 'center',
    value: (row) => (row.date ? formatDate(row.date) : ''),
  },
  {
    title: '名称',
    width: 180,
    align: 'center',
    value: (row) => row.name,
  },
  {
    title: '单位',
    width: 45,
    align: 'center',
    value: (row) => row.unit,
  },
  {
    title: '数量',
    width: 55,
    align: 'center',
    value: (row) => formatQty(row.quantity),
  },
  {
    title: '单价（元）',
    width: 70,
    align: 'center',
    value: (row) => formatPlainMoney(row.unitPrice),
  },
  {
    title: '总价（元）',
    width: TABLE_WIDTH - 75 - 180 - 45 - 55 - 70,
    align: 'center',
    value: (row) => formatPlainMoney(row.amount),
  },
];

const SUMMARY_COLUMNS: SummaryColumn[] = [
  {
    title: '订单号',
    width: 190,
    align: 'center',
    value: (row) => row.orderNo,
  },
  {
    title: '日期',
    width: 190,
    align: 'center',
    value: (row) => row.date,
  },
  {
    title: '应收金额（元）',
    width: TABLE_WIDTH - 190 - 190,
    align: 'center',
    value: (row) => formatPlainMoney(row.amount),
  },
];

function resolveEmbedPdfFontPath(fileName: string): string | null {
  try {
    const entryPath = localRequire.resolve('@embedpdf/fonts-sc');
    return join(dirname(entryPath), '..', 'fonts', fileName);
  } catch {
    return null;
  }
}

const PDF_FONT_CANDIDATES = [
  process.env.BILLING_PDF_FONT_PATH?.trim(),
  process.env.PDF_FONT_PATH?.trim(),
  resolveEmbedPdfFontPath('NotoSansHans-Regular.otf'),
  resolveEmbedPdfFontPath('NotoSansHans-Medium.otf'),
  resolveEmbedPdfFontPath('NotoSansHans-Bold.otf'),
  '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
  '/System/Library/Fonts/Hiragino Sans GB.ttc',
  '/System/Library/Fonts/STHeiti Medium.ttc',
  'C:/Windows/Fonts/msyh.ttc',
  'C:/Windows/Fonts/msyh.ttf',
  'C:/Windows/Fonts/simsun.ttc',
  'C:/Windows/Fonts/simhei.ttf',
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
  '/usr/share/fonts/opentype/noto/NotoSansCJKsc-Regular.otf',
  '/usr/share/fonts/truetype/arphic/ukai.ttc',
].filter((value): value is string => !!value);

function coerceDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatDate(value: Date | string): string {
  const date = coerceDate(value);
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function formatOrderNo(id: number): string {
  return `ORD-${String(id).padStart(6, '0')}`;
}

function formatDateRange(
  start: Date | string | null,
  end: Date | string | null,
): string {
  if (!start && !end) return '';
  if (!start || !end) return formatDate(start ?? end!);

  const startText = formatDate(start);
  const endText = formatDate(end);
  return startText === endText ? startText : `${startText}-${endText}`;
}

function toNumber(value: NumericLike | null | undefined): number {
  if (value == null) return 0;
  const normalized =
    typeof value === 'number'
      ? value
      : Number.parseFloat(typeof value === 'string' ? value : value.toString());
  return Number.isFinite(normalized) ? normalized : 0;
}

function formatQty(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatPlainMoney(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function compactText(value: string | null | undefined, fallback = '-'): string {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  return normalized || fallback;
}

function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  font: PDFFont,
): string[] {
  const lines: string[] = [];
  for (const rawLine of compactText(text).split('\n')) {
    let current = '';
    for (const char of Array.from(rawLine)) {
      const next = `${current}${char}`;
      if (current && font.widthOfTextAtSize(next, fontSize) > maxWidth) {
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
      return new Uint8Array(await readFile(candidate));
    } catch {
      continue;
    }
  }
  throw new Error('未找到可用于生成对账 PDF 的字体文件');
}

function buildPartName(part: BillingPdfPart, shortageQty: number): string {
  const tokens = [part.name, part.partNumber, part.material, part.spec]
    .map((value) => compactText(value, ''))
    .filter(Boolean);
  const baseName = tokens.join(' ');
  return shortageQty > 0 ? `${baseName}（缺件 ${shortageQty}）` : baseName;
}

function normalizeRows(billing: BillingPdfData): StatementRow[] {
  return billing.items.map((item) => {
    if (!item.deliveryItem) {
      const amount = toNumber(item.amount);
      return {
        type: 'extra',
        orderId: null,
        date: billing.createdAt,
        name: compactText(item.description, '附加费用'),
        unit: '项',
        quantity: 1,
        unitPrice: amount,
        amount,
        shortageQty: 0,
      };
    }

    const { deliveryItem } = item;
    const { orderItem } = deliveryItem;
    const shortageQty = Math.max(
      0,
      orderItem.orderedQty - orderItem.shippedQty,
    );
    return {
      type: 'delivery',
      orderId: orderItem.orderId,
      date: deliveryItem.deliveryNote.deliveryDate,
      name: buildPartName(orderItem.part, shortageQty),
      unit: '个',
      quantity: deliveryItem.shippedQty,
      unitPrice: toNumber(orderItem.unitPrice),
      amount: toNumber(item.amount),
      shortageQty,
    };
  });
}

function groupRowsByOrder(rows: StatementRow[]): OrderGroup[] {
  const groups = new Map<number, OrderGroup>();

  for (const row of rows) {
    if (row.type !== 'delivery' || row.orderId == null) continue;
    const existing = groups.get(row.orderId);
    if (existing) {
      existing.rows.push(row);
      existing.totalAmount += row.amount;
    } else {
      groups.set(row.orderId, {
        orderId: row.orderId,
        rows: [row],
        totalAmount: row.amount,
        minDate: row.date,
        maxDate: row.date,
      });
      continue;
    }

    if (row.date) {
      if (
        !existing.minDate ||
        coerceDate(row.date) < coerceDate(existing.minDate)
      ) {
        existing.minDate = row.date;
      }
      if (
        !existing.maxDate ||
        coerceDate(row.date) > coerceDate(existing.maxDate)
      ) {
        existing.maxDate = row.date;
      }
    }
  }

  return Array.from(groups.values()).sort((a, b) => a.orderId - b.orderId);
}

function buildSummaryRows(groups: OrderGroup[]): SummaryRow[] {
  return groups.map((group) => ({
    orderNo: formatOrderNo(group.orderId),
    date: formatDateRange(group.minDate, group.maxDate),
    amount: group.totalAmount,
  }));
}

function addPage(pdfDoc: PDFDocument): PDFPage {
  return pdfDoc.addPage([PAGE_SIZE.width, PAGE_SIZE.height]);
}

function drawText(params: {
  page: PDFPage;
  font: PDFFont;
  text: string;
  x: number;
  y: number;
  size: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
}) {
  const { page, font, text, x, y, size, maxWidth, align = 'left' } = params;
  const textWidth = font.widthOfTextAtSize(text, size);
  let nextX = x;
  if (maxWidth && align === 'center') {
    nextX = x + Math.max(0, (maxWidth - textWidth) / 2);
  } else if (maxWidth && align === 'right') {
    nextX = x + Math.max(0, maxWidth - textWidth);
  }
  page.drawText(text, { x: nextX, y, size, font, color: TEXT_COLOR });
}

function drawCellText(params: {
  page: PDFPage;
  font: PDFFont;
  text: string;
  x: number;
  yTop: number;
  width: number;
  height: number;
  size: number;
  align?: 'left' | 'center' | 'right';
}) {
  const {
    page,
    font,
    text,
    x,
    yTop,
    width,
    height,
    size,
    align = 'center',
  } = params;
  const innerWidth = width - 8;
  const lineHeight = size + 2.5;
  const lines = wrapText(text, innerWidth, size, font);
  const maxLines = Math.max(1, Math.floor((height - 6) / lineHeight));
  const visibleLines = lines.slice(0, maxLines);

  if (lines.length > maxLines && visibleLines.length > 0) {
    const lastIndex = visibleLines.length - 1;
    visibleLines[lastIndex] = `${visibleLines[lastIndex].slice(0, -1)}…`;
  }

  const textHeight = visibleLines.length * lineHeight;
  let y = yTop - (height - textHeight) / 2 - size;

  for (const line of visibleLines) {
    drawText({
      page,
      font,
      text: line,
      x: x + 4,
      y,
      size,
      maxWidth: innerWidth,
      align,
    });
    y -= lineHeight;
  }
}

function rowHeight(row: StatementRow, font: PDFFont, fontSize: number): number {
  const lineHeight = fontSize + 2.5;
  const maxLines = COLUMNS.reduce((max, column) => {
    const lines = wrapText(column.value(row), column.width - 8, fontSize, font);
    return Math.max(max, lines.length);
  }, 1);
  return Math.max(28, maxLines * lineHeight + 10);
}

function drawGrid(
  page: PDFPage,
  x: number,
  yTop: number,
  widths: number[],
  height: number,
) {
  const totalWidth = widths.reduce((sum, width) => sum + width, 0);
  page.drawRectangle({
    x,
    y: yTop - height,
    width: totalWidth,
    height,
    borderWidth: 1,
    borderColor: LINE_COLOR,
  });

  let cursorX = x;
  for (const width of widths.slice(0, -1)) {
    cursorX += width;
    page.drawLine({
      start: { x: cursorX, y: yTop },
      end: { x: cursorX, y: yTop - height },
      thickness: 0.8,
      color: LINE_COLOR,
    });
  }
}

function drawHeader(page: PDFPage, font: PDFFont, title: string) {
  const companyHeight = 34;
  const titleHeight = 32;

  drawGrid(page, MARGIN_X, TOP_Y, [TABLE_WIDTH], companyHeight);
  drawText({
    page,
    font,
    text: COMPANY_NAME,
    x: MARGIN_X,
    y: TOP_Y - 23,
    size: 16,
    maxWidth: TABLE_WIDTH,
    align: 'center',
  });

  drawGrid(page, MARGIN_X, TOP_Y - companyHeight, [TABLE_WIDTH], titleHeight);
  drawText({
    page,
    font,
    text: title,
    x: MARGIN_X,
    y: TOP_Y - companyHeight - 22,
    size: 14,
    maxWidth: TABLE_WIDTH,
    align: 'center',
  });
}

function drawTableHeader(page: PDFPage, font: PDFFont, yTop: number) {
  const height = 30;
  drawGrid(
    page,
    MARGIN_X,
    yTop,
    COLUMNS.map((column) => column.width),
    height,
  );

  let x = MARGIN_X;
  for (const column of COLUMNS) {
    drawCellText({
      page,
      font,
      text: column.title,
      x,
      yTop,
      width: column.width,
      height,
      size: 10.5,
      align: 'center',
    });
    x += column.width;
  }
}

function drawRow(
  page: PDFPage,
  font: PDFFont,
  row: StatementRow,
  yTop: number,
  height: number,
) {
  drawGrid(
    page,
    MARGIN_X,
    yTop,
    COLUMNS.map((column) => column.width),
    height,
  );

  let x = MARGIN_X;
  for (const column of COLUMNS) {
    drawCellText({
      page,
      font,
      text: column.value(row),
      x,
      yTop,
      width: column.width,
      height,
      size: 9.5,
      align: column.align ?? 'center',
    });
    x += column.width;
  }
}

function drawTotalRow(
  page: PDFPage,
  font: PDFFont,
  yTop: number,
  totalAmount: number,
) {
  const height = 32;
  const labelWidth = COLUMNS.slice(0, 5).reduce(
    (sum, column) => sum + column.width,
    0,
  );
  const amountWidth = COLUMNS[5].width;
  drawGrid(page, MARGIN_X, yTop, [labelWidth, amountWidth], height);
  drawText({
    page,
    font,
    text: '合计（元）',
    x: MARGIN_X,
    y: yTop - 21,
    size: 10.5,
    maxWidth: labelWidth,
    align: 'center',
  });
  drawText({
    page,
    font,
    text: formatPlainMoney(totalAmount),
    x: MARGIN_X + labelWidth,
    y: yTop - 21,
    size: 10.5,
    maxWidth: amountWidth,
    align: 'center',
  });
}

function drawSheetPages(params: {
  pdfDoc: PDFDocument;
  font: PDFFont;
  title: string;
  rows: StatementRow[];
  totalAmount: number;
}) {
  const { pdfDoc, font, title, rows, totalAmount } = params;
  let page = addPage(pdfDoc);
  drawHeader(page, font, title);

  let cursorY = TOP_Y - 66;
  drawTableHeader(page, font, cursorY);
  cursorY -= 30;

  for (const row of rows) {
    const height = rowHeight(row, font, 9.5);
    if (cursorY - height < BOTTOM_Y + 36) {
      page = addPage(pdfDoc);
      drawHeader(page, font, `${title}（续）`);
      cursorY = TOP_Y - 66;
      drawTableHeader(page, font, cursorY);
      cursorY -= 30;
    }
    drawRow(page, font, row, cursorY, height);
    cursorY -= height;
  }

  if (cursorY - 32 < BOTTOM_Y) {
    page = addPage(pdfDoc);
    drawHeader(page, font, `${title}（续）`);
    cursorY = TOP_Y - 66;
    drawTableHeader(page, font, cursorY);
    cursorY -= 30;
  }

  drawTotalRow(page, font, cursorY, totalAmount);
}

function summaryRowHeight(
  row: SummaryRow,
  font: PDFFont,
  fontSize: number,
): number {
  const lineHeight = fontSize + 2.5;
  const maxLines = SUMMARY_COLUMNS.reduce((max, column) => {
    const lines = wrapText(column.value(row), column.width - 8, fontSize, font);
    return Math.max(max, lines.length);
  }, 1);
  return Math.max(32, maxLines * lineHeight + 10);
}

function drawSummaryTableHeader(page: PDFPage, font: PDFFont, yTop: number) {
  const height = 30;
  drawGrid(
    page,
    MARGIN_X,
    yTop,
    SUMMARY_COLUMNS.map((column) => column.width),
    height,
  );

  let x = MARGIN_X;
  for (const column of SUMMARY_COLUMNS) {
    drawCellText({
      page,
      font,
      text: column.title,
      x,
      yTop,
      width: column.width,
      height,
      size: 10.5,
      align: 'center',
    });
    x += column.width;
  }
}

function drawSummaryRow(
  page: PDFPage,
  font: PDFFont,
  row: SummaryRow,
  yTop: number,
  height: number,
) {
  drawGrid(
    page,
    MARGIN_X,
    yTop,
    SUMMARY_COLUMNS.map((column) => column.width),
    height,
  );

  let x = MARGIN_X;
  for (const column of SUMMARY_COLUMNS) {
    drawCellText({
      page,
      font,
      text: column.value(row),
      x,
      yTop,
      width: column.width,
      height,
      size: 10,
      align: column.align ?? 'center',
    });
    x += column.width;
  }
}

function drawSummaryTotalRow(
  page: PDFPage,
  font: PDFFont,
  yTop: number,
  totalAmount: number,
) {
  const height = 32;
  const labelWidth = SUMMARY_COLUMNS[0].width + SUMMARY_COLUMNS[1].width;
  const amountWidth = SUMMARY_COLUMNS[2].width;
  drawGrid(page, MARGIN_X, yTop, [labelWidth, amountWidth], height);
  drawText({
    page,
    font,
    text: '合计（元）',
    x: MARGIN_X,
    y: yTop - 21,
    size: 10.5,
    maxWidth: labelWidth,
    align: 'center',
  });
  drawText({
    page,
    font,
    text: formatPlainMoney(totalAmount),
    x: MARGIN_X + labelWidth,
    y: yTop - 21,
    size: 10.5,
    maxWidth: amountWidth,
    align: 'center',
  });
}

function drawSummaryPages(params: {
  pdfDoc: PDFDocument;
  font: PDFFont;
  rows: SummaryRow[];
}) {
  const { pdfDoc, font, rows } = params;
  let page = addPage(pdfDoc);
  drawHeader(page, font, '对账单');

  let cursorY = TOP_Y - 66;
  drawSummaryTableHeader(page, font, cursorY);
  cursorY -= 30;

  for (const row of rows) {
    const height = summaryRowHeight(row, font, 10);
    if (cursorY - height < BOTTOM_Y + 36) {
      page = addPage(pdfDoc);
      drawHeader(page, font, '对账单（续）');
      cursorY = TOP_Y - 66;
      drawSummaryTableHeader(page, font, cursorY);
      cursorY -= 30;
    }

    drawSummaryRow(page, font, row, cursorY, height);
    cursorY -= height;
  }

  if (cursorY - 32 < BOTTOM_Y) {
    page = addPage(pdfDoc);
    drawHeader(page, font, '对账单（续）');
    cursorY = TOP_Y - 66;
    drawSummaryTableHeader(page, font, cursorY);
    cursorY -= 30;
  }

  drawSummaryTotalRow(
    page,
    font,
    cursorY,
    rows.reduce((sum, row) => sum + row.amount, 0),
  );
}

export async function createBillingPdfBuffer(
  params: CreateBillingPdfParams,
): Promise<Uint8Array> {
  const { billing } = params;
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontBytes = await loadBillingPdfFontBytes();
  const font = await pdfDoc.embedFont(fontBytes, { subset: false });
  const rows = normalizeRows(billing);
  const orderGroups = groupRowsByOrder(rows);

  drawSummaryPages({ pdfDoc, font, rows: buildSummaryRows(orderGroups) });

  for (const group of orderGroups) {
    drawSheetPages({
      pdfDoc,
      font,
      title: '发货单',
      rows: group.rows,
      totalAmount: group.totalAmount,
    });
  }

  return await pdfDoc.save();
}

function assertSealPlacement(
  pageWidth: number,
  pageHeight: number,
  sealAspectRatio: number,
  placement: BillingSealPlacement,
) {
  if (
    placement.pageIndex < 1 ||
    placement.xRatio < 0 ||
    placement.xRatio > 1 ||
    placement.yRatio < 0 ||
    placement.yRatio > 1 ||
    placement.widthRatio <= 0 ||
    placement.widthRatio > 1
  ) {
    throw new Error('印章位置参数不合法');
  }

  const widthPoints = pageWidth * placement.widthRatio;
  const heightPoints = widthPoints * sealAspectRatio;
  const topOffset = pageHeight * placement.yRatio;
  const heightRatio = heightPoints / pageHeight;

  if (placement.xRatio + placement.widthRatio > 1) {
    throw new Error('印章横向位置超出页面范围');
  }
  if (placement.yRatio + heightRatio > 1) {
    throw new Error('印章纵向位置超出页面范围');
  }
  if (topOffset + heightPoints > pageHeight) {
    throw new Error('印章纵向位置超出页面范围');
  }
}

export async function applySealToBillingPdfBuffer(params: {
  originalPdf: Uint8Array;
  sealImageBytes: Uint8Array;
  placement?: BillingSealPlacement;
  placements?: BillingSealPlacement[];
  seamSeal?: BillingSeamSealOptions;
}): Promise<Uint8Array> {
  const { originalPdf, sealImageBytes, placement, seamSeal } = params;
  const pdfDoc = await PDFDocument.load(originalPdf);
  const pages = pdfDoc.getPages();
  const sealImage = await pdfDoc.embedPng(sealImageBytes);
  const sealAspectRatio = sealImage.height / sealImage.width;
  const placements = Array.isArray(params.placements)
    ? params.placements
    : placement
      ? [placement]
      : [];

  if (placements.length === 0 && !seamSeal?.enabled) {
    throw new Error('盖章位置参数缺失');
  }

  for (const currentPlacement of placements) {
    const targetPage = pages[currentPlacement.pageIndex - 1];

    if (!targetPage) {
      throw new Error('盖章页码不存在');
    }

    const pageSize = targetPage.getSize();

    assertSealPlacement(
      pageSize.width,
      pageSize.height,
      sealAspectRatio,
      currentPlacement,
    );

    const width = pageSize.width * currentPlacement.widthRatio;
    const height = width * sealAspectRatio;
    const x = pageSize.width * currentPlacement.xRatio;
    const y = pageSize.height - pageSize.height * currentPlacement.yRatio - height;

    targetPage.drawImage(sealImage, {
      x,
      y,
      width,
      height,
      opacity: 0.96,
    });
  }

  if (seamSeal?.enabled) {
    await drawSeamSealSlices(pdfDoc, sealImageBytes);
  }

  return await pdfDoc.save();
}

async function drawSeamSealSlices(
  pdfDoc: PDFDocument,
  sealImageBytes: Uint8Array,
) {
  const pages = pdfDoc.getPages();
  if (pages.length <= 0) return;

  const source = sharp(Buffer.from(sealImageBytes)).ensureAlpha();
  const metadata = await source.metadata();
  const sourceWidth = metadata.width ?? 0;
  const sourceHeight = metadata.height ?? 0;

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error('骑缝章图片尺寸无效');
  }

  for (let index = 0; index < pages.length; index += 1) {
    const left = Math.floor((sourceWidth * index) / pages.length);
    const nextLeft = Math.floor((sourceWidth * (index + 1)) / pages.length);
    const width = Math.max(nextLeft - left, 1);
    const sliceBytes = await sharp(Buffer.from(sealImageBytes))
      .ensureAlpha()
      .extract({
        left,
        top: 0,
        width,
        height: sourceHeight,
      })
      .png()
      .toBuffer();
    const sliceImage = await pdfDoc.embedPng(sliceBytes);
    const page = pages[index];
    const pageSize = page.getSize();
    const sliceHeight = pageSize.height * 0.18;
    const sliceWidth = sliceHeight * (sliceImage.width / sliceImage.height);
    const x = pageSize.width - sliceWidth * 0.5;
    const y = pageSize.height * 0.42;

    page.drawImage(sliceImage, {
      x,
      y,
      width: sliceWidth,
      height: sliceHeight,
      opacity: 0.96,
    });
  }
}
