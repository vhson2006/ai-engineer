import Image from 'next/image';
import { articleImage, type ArticleBlock } from './data';

/**
 * An article's body, from structured blocks (never raw HTML: when the API sends rich text, it is
 * sanitized on the server with an allow-list first, see .claude/rules/ui.md).
 */
export function ArticleBody({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <div className="space-y-6 text-lg leading-[1.8] text-pretty">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'h2':
            return (
              <h2 key={index} className="!mt-14 font-display text-3xl leading-tight font-bold text-brand-strong">
                {block.text}
              </h2>
            );
          case 'quote':
            return (
              <blockquote key={index} className="!my-10 border-l-4 border-brand bg-surface-2 py-5 pr-6 pl-7 font-display text-2xl leading-snug italic">
                {block.text}
              </blockquote>
            );
          case 'list':
            return (
              <ul key={index} className="space-y-3">
                {block.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden className="mt-[0.15em] text-sm text-brand">
                      ◆
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );
          case 'image':
            return (
              <figure key={index} className="!my-12">
                <div className="frame-ornate overflow-hidden rounded-3xl p-1.5">
                  <Image src={articleImage(block.image)} alt={block.alt} placeholder="blur" sizes="(min-width: 768px) 720px, 100vw" className="w-full rounded-[1.25rem] object-cover" />
                </div>
                {block.caption && <figcaption className="mt-3 text-center text-sm text-muted">{block.caption}</figcaption>}
              </figure>
            );
          default:
            return <p key={index}>{block.text}</p>;
        }
      })}
    </div>
  );
}
