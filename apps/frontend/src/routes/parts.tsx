// apps/frontend/src/routes/parts.tsx
import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  Table,
  Button,
  Input,
  Space,
  Breadcrumb,
  Typography,
  Tag,
  Tooltip,
  theme,
  Flex,
  FloatButton,
  Grid,
  Upload,
  message,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  FileTextOutlined,
  HistoryOutlined,
  UploadOutlined,
  FormOutlined,
} from "@ant-design/icons"
import * as XLSX from "xlsx"
import {
  useGetParts,
  useImportParts,
  Part,
  PartsSearch,
} from "../hooks/api/useParts"
import { CreatePartDrawer } from "../components/parts/CreatePartDrawer"

const { Title, Text } = Typography
const { useBreakpoint } = Grid

export const Route = createFileRoute("/parts")({
  validateSearch: (search: Record<string, unknown>): PartsSearch => ({
    page: Number(search?.page) || 1,
    pageSize: Number(search?.pageSize) || 10,
    name: (search?.name as string) || undefined,
  }),
  component: PartsListComponent,
})

function PartsListComponent() {
  const { page, pageSize, name } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { token } = theme.useToken()
  const screens = useBreakpoint()

  const isMobile = (screens.xs || screens.sm) && !screens.md

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const { data, isLoading } = useGetParts({ page, pageSize, name })
  const { mutate: importParts, isPending: isImporting } =
    useImportParts()

  // Excel 文件解析逻辑
  const handleExcelUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]

        // 将 Excel 转换为 JSON 数组
        const jsonData = XLSX.utils.sheet_to_json(firstSheet)

        // 映射 Excel 列名为后端需要的字段结构
        const payload = jsonData
          .map((row: any) => {
            const commonPrices: Record<string, number> = {}
            if (row["价格"] !== undefined && row["价格"] !== null) {
              commonPrices["标准价"] = Number(row["价格"])
            }

            return {
              name: row["名称"],
              material: row["材质"],
              commonPrices,
            }
          })
          .filter(item => item.name && item.material) // 过滤掉没有名称或材质的空行

        if (payload.length === 0) {
          message.warning(
            "未检测到有效数据，请检查 Excel 是否包含“名称”和“材质”列头",
          )
          return
        }

        importParts(payload)
      } catch (error) {
        message.error("Excel 文件解析失败")
      }
    }
    reader.readAsArrayBuffer(file)

    // 返回 false 阻止 Upload 组件自带的默认网络请求
    return false
  }

  const columns: ColumnsType<Part> = [
    {
      title: "零件信息",
      key: "info",
      width: 240,
      render: (_, record) => (
        <Flex
          vertical
          gap={4}
        >
          <Text
            strong
            style={{ fontSize: 15 }}
          >
            {record.name}
          </Text>
          <Text
            type='secondary'
            size='small'
          >
            {record.spec || "无规格描述"}
          </Text>
        </Flex>
      ),
    },
    {
      title: "材质",
      dataIndex: "material",
      key: "material",
      responsive: ["sm"],
      render: text => (
        <Tag
          variant='borderless'
          color='blue'
        >
          {text}
        </Tag>
      ),
    },
    {
      title: "价格",
      key: "prices",
      render: (_, record) => (
        <Flex
          wrap='wrap'
          gap={6}
        >
          {Object.entries(record.commonPrices || {}).map(
            ([customer, price]) => (
              <Tooltip
                title={`客户: ${customer}`}
                key={customer}
              >
                <Tag
                  variant='filled'
                  color='default'
                  style={{
                    margin: 0,
                    backgroundColor: token.colorFillAlter,
                    border: "none",
                    borderRadius: 4,
                  }}
                >
                  <Text
                    type='secondary'
                    style={{ fontSize: 12 }}
                  >
                    {customer.slice(0, 2)}:
                  </Text>
                  <Text
                    strong
                    style={{ marginLeft: 4 }}
                  >
                    ¥{price}
                  </Text>
                </Tag>
              </Tooltip>
            ),
          )}
        </Flex>
      ),
    },
    {
      title: "操作",
      key: "action",
      fixed: "right",
      width: 120,
      render: (_, record) => (
        <Space size={0}>
          <Button
            variant='text'
            color='default'
            size='small'
            icon={<EditOutlined />}
          />
          <Button
            variant='text'
            color='default'
            size='small'
            icon={<FileTextOutlined />}
          />
          <Button
            variant='text'
            color='default'
            size='small'
            icon={<HistoryOutlined />}
          />
        </Space>
      ),
    },
  ]

  const responseData = data?.data

  return (
    <Flex
      vertical
      gap={24}
    >
      <Flex
        justify='space-between'
        align='flex-end'
      >
        <Flex
          vertical
          gap={8}
        >
          <Breadcrumb
            separator='/'
            items={[{ title: "资源管理" }, { title: "零件字典" }]}
            style={{ fontSize: 12 }}
          />
          <Title
            level={3}
            style={{ margin: 0, fontWeight: 600 }}
          >
            零件字典
          </Title>
        </Flex>

        {/* PC 端操作区 */}
        {!isMobile && (
          <Space>
            <Upload
              beforeUpload={handleExcelUpload}
              showUploadList={false}
              accept='.xlsx,.xls'
            >
              <Button
                size='large'
                icon={<UploadOutlined />}
                loading={isImporting}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                导入 Excel
              </Button>
            </Upload>

            <Button
              variant='solid'
              color='primary'
              icon={<PlusOutlined />}
              size='large'
              style={{ borderRadius: token.borderRadiusLG }}
              onClick={() => setIsCreateOpen(true)}
            >
              新增零件
            </Button>
          </Space>
        )}
      </Flex>

      <Flex
        align='center'
        justify='space-between'
        style={{
          paddingBottom: 16,
          borderBottom: `1px solid ${token.colorSplit}`,
        }}
      >
        <Space
          size='middle'
          style={{ width: "100%" }}
        >
          <Input
            placeholder='搜索零件名称或型号...'
            prefix={
              <SearchOutlined
                style={{ color: token.colorTextPlaceholder }}
              />
            }
            variant='filled'
            style={{ width: isMobile ? "100%" : 300 }}
            allowClear
            defaultValue={name}
            onPressEnter={e =>
              navigate({
                search: prev => ({
                  ...prev,
                  name: e.currentTarget.value,
                  page: 1,
                }),
              })
            }
          />
        </Space>
      </Flex>

      <Table
        variant='borderless'
        columns={columns}
        dataSource={responseData?.data || []}
        loading={isLoading}
        rowKey='id'
        size='middle'
        pagination={{
          current: page,
          pageSize: pageSize,
          total: responseData?.data?.total || 0,
          onChange: (p, ps) =>
            navigate({
              search: prev => ({ ...prev, page: p, pageSize: ps }),
            }),
          showSizeChanger: !isMobile,
          position: ["bottomRight"],
          size: "small",
        }}
        scroll={{ x: 700 }}
      />

      <CreatePartDrawer
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* 移动端专属：采用悬浮按钮组收纳新增和导入操作 */}
      {isMobile && (
        <FloatButton.Group
          trigger='click'
          type='primary'
          style={{
            bottom: "calc(60px + env(safe-area-inset-bottom) + 24px)",
            right: 24,
          }}
          icon={<PlusOutlined />}
        >
          <Upload
            beforeUpload={handleExcelUpload}
            showUploadList={false}
            accept='.xlsx,.xls'
          >
            <FloatButton
              icon={<UploadOutlined />}
              tooltip='导入 Excel'
            />
          </Upload>
          <FloatButton
            icon={<FormOutlined />}
            tooltip='手动新增'
            onClick={() => setIsCreateOpen(true)}
          />
        </FloatButton.Group>
      )}
    </Flex>
  )
}
