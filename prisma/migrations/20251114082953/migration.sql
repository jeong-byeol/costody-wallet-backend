-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "tx_status" AS ENUM ('pending', 'success', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" CITEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'admin',
    "balance" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email_verified" BOOLEAN DEFAULT false,
    "email_verification_token" VARCHAR(255),
    "email_verification_expires" TIMESTAMP(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "txhash" VARCHAR(100) NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "tx_status" NOT NULL,
    "blocknumber" BIGINT,
    "blockhash" VARCHAR(100),
    "blocktimestamp" TIMESTAMP(6),
    "from_address" VARCHAR(100) NOT NULL,
    "to_address" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(38,18) NOT NULL,
    "gasused" BIGINT,
    "effectivegasprice" DECIMAL(38,18),
    "feepaid" DECIMAL(38,18),
    "createdat" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("txhash")
);

-- CreateTable
CREATE TABLE "withdrawal_whitelist" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "to_address" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdrawal_whitelist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_verification_token_key" ON "users"("email_verification_token");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- CreateIndex
CREATE INDEX "idx_email_verification_token" ON "users"("email_verification_token");

-- CreateIndex
CREATE INDEX "idx_transactions_from_address" ON "transactions"("from_address");

-- CreateIndex
CREATE INDEX "idx_transactions_status" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "idx_transactions_to_address" ON "transactions"("to_address");

-- CreateIndex
CREATE INDEX "idx_transactions_userid" ON "transactions"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_whitelist_user" ON "withdrawal_whitelist"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_whitelist_address" ON "withdrawal_whitelist"("to_address");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_user_whitelist" ON "withdrawal_whitelist"("user_id", "to_address");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "withdrawal_whitelist" ADD CONSTRAINT "withdrawal_whitelist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
