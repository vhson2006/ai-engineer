import { HttpStatus } from '@nestjs/common';
import { assertIfMatch, entityTag, parseIfMatch } from './conditional-requests';

describe('conditional requests', () => {
  it('entityTag quotes the revision (strong tag)', () => {
    expect(entityTag(3)).toBe('"3"');
  });

  it.each([
    [undefined, undefined],
    ['*', '*'],
    [' * ', '*'],
    ['"3"', ['"3"']],
    ['"3", "4"', ['"3"', '"4"']],
    ['W/"3", "4"', ['"4"']], // weak tags never match with the strong comparison
    ['3', []], // unquoted: not an entity tag
  ])('parseIfMatch(%p) → %p', (header, expected) => {
    expect(parseIfMatch(header)).toEqual(expected);
  });

  const statusOf = (header: string | undefined): number | undefined => {
    try {
      assertIfMatch(header, '"3"');
      return undefined;
    } catch (error) {
      return (error as { getStatus(): number }).getStatus();
    }
  };

  it('passes on a matching tag or *', () => {
    expect(statusOf('"3"')).toBeUndefined();
    expect(statusOf('"1", "3"')).toBeUndefined();
    expect(statusOf('*')).toBeUndefined();
  });

  it('428 when missing, 412 when stale', () => {
    expect(statusOf(undefined)).toBe(HttpStatus.PRECONDITION_REQUIRED);
    expect(statusOf('"2"')).toBe(HttpStatus.PRECONDITION_FAILED);
    expect(statusOf('W/"3"')).toBe(HttpStatus.PRECONDITION_FAILED);
    expect(statusOf('3')).toBe(HttpStatus.PRECONDITION_FAILED);
  });
});
