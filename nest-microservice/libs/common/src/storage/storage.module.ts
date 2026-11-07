import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OBJECT_STORAGE } from './object-storage';
import { S3ObjectStorage } from './s3-object-storage';
import { storageConfigFromEnv } from './storage.config';

/**
 * Provides OBJECT_STORAGE (S3ObjectStorage configured from STORAGE_* env). Import it in the
 * feature module that handles files; validate the env with STORAGE_ENV_SCHEMA.
 *   constructor(@Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage) {}
 */
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: OBJECT_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new S3ObjectStorage(
          storageConfigFromEnv((key) => {
            const value = config.get<string | number | boolean>(key);
            return value === undefined || value === null ? undefined : String(value);
          }),
        ),
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
