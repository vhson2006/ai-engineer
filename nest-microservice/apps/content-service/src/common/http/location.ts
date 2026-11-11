import type { Request, Response } from 'express';

/** 201 Location: the collection path of this request (same through KrakenD, /api prefix) + id. */
export function setLocation(req: Request, res: Response, id: string): void {
  const collectionPath = req.originalUrl.split('?')[0].replace(/\/$/, '');
  res.location(`${collectionPath}/${encodeURIComponent(id)}`);
}
