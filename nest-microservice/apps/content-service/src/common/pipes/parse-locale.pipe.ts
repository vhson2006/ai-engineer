import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { LOCALE_PATTERN } from '@app/common';

/** `:locale` must look like a language code (vi, en, en-US), else 400. */
@Injectable()
export class ParseLocalePipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !LOCALE_PATTERN.test(value)) {
      throw new BadRequestException('locale must be a language code such as vi or en');
    }
    return value;
  }
}
