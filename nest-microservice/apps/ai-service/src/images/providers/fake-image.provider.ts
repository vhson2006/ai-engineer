import sharp from 'sharp';
import type { ImageAspectRatio } from '@app/common';
import type { GeneratedPicture, ImageProvider } from './image-provider';

/** Width × height of a 1K image per aspect ratio (what the real providers return, roughly). */
export const ONE_K: Record<ImageAspectRatio, [number, number]> = {
  '16:9': [1376, 768],
  '4:3': [1184, 888],
  '1:1': [1024, 1024],
  '3:4': [888, 1184],
  '9:16': [768, 1376],
};

/** No AI, no network: a green picture with the prompt's first words, the right size. */
export class FakeImageProvider implements ImageProvider {
  readonly name = 'fake';

  async generate({
    prompt,
    aspectRatio,
  }: {
    prompt: string;
    aspectRatio: ImageAspectRatio;
  }): Promise<GeneratedPicture> {
    const [width, height] = ONE_K[aspectRatio];
    const label = prompt.slice(0, 40).replace(/[<>&"']/g, '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#13883a"/>
      <circle cx="${width * 0.8}" cy="${height * 0.25}" r="${height * 0.12}" fill="#ffd400"/>
      <text x="50%" y="55%" font-family="Arial" font-size="${Math.round(height / 14)}" fill="#ffffff" text-anchor="middle">AI · ${label}</text>
    </svg>`;
    const data = await sharp(Buffer.from(svg)).png().toBuffer();
    return { data, model: 'fake', inputTokens: 0, outputTokens: 0 };
  }
}
