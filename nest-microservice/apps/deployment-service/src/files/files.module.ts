import { Module } from '@nestjs/common';
import { StorageModule } from '@app/common';
import { FilesCleanupService } from './files-cleanup.service';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

/**
 * Uploaded files: table `files` + object storage (STORAGE_* env, see libs/common/src/storage).
 * Exports FilesService so other features (deployments) can attach files in their transactions.
 * PrismaService comes from the global PrismaModule.
 */
@Module({
  imports: [StorageModule],
  controllers: [FilesController],
  providers: [FilesService, FilesCleanupService],
  exports: [FilesService],
})
export class FilesModule {}
