// apps/frontend/src/components/parts/CreatePartDrawer.tsx
import React from "react"
import {
  Drawer,
  Form,
  Input,
  Button,
  Space,
  InputNumber,
  message,
  Flex,
  Typography,
  theme,
  Divider,
} from "antd"
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import request from "../../utils/request"

const { Text } = Typography

interface CreatePartDrawerProps {
  open: boolean
  onClose: () => void
}

// 定义表单的内部结构 (将 Record 转换为了适合 Form.List 渲染的数组)
interface FormValues {
  name: string
  material: string
  spec?: string
  prices: Array<{ customer: string; price: number }>
}

export const CreatePartDrawer: React.FC<CreatePartDrawerProps> = ({
  open,
  onClose,
}) => {
  const [form] = Form.useForm<FormValues>()
  const queryClient = useQueryClient()
  const { token } = theme.useToken()

  // 定义提交操作的 Mutation
  const { mutate, isPending } = useMutation({
    mutationFn: (payload: any) => request.post("/api/parts", payload),
    onSuccess: () => {
      message.success("零件创建成功")
      // 核心：让零件列表的缓存失效，触发自动重刷
      queryClient.invalidateQueries({ queryKey: ["parts"] })
      form.resetFields()
      onClose()
    },
  })

  const onFinish = (values: FormValues) => {
    // 将 Form.List 的数组结构转换为后端需要的 Record<string, number> 结构
    const commonPrices: Record<string, number> = {}
    if (values.prices) {
      values.prices.forEach(({ customer, price }) => {
        if (customer && price !== undefined) {
          commonPrices[customer] = price
        }
      })
    }

    const payload = {
      name: values.name,
      material: values.material,
      spec: values.spec,
      commonPrices,
    }

    mutate(payload)
  }

  return (
    <Drawer
      title='新增零件定义'
      width={480}
      onClose={onClose}
      open={open}
      styles={{
        body: { paddingBottom: 80 }, // 为底部固定按钮留出空间
        header: { borderBottom: `1px solid ${token.colorSplit}` },
      }}
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button
            onClick={() => form.submit()}
            type='primary'
            loading={isPending}
          >
            提交保存
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout='vertical' // 现代后台推荐使用垂直布局表单
        onFinish={onFinish}
        requiredMark='optional' // 去掉红星，改用 placeholder 或 helper text 提示必填
        initialValues={{ prices: [] }}
      >
        <Form.Item
          name='name'
          label={<Text strong>零件名称</Text>}
          rules={[{ required: true, message: "请输入零件名称" }]}
        >
          <Input
            variant='filled'
            placeholder='例如：法兰盘'
            size='large'
          />
        </Form.Item>

        <Flex gap={16}>
          <Form.Item
            name='material'
            label={<Text strong>材质</Text>}
            rules={[{ required: true, message: "请输入材质" }]}
            style={{ flex: 1 }}
          >
            <Input
              variant='filled'
              placeholder='例如：SUS304'
              size='large'
            />
          </Form.Item>
        </Flex>

        <Form.Item
          name='spec'
          label={<Text strong>规格型号 (选填)</Text>}
        >
          <Input.TextArea
            variant='filled'
            placeholder='请输入详细的尺寸、公差或工艺要求'
            autoSize={{ minRows: 3, maxRows: 5 }}
          />
        </Form.Item>

        <Divider
          dashed
          style={{ margin: "16px 0" }}
        />

        {/* 动态客户单价区块 */}
        <Flex
          vertical
          gap={8}
          style={{ marginBottom: 16 }}
        >
          <Text strong>客户专享单价 (选填)</Text>
          <Text
            type='secondary'
            style={{ fontSize: 13 }}
          >
            若不同客户采购此零件有特定单价，请在此处维护。
          </Text>
        </Flex>

        <Form.List name='prices'>
          {(fields, { add, remove }) => (
            <Flex
              vertical
              gap={12}
            >
              {fields.map(({ key, name, ...restField }) => (
                <Flex
                  key={key}
                  gap={12}
                  align='flex-start'
                >
                  <Form.Item
                    {...restField}
                    name={[name, "customer"]}
                    rules={[{ required: true, message: "填写客户" }]}
                    style={{ margin: 0, flex: 2 }}
                  >
                    <Input
                      variant='filled'
                      placeholder='客户名称'
                    />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, "price"]}
                    rules={[{ required: true, message: "填写单价" }]}
                    style={{ margin: 0, flex: 1 }}
                  >
                    <InputNumber
                      variant='filled'
                      placeholder='单价'
                      min={0}
                      step={0.01}
                      style={{ width: "100%" }}
                      prefix='¥'
                    />
                  </Form.Item>
                  <Button
                    type='text'
                    danger
                    icon={<MinusCircleOutlined />}
                    onClick={() => remove(name)}
                    style={{ marginTop: 2 }}
                  />
                </Flex>
              ))}
              <Form.Item style={{ margin: 0 }}>
                <Button
                  type='dashed'
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                  style={{
                    borderColor: token.colorBorderSecondary,
                    color: token.colorTextSecondary,
                  }}
                >
                  添加客户单价
                </Button>
              </Form.Item>
            </Flex>
          )}
        </Form.List>
      </Form>
    </Drawer>
  )
}
