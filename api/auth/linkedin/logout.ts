import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  // On Vercel tokens come from env vars — just inform client
  res.json({ ok: true });
}
