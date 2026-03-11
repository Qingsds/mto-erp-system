-- CreateTable
CREATE TABLE "part" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "spec" VARCHAR(100),
    "common_prices" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_drawing" (
    "id" SERIAL NOT NULL,
    "part_id" INTEGER NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_key" VARCHAR(255) NOT NULL,
    "file_type" VARCHAR(20) NOT NULL,
    "is_latest" BOOLEAN NOT NULL DEFAULT true,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_drawing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" SERIAL NOT NULL,
    "customer_name" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "part_id" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "ordered_qty" INTEGER NOT NULL,
    "delivered_qty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_note" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "delivery_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(50) NOT NULL DEFAULT 'SHIPPED',
    "remark" VARCHAR(500),

    CONSTRAINT "delivery_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_item" (
    "id" SERIAL NOT NULL,
    "delivery_note_id" INTEGER NOT NULL,
    "order_item_id" INTEGER NOT NULL,
    "shipped_qty" INTEGER NOT NULL,
    "remark" VARCHAR(255),

    CONSTRAINT "delivery_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_statement" (
    "id" SERIAL NOT NULL,
    "customer_name" VARCHAR(100) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_statement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_item" (
    "id" SERIAL NOT NULL,
    "billing_id" INTEGER NOT NULL,
    "delivery_item_id" INTEGER,
    "description" VARCHAR(255),
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "billing_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seal" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "file_key" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "seal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seal_usage_log" (
    "id" SERIAL NOT NULL,
    "seal_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "target_type" VARCHAR(50) NOT NULL,
    "target_id" INTEGER NOT NULL,
    "action_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(50),

    CONSTRAINT "seal_usage_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document" (
    "id" SERIAL NOT NULL,
    "target_type" VARCHAR(50) NOT NULL,
    "target_id" INTEGER NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "original_key" VARCHAR(255) NOT NULL,
    "signed_key" VARCHAR(255),
    "file_hash" CHAR(64),
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "part_drawing" ADD CONSTRAINT "part_drawing_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_note" ADD CONSTRAINT "delivery_note_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_item" ADD CONSTRAINT "delivery_item_delivery_note_id_fkey" FOREIGN KEY ("delivery_note_id") REFERENCES "delivery_note"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_item" ADD CONSTRAINT "delivery_item_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_item" ADD CONSTRAINT "billing_item_billing_id_fkey" FOREIGN KEY ("billing_id") REFERENCES "billing_statement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_item" ADD CONSTRAINT "billing_item_delivery_item_id_fkey" FOREIGN KEY ("delivery_item_id") REFERENCES "delivery_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seal_usage_log" ADD CONSTRAINT "seal_usage_log_seal_id_fkey" FOREIGN KEY ("seal_id") REFERENCES "seal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
