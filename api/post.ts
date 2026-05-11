import type { VercelRequest, VercelResponse } from "@vercel/node";

// Disable Vercel's auto body-parser — read raw bytes to guarantee nothing is truncated
export const config = { api: { bodyParser: false } };

async function getRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let post: string;
  try {
    const raw = await getRawBody(req);
    const body = JSON.parse(raw);
    post = body?.post;
    console.log(`[post] Received body length: ${raw.length}, post length: ${post?.length}`);
  } catch (e) {
    return res.status(400).json({ error: "Failed to parse request body", details: String(e) });
  }
  if (!post) return res.status(400).json({ error: "No post content" });

  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;
  if (!accessToken || !personUrn) return res.status(401).json({ error: "LinkedIn not configured in environment variables" });

  try {
    const payload = {
      author: personUrn,
      commentary: post,
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };

    // Log the outgoing payload (safe for debugging; does not include secrets)
    console.log('[post] Sending payload to LinkedIn:', JSON.stringify(payload));

    const response = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202604",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get('content-type') || '';
    const responseBody = contentType.includes('application/json') ? await response.json() : await response.text();

    if (response.status === 201 || response.status === 200) {
      console.log('[post] LinkedIn success:', responseBody);
      res.json([{ posted: "yes" }]);
    } else {
      console.error(`[post] LinkedIn ${response.status}:`, responseBody);
      res.status(500).json({ error: `LinkedIn API returned ${response.status}`, details: responseBody, payload });
    }
  } catch (err) {
    console.error('[post] Exception when posting to LinkedIn:', err);
    res.status(500).json({ error: "Failed to post", details: String(err) });
  }
}
