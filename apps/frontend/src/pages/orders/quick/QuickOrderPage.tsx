import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import type { ApiResponse } from '@erp/shared-types';
import type { PartListItem } from '@/hooks/api/useParts';
import { useCreateQuickOrder } from '@/hooks/api/useOrders';
import { useAuthStore } from '@/store/auth.store';
import request from '@/lib/utils/request';
import { toast } from '@/lib/toast';
import { PageContentWrapper } from '@/components/common/PageContentWrapper';
import { TopLevelPageHeaderWrapper } from '@/components/common/TopLevelPageHeaderWrapper';
import { TopLevelPageTitle } from '@/components/common/TopLevelPageTitle';
import { CustomerPickerDialog } from '@/components/customers/CustomerPickerDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

type QuickOrderRowMode = 'pending' | 'new' | 'reuse';

interface StashedDrawingFile {
  fileKey: string;
  fileName: string;
  fileType: string;
}

interface ParsedItem {
  id: string;
  sourceFileName: string;
  partName: string;
  mode: QuickOrderRowMode;
  existingPartId?: number;
  candidates: PartListItem[];
  unitPrice: string;
  orderedQty: string;
  thumbnailUrl?: string;
  previewNeedsRevoke: boolean;
  isProcessing: boolean;
  error?: string;
  warning?: string;
  stash?: StashedDrawingFile;
}

function createRowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseNumberInput(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function extractPartName(ocrText: string, fileName: string) {
  const match = ocrText.match(/(?:零件名称|名称|Part Name|零件名|图号)[:：\s]*([^\n]+)/i);
  const fromOcr = match?.[1]?.trim();
  if (fromOcr) {
    return fromOcr;
  }
  return fileName.replace(/\.[^/.]+$/, '').trim();
}

async function renderPdfToImage(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas context not available');
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return canvas.toDataURL('image/jpeg');
}

async function buildPreviewUrl(file: File) {
  if (file.type === 'application/pdf') {
    return {
      url: await renderPdfToImage(file),
      previewNeedsRevoke: false,
    };
  }

  if (file.type.startsWith('image/')) {
    return {
      url: URL.createObjectURL(file),
      previewNeedsRevoke: true,
    };
  }

  throw new Error('仅支持 PDF 或图片图纸');
}

export default function QuickOrderPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore(state => state.user);
  const { mutate: createQuickOrder, isPending } = useCreateQuickOrder();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  const itemsRef = useRef<ParsedItem[]>([]);

  const [customerId, setCustomerId] = useState<number>();
  const [customerName, setCustomerName] = useState('');
  const [targetDate, setTargetDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
  );
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [isCustomerPickerOpen, setCustomerPickerOpen] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const cleanupStashedDrawing = (fileKey?: string) => {
    if (!fileKey) {
      return;
    }

    void request.delete('/api/parts/drawings/stash', {
      params: { fileKey },
    });
  };

  useEffect(() => () => {
    for (const item of itemsRef.current) {
      if (item.previewNeedsRevoke && item.thumbnailUrl) {
        URL.revokeObjectURL(item.thumbnailUrl);
      }
      cleanupStashedDrawing(item.stash?.fileKey);
    }
  }, []);

  const updateItem = (id: string, updater: (item: ParsedItem) => ParsedItem) => {
    setItems(prev => prev.map(item => (item.id === id ? updater(item) : item)));
  };

  const searchPartCandidates = async (keyword: string) => {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) {
      return [] as PartListItem[];
    }

    return request
      .get<unknown, ApiResponse<{ data: PartListItem[] }>>('/api/parts', {
        params: { keyword: trimmedKeyword, pageSize: 5 },
      })
      .then(res => res.data?.data ?? []);
  };

  const refreshCandidatesForItem = async (id: string, partName: string) => {
    try {
      const candidates = await searchPartCandidates(partName);

      if (!mountedRef.current) {
        return;
      }

      updateItem(id, item => {
        const hasSelectedCandidate = item.existingPartId
          ? candidates.some(candidate => candidate.id === item.existingPartId)
          : false;
        const nextMode: QuickOrderRowMode =
          candidates.length === 0
            ? 'new'
            : item.mode === 'reuse' && hasSelectedCandidate
              ? 'reuse'
              : item.mode === 'new'
                ? 'new'
                : 'pending';

        return {
          ...item,
          partName,
          candidates,
          existingPartId: hasSelectedCandidate ? item.existingPartId : undefined,
          mode: nextMode,
          warning:
            candidates.length > 0
              ? `发现 ${candidates.length} 个同名或近似零件，请明确选择复用旧结构或新建同名零件。`
              : undefined,
        };
      });
    } catch (error) {
      console.error('Search part candidates failed:', error);
      if (!mountedRef.current) {
        return;
      }
      updateItem(id, item => ({
        ...item,
        error: error instanceof Error ? error.message : '候选零件查询失败',
      }));
    }
  };

  const processFile = async (file: File, id: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const [stashData, preview] = await Promise.all([
        request
          .post<unknown, ApiResponse<StashedDrawingFile>>('/api/parts/drawings/stash', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          .then(res => res.data!),
        buildPreviewUrl(file),
      ]);

      if (!mountedRef.current) {
        if (preview.previewNeedsRevoke) {
          URL.revokeObjectURL(preview.url);
        }
        return;
      }

      updateItem(id, item => {
        if (item.previewNeedsRevoke && item.thumbnailUrl) {
          URL.revokeObjectURL(item.thumbnailUrl);
        }
        return {
          ...item,
          thumbnailUrl: preview.url,
          previewNeedsRevoke: preview.previewNeedsRevoke,
          stash: stashData,
        };
      });

      const {
        data: { text },
      } = await Tesseract.recognize(preview.url, 'chi_sim+eng');
      const parsedName = extractPartName(text, file.name);
      const candidates = await searchPartCandidates(parsedName);

      if (!mountedRef.current) {
        return;
      }

      updateItem(id, item => ({
        ...item,
        partName: parsedName,
        candidates,
        mode: candidates.length > 0 ? 'pending' : 'new',
        existingPartId: undefined,
        warning:
          candidates.length > 0
            ? `发现 ${candidates.length} 个同名或近似零件，请明确选择复用旧结构或新建同名零件。`
            : undefined,
        isProcessing: false,
        error: undefined,
      }));
    } catch (error) {
      console.error('Quick-order file processing failed:', error);
      if (!mountedRef.current) {
        return;
      }
      updateItem(id, item => ({
        ...item,
        isProcessing: false,
        error: error instanceof Error ? error.message : '图纸解析失败',
      }));
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const nextRows = Array.from(files).map(file => ({
      file,
      row: {
        id: createRowId(),
        sourceFileName: file.name,
        partName: '',
        mode: 'pending' as QuickOrderRowMode,
        candidates: [],
        unitPrice: '',
        orderedQty: '1',
        previewNeedsRevoke: false,
        isProcessing: true,
      } satisfies ParsedItem,
    }));

    setItems(prev => [...prev, ...nextRows.map(entry => entry.row)]);
    nextRows.forEach(entry => {
      void processFile(entry.file, entry.row.id);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleItemFieldChange = (
    id: string,
    field: 'partName' | 'unitPrice' | 'orderedQty',
    value: string,
  ) => {
    updateItem(id, item => ({
      ...item,
      [field]: value,
    }));
  };

  const handlePartNameBlur = (id: string, partName: string) => {
    void refreshCandidatesForItem(id, partName);
  };

  const handleSelectReuse = (id: string, candidateId: number) => {
    updateItem(id, item => ({
      ...item,
      mode: 'reuse',
      existingPartId: candidateId,
      error: undefined,
    }));
  };

  const handleSelectNew = (id: string) => {
    updateItem(id, item => ({
      ...item,
      mode: 'new',
      existingPartId: undefined,
      error: undefined,
    }));
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => {
      const target = prev.find(item => item.id === id);
      if (target?.previewNeedsRevoke && target.thumbnailUrl) {
        URL.revokeObjectURL(target.thumbnailUrl);
      }
      cleanupStashedDrawing(target?.stash?.fileKey);
      return prev.filter(item => item.id !== id);
    });
  };

  const handleSubmit = () => {
    if (!customerId) {
      toast.error('请先选择客户');
      return;
    }
    if (items.length === 0) {
      toast.error('请先上传并解析图纸');
      return;
    }
    if (items.some(item => item.isProcessing)) {
      toast.error('仍有图纸正在解析，请稍后再提交');
      return;
    }
    if (items.some(item => item.error)) {
      toast.error('存在解析失败的图纸，请先处理后再提交');
      return;
    }
    if (items.some(item => item.mode === 'pending')) {
      toast.error('请先为所有命中的零件明确选择复用或新建');
      return;
    }
    if (
      items.some(item => item.mode === 'new' && !item.partName.trim())
    ) {
      toast.error('新建零件时必须填写零件名称');
      return;
    }
    if (
      items.some(item => item.mode === 'reuse' && !item.existingPartId)
    ) {
      toast.error('复用旧结构时必须选择已有零件');
      return;
    }

    const payload = {
      customerId,
      responsibleUserId: currentUser?.id,
      targetDate: new Date(targetDate).toISOString(),
      items: items.map(item => ({
        partName: item.partName.trim(),
        isNewPart: item.mode === 'new',
        existingPartId: item.mode === 'reuse' ? item.existingPartId : undefined,
        unitPrice: parseNumberInput(item.unitPrice),
        orderedQty: Math.max(1, Math.trunc(parseNumberInput(item.orderedQty, 1))),
        ...(item.mode === 'new' && item.stash
          ? {
              fileKey: item.stash.fileKey,
              fileName: item.stash.fileName,
              fileType: item.stash.fileType,
            }
          : {}),
      })),
    };

    createQuickOrder(payload, {
      onSuccess: () => {
        void navigate({ to: '/orders' });
      },
    });
  };

  const pendingDecisionCount = items.filter(item => item.mode === 'pending').length;

  return (
    <PageContentWrapper>
      <TopLevelPageHeaderWrapper>
        <TopLevelPageTitle
          title="快捷图纸建单"
          subtitle="上传图纸自动解析零件，明确复用或新建后一次生成订单与生产任务"
        />
      </TopLevelPageHeaderWrapper>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">基础信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label>客户</Label>
              <div className="flex items-center gap-2">
                <Input value={customerName} readOnly placeholder="请选择客户..." className="bg-muted" />
                <Button type="button" variant="outline" onClick={() => setCustomerPickerOpen(true)}>
                  选择
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>操作人</Label>
              <Input
                value={currentUser?.realName ?? ''}
                readOnly
                placeholder="当前登录用户"
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>统一交货日期</Label>
              <Input
                type="date"
                value={targetDate}
                onChange={event => setTargetDate(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>上传图纸 (PDF/图片)</Label>
              <Input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileChange}
              />
            </div>
          </CardContent>
        </Card>

        {items.length > 0 && (
          <Card>
            <CardHeader className="gap-2">
              <CardTitle className="text-lg">解析明细</CardTitle>
              <p className="text-xs text-muted-foreground">
                {pendingDecisionCount > 0
                  ? `还有 ${pendingDecisionCount} 行待明确选择复用或新建。`
                  : '所有行都已完成结构决策，可以提交。'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[104px]">图纸</TableHead>
                    <TableHead className="min-w-[200px]">零件名称</TableHead>
                    <TableHead className="min-w-[240px]">候选零件</TableHead>
                    <TableHead className="w-[120px]">单价</TableHead>
                    <TableHead className="w-[120px]">数量</TableHead>
                    <TableHead className="min-w-[200px]">结构模式</TableHead>
                    <TableHead className="w-[90px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => (
                    <TableRow
                      key={item.id}
                      className={
                        item.mode === 'pending'
                          ? 'bg-amber-50/70'
                          : item.error
                            ? 'bg-destructive/5'
                            : undefined
                      }
                    >
                      <TableCell>
                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={item.sourceFileName}
                            className="h-16 w-16 border border-border object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center border border-border bg-muted text-[11px] text-muted-foreground">
                            {item.isProcessing ? '解析中…' : '无预览'}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="align-top">
                        <Input
                          value={item.partName}
                          placeholder="识别结果可手动修正"
                          disabled={item.isProcessing}
                          onChange={event =>
                            handleItemFieldChange(item.id, 'partName', event.target.value)
                          }
                          onBlur={event =>
                            handlePartNameBlur(item.id, event.target.value)
                          }
                        />
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          源文件：{item.sourceFileName}
                        </div>
                        {item.warning && (
                          <div className="mt-1 text-[11px] text-amber-700">
                            {item.warning}
                          </div>
                        )}
                        {item.error && (
                          <div className="mt-1 text-[11px] text-destructive">
                            {item.error}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="align-top">
                        {item.candidates.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            未命中现有零件，将按新零件处理
                          </span>
                        ) : (
                          <div className="space-y-2">
                            {item.candidates.map(candidate => {
                              const isSelected =
                                item.mode === 'reuse' && item.existingPartId === candidate.id;

                              return (
                                <button
                                  key={candidate.id}
                                  type="button"
                                  onClick={() => handleSelectReuse(item.id, candidate.id)}
                                  className={`w-full border px-2 py-2 text-left text-xs ${
                                    isSelected
                                      ? 'border-primary bg-primary/5'
                                      : 'border-border bg-background'
                                  }`}
                                >
                                  <div className="font-medium text-foreground">
                                    {candidate.partNumber}
                                  </div>
                                  <div className="mt-0.5 text-muted-foreground">
                                    {candidate.name} · {candidate.material}
                                  </div>
                                  <div className="mt-0.5 text-muted-foreground">
                                    最新图纸：{candidate.drawings?.[0]?.uploadedAt?.slice(0, 10) ?? '--'}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="align-top">
                        <Input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={event =>
                            handleItemFieldChange(item.id, 'unitPrice', event.target.value)
                          }
                        />
                      </TableCell>

                      <TableCell className="align-top">
                        <Input
                          type="number"
                          min="1"
                          value={item.orderedQty}
                          onChange={event =>
                            handleItemFieldChange(item.id, 'orderedQty', event.target.value)
                          }
                        />
                      </TableCell>

                      <TableCell className="align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={item.mode === 'new' ? 'default' : 'outline'}
                            onClick={() => handleSelectNew(item.id)}
                          >
                            新建零件
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={item.mode === 'reuse' ? 'default' : 'outline'}
                            disabled={!item.existingPartId}
                            onClick={() =>
                              item.existingPartId && handleSelectReuse(item.id, item.existingPartId)
                            }
                          >
                            复用旧结构
                          </Button>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {item.mode === 'pending' && '待决策：命中候选后必须明确选择。'}
                          {item.mode === 'new' && '会创建新零件，并将本次图纸写入新零件最新版本。'}
                          {item.mode === 'reuse' && '仅复用已有零件结构，本次图纸不会写入旧零件图纸记录。'}
                        </div>
                      </TableCell>

                      <TableCell className="text-right align-top">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          删除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={isPending || items.some(item => item.isProcessing)}
                >
                  {isPending ? '提交中...' : '生成订单与生产任务'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <CustomerPickerDialog
        isOpen={isCustomerPickerOpen}
        onClose={() => setCustomerPickerOpen(false)}
        onSelect={customer => {
          setCustomerId(customer.id);
          setCustomerName(customer.name);
        }}
      />
    </PageContentWrapper>
  );
}
