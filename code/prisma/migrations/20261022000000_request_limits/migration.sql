CREATE TABLE "request_limits" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "count" INTEGER NOT NULL,
  "expires_at" DATETIME NOT NULL
);
CREATE INDEX "request_limits_expires_at_idx" ON "request_limits"("expires_at");
