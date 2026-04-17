import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const name = process.env.LINKEDIN_USER_NAME;
  if (token && name) {
    res.json({ connected: true, name });
  } else {
    res.json({ connected: false });
  }
}
