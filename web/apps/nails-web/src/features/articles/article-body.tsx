import Image from 'next/image';
import { Check } from 'lucide-react';
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
              <h2 key={index} className="!mt-14 text-3xl leading-tight font-extrabold tracking-[-0.03em]">
                {block.text}
              </h2>
            );
          case 'quote':
            return (
              <blockquote key={index} className="!my-10 rounded-3xl bg-lilac px-7 py-6 text-xl leading-snug font-semibold text-[#263238]">
                {block.text}
              </blockquote>
            );
          case 'list':
            return (
              <ul key={index} className="space-y-3">
                {block.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden className="mt-[0.35em] grid size-5 shrink-0 place-items-center rounded-full bg-mint">
                      <Check className="size-3 text-[#263238]" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );
          case 'image':
            return (
              <figure key={index} className="!my-12">
                <Image src={articleImage(block.image)} alt={block.alt} placeholder="blur" sizes="(min-width: 768px) 720px, 100vw" className="w-full rounded-3xl object-cover" />
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
