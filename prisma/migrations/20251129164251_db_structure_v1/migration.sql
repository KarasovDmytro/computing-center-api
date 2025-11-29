-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PROGRAMMER', 'DB_ADMIN', 'USER', 'OPERATOR', 'HARDWARE_SPECIALIST');

-- CreateEnum
CREATE TYPE "ComputerStatus" AS ENUM ('AVAILABLE', 'BUSY', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "pib" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "accessGroup" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "computers" (
    "id" SERIAL NOT NULL,
    "inventoryNumber" TEXT NOT NULL,
    "location" TEXT,
    "status" "ComputerStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "computers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "computerId" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_login_key" ON "users"("login");

-- CreateIndex
CREATE UNIQUE INDEX "computers_inventoryNumber_key" ON "computers"("inventoryNumber");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_computerId_fkey" FOREIGN KEY ("computerId") REFERENCES "computers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
