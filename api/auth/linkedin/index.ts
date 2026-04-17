import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID!;
  const APP_URL = (process.env.APP_URL || "").replace(/\/$/, "");
  const REDIRECT_URI = `${APP_URL}/api/auth/linkedin/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "openid profile email w_member_social",
  });
  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
}
