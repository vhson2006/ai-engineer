import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageModule } from '@app/common';
import { OutboxModule } from '../messaging/outbox.module';
import { ImageService } from './image.service';
import { FakeImageProvider } from './providers/fake-image.provider';
import { GeminiImageProvider } from './providers/gemini-image.provider';
import { IMAGE_PROVIDER, type ImageProvider } from './providers/image-provider';

/** The provider of AI_IMAGE_PROVIDER (validated in the root module's env schema). */
export function imageProvider(config: ConfigService): ImageProvider {
  switch (config.getOrThrow<string>('AI_IMAGE_PROVIDER')) {
    case 'gemini':
      return new GeminiImageProvider(
        config.getOrThrow<string>('GEMINI_API_KEY'),
        config.getOrThrow<string>('AI_GEMINI_IMAGE_MODEL'),
        config.getOrThrow<number>('AI_PROVIDER_TIMEOUT_MS'),
      );
    default:
      return new FakeImageProvider();
  }
}

/** Image generation (ADR 0037): writes the optimized images to the public bucket (StorageModule). */
@Module({
  imports: [OutboxModule, StorageModule],
  providers: [
    { provide: IMAGE_PROVIDER, inject: [ConfigService], useFactory: imageProvider },
    ImageService,
  ],
  exports: [ImageService],
})
export class ImagesModule {}
