import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { SLUG_PATTERN } from '@app/common';

/** `:siteId` must look like a site id (lowercase words joined by hyphens), else 400. */
@Injectable()
export class ParseSiteIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || value.length > 50 || !SLUG_PATTERN.test(value)) {
      throw new BadRequestException('siteId must be a site id such as nails');
    }
    return value;
  }
}
