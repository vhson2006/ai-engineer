import {
  briefStart,
  normalizeArticle,
  normalizeBrief,
  type ArticleAuthor,
  type ArticleDraft,
  type ArticleRequest,
  type BriefRequest,
  type WrittenBrief,
} from './article-author';

/** No AI, no network: a brief and an article that only say what they are for (tests, offline). */
export class FakeArticleAuthor implements ArticleAuthor {
  readonly name = 'fake';

  brief(request: BriefRequest): Promise<WrittenBrief> {
    const { idea } = request;
    const brief = normalizeBrief(request, {
      prompt: `${briefStart(request.language)} for ${request.brand.name}. Topic: ${idea.topic}. Idea: ${idea.idea}. Length: ${idea.length}. Facts: ${request.facts.map((f) => f.text).join(' / ')}`,
      outline: [`${idea.topic}: why it matters`, `${idea.idea}: how`, 'Questions'],
    })!;
    return Promise.resolve({ ...brief, model: 'fake', inputTokens: 0, outputTokens: 0 });
  }

  write(request: ArticleRequest): Promise<ArticleDraft> {
    const article = normalizeArticle(request, {
      title: request.outline[0],
      excerpt: request.prompt.slice(0, 160),
      coverPrompt: 'A calm, bright photo of the topic',
      coverAlt: request.outline[0],
      blocks: [
        { type: 'lead', text: request.prompt.slice(0, 200) },
        ...request.outline.flatMap((heading) => [
          { type: 'heading', text: heading },
          { type: 'paragraph', text: `About **${heading}**.` },
        ]),
        { type: 'tip', title: 'Tip', text: 'A useful tip.' },
        { type: 'image', prompt: 'A detail of the topic', alt: 'A detail', caption: 'A detail' },
        { type: 'faq', items: [{ title: 'A question?', text: 'An answer.' }] },
        { type: 'cta', title: 'Visit us', text: 'Call or book online.' },
      ],
    })!;
    return Promise.resolve({ article, model: 'fake', inputTokens: 0, outputTokens: 0 });
  }
}
