import React from "react"
import {
  Drawer,
  Descriptions,
  Typography,
  Tag,
  Space,
  List,
  Button,
  Upload,
  Flex,
  Spin,
  theme,
  Divider,
  message,
  Image,
} from "antd"
import {
  InboxOutlined,
  FilePdfOutlined,
  PictureOutlined,
  CloudDownloadOutlined,
  HistoryOutlined,
} from "@ant-design/icons"
import dayjs from "dayjs"
import {
  useGetPart,
  useUploadDrawing,
} from "../../hooks/api/useParts"

const { Text, Title } = Typography
const { Dragger } = Upload

interface PartDetailDrawerProps {
  partId?: number
  onClose: () => void
}

export const PartDetailDrawer: React.FC<PartDetailDrawerProps> = ({
  partId,
  onClose,
}) => {
  const { token } = theme.useToken()
  const { data: part, isLoading } = useGetPart(partId)
  const { mutate: uploadDrawing, isPending: isUploading } =
    useUploadDrawing()

  const handleUpload = (file: File) => {
    if (!partId) return false
    const isLt10M = file.size / 1024 / 1024 < 10
    if (!isLt10M) {
      message.error("图纸文件大小不能超过 10MB!")
      return false
    }
    uploadDrawing({ partId, file })
    return false
  }

  // 提取当前生效的最新图纸
  const latestDrawing = part?.drawings?.find(d => d.isLatest)

  return (
    <Drawer
      title='零件详情与图纸'
      width={600}
      onClose={onClose}
      open={!!partId}
      styles={{
        header: { borderBottom: `1px solid ${token.colorSplit}` },
      }}
    >
      {isLoading ? (
        <Flex
          justify='center'
          align='center'
          style={{ height: "100%" }}
        >
          <Spin size='large' />
        </Flex>
      ) : part ? (
        <Flex
          vertical
          gap={24}
        >
          {/* 图纸直观预览区 */}
          {latestDrawing && (
            <div
              style={{
                background: token.colorFillAlter,
                padding: 16,
                borderRadius: token.borderRadiusLG,
                border: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <Flex
                justify='space-between'
                align='center'
                style={{ marginBottom: 12 }}
              >
                <Title
                  level={5}
                  style={{ margin: 0 }}
                >
                  当前图纸预览
                </Title>
                <Tag color='success'>生效版本</Tag>
              </Flex>

              {latestDrawing.fileType === "PDF" ? (
                <Flex
                  vertical
                  align='center'
                  justify='center'
                  style={{
                    height: 200,
                    background: "#fff",
                    borderRadius: token.borderRadius,
                  }}
                >
                  <FilePdfOutlined
                    style={{
                      fontSize: 48,
                      color: "#cf1322",
                      marginBottom: 12,
                    }}
                  />
                  <Text strong>{latestDrawing.fileName}</Text>
                  <Button
                    type='link'
                    onClick={() =>
                      message.info(
                        "PDF 渲染需实际 OSS 地址，此处暂代预览",
                      )
                    }
                  >
                    点击全屏查看
                  </Button>
                </Flex>
              ) : (
                <Flex
                  justify='center'
                  style={{
                    background: "#fff",
                    padding: 8,
                    borderRadius: token.borderRadius,
                  }}
                >
                  <Image
                    // 实际项目中应替换为真实对象存储 OSS 访问地址
                    src={`/mock-path/${latestDrawing.fileKey}`}
                    fallback='https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg'
                    alt={latestDrawing.fileName}
                    style={{ maxHeight: 240, objectFit: "contain" }}
                  />
                </Flex>
              )}
            </div>
          )}

          <div>
            <Title
              level={5}
              style={{ marginTop: 0, marginBottom: 16 }}
            >
              基础元数据
            </Title>
            <Descriptions
              column={2}
              layout='vertical'
              size='small'
            >
              <Descriptions.Item label='零件编号'>
                <Text
                  copyable
                  strong
                >
                  {part.partNumber}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label='零件名称'>
                <Text strong>{part.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label='材质'>
                <Tag
                  bordered={false}
                  color='blue'
                >
                  {part.material}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label='创建时间'>
                {dayjs(part.createdAt).format("YYYY-MM-DD HH:mm")}
              </Descriptions.Item>
              <Descriptions.Item
                label='规格型号'
                span={2}
              >
                {part.spec || <Text type='secondary'>未填写</Text>}
              </Descriptions.Item>
            </Descriptions>
          </div>

          <Divider style={{ margin: 0 }} />

          <div>
            <Title
              level={5}
              style={{ marginTop: 0, marginBottom: 16 }}
            >
              图纸版本管控
            </Title>
            <Dragger
              beforeUpload={handleUpload}
              showUploadList={false}
              disabled={isUploading}
              style={{
                padding: 16,
                background: token.colorFillAlter,
                border: `1px dashed ${token.colorBorder}`,
              }}
            >
              <p className='ant-upload-drag-icon'>
                {isUploading ? (
                  <Spin />
                ) : (
                  <InboxOutlined
                    style={{ color: token.colorPrimary }}
                  />
                )}
              </p>
              <p className='ant-upload-text'>
                {isUploading
                  ? "图纸上传中..."
                  : "点击或将图纸文件拖拽到这里上传"}
              </p>
              <p
                className='ant-upload-hint'
                style={{ fontSize: 12 }}
              >
                支持 PDF、JPG、PNG
                等格式。新文件自动成为最新生效版本。
              </p>
            </Dragger>
          </div>

          <div>
            <List
              header={
                <Text strong>
                  <HistoryOutlined style={{ marginRight: 6 }} />
                  版本历史记录
                </Text>
              }
              dataSource={part.drawings || []}
              renderItem={item => (
                <List.Item
                  actions={[
                    <Button
                      key='download'
                      type='text'
                      icon={<CloudDownloadOutlined />}
                      onClick={() =>
                        message.info("需配置文件存储服务")
                      }
                    >
                      下载
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      item.fileType === "PDF" ? (
                        <FilePdfOutlined
                          style={{ fontSize: 24, color: "#cf1322" }}
                        />
                      ) : (
                        <PictureOutlined
                          style={{ fontSize: 24, color: "#1677ff" }}
                        />
                      )
                    }
                    title={
                      <Space>
                        <Text strong>{item.fileName}</Text>
                        {item.isLatest ? (
                          <Tag
                            bordered={false}
                            color='success'
                            style={{ margin: 0 }}
                          >
                            当前生效
                          </Tag>
                        ) : (
                          <Tag
                            bordered={false}
                            style={{ margin: 0 }}
                          >
                            历史归档
                          </Tag>
                        )}
                      </Space>
                    }
                    description={
                      <Text
                        type='secondary'
                        style={{ fontSize: 12 }}
                      >
                        上传于{" "}
                        {dayjs(item.uploadedAt).format(
                          "YYYY-MM-DD HH:mm:ss",
                        )}
                      </Text>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: "暂无关联的工程图纸" }}
            />
          </div>
        </Flex>
      ) : (
        <Text type='danger'>加载失败，未找到该零件。</Text>
      )}
    </Drawer>
  )
}
