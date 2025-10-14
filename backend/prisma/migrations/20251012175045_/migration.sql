-- CreateIndex
CREATE INDEX `ServiceRequest_status_idx` ON `ServiceRequest`(`status`);

-- CreateIndex
CREATE INDEX `ServiceRequest_createdAt_idx` ON `ServiceRequest`(`createdAt`);

-- CreateIndex
CREATE INDEX `SiteVisit_status_scheduledAt_idx` ON `SiteVisit`(`status`, `scheduledAt`);

-- RenameIndex
ALTER TABLE `servicerequest` RENAME INDEX `ServiceRequest_categoryId_fkey` TO `ServiceRequest_categoryId_idx`;

-- RenameIndex
ALTER TABLE `sitevisit` RENAME INDEX `SiteVisit_requestId_fkey` TO `SiteVisit_requestId_idx`;
