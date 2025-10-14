-- CreateIndex
CREATE INDEX `Quotation_status_idx` ON `Quotation`(`status`);

-- CreateIndex
CREATE INDEX `Quotation_createdAt_idx` ON `Quotation`(`createdAt`);

-- RenameIndex
ALTER TABLE `quotation` RENAME INDEX `Quotation_requestId_fkey` TO `Quotation_requestId_idx`;
