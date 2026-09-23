-- Role portal login identifier
ALTER TABLE "User" ADD COLUMN "loginId" TEXT;
CREATE UNIQUE INDEX "User_loginId_key" ON "User"("loginId");
