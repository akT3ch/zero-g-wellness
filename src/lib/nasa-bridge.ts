import { z } from 'zod';
import { weatherRequest } from './nasa.functions';
export const bridgeRequest = z.discriminatedUnion('kind', [
  weatherRequest.innerType().extend({ type: z.literal('astro:nasa-request'), id: z.string().uuid(), kind: z.literal('weather') }).strict(),
  z.object({ type: z.literal('astro:nasa-request'), id: z.string().uuid(), kind: z.literal('search'), term: z.string().trim().max(150).regex(/^[^\x00-\x1f]*$/) }).strict(),
]);
export function readBridgeRequest(event: MessageEvent, origin: string, source: Window | null) {
  if (!source || event.origin !== origin || event.source !== source) return null;
  const parsed = bridgeRequest.safeParse(event.data);
  return parsed.success ? parsed.data : null;
}