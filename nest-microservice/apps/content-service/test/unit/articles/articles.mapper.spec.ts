import { readingMinutes } from '../../../src/articles/articles.mapper';

describe('[articles.mapper] (unit)', () => {
  it('counts title, excerpt and the text of the body at 200 words a minute, at least 1', () => {
    expect(readingMinutes('a', 'b', '<p>c</p>')).toBe(1);
    const long = Array.from({ length: 590 }, () => 'word').join(' ');
    expect(readingMinutes('t', 'e', `<p>${long}</p><ul><li>x</li><li>y</li></ul>`)).toBe(3);
  });

  it('does not glue the words of two blocks together', () => {
    const words = Array.from({ length: 300 }, () => '<p>w</p>').join('');
    expect(readingMinutes('', '', words)).toBe(2);
  });
});
