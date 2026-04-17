import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { post } = req.body || {};
  if (!post) return res.status(400).json({ error: "No post content" });

  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;
  if (!accessToken || !personUrn) return res.status(401).json({ error: "LinkedIn not configured in environment variables" });

  try {
    const response = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202604",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: personUrn,
        commentary: post,
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });

    if (response.status === 201 || response.status === 200) {
      res.json([{ posted: "yes" }]);
    } else {
      const err = await response.text();
      console.error(`[post] LinkedIn ${response.status}:`, err);
      res.status(500).json({ error: `LinkedIn API returned ${response.status}`, details: err });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to post", details: String(err) });
  }
}
