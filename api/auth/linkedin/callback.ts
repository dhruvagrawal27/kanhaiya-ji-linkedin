import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string;
  if (!code) return res.status(400).send("Missing code");

  const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID!;
  const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET!;
  const APP_URL = (process.env.APP_URL || "").replace(/\/$/, "");
  const REDIRECT_URI = `${APP_URL}/api/auth/linkedin/callback`;

  try {
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI, client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
    });
    const tokenData = await tokenRes.json() as any;
    if (!tokenData.access_token) return res.status(500).send("Token exchange failed: " + JSON.stringify(tokenData));

    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
    const profile = await profileRes.json() as any;

    // On Vercel we can't persist — show user what to add to env vars
    res.send(`
      <html><body style="font-family:sans-serif;padding:2rem;background:#0a0a0f;color:white">
        <h2>✅ LinkedIn Connected!</h2>
        <p>Add these to your Vercel environment variables and redeploy:</p>
        <pre style="background:#111;padding:1rem;border-radius:8px;color:#4ade80">
LINKEDIN_ACCESS_TOKEN=${tokenData.access_token}
LINKEDIN_PERSON_URN=urn:li:person:${profile.sub}
LINKEDIN_USER_NAME=${profile.name || profile.given_name}
        </pre>
        <a href="/" style="color:#0077B5">← Back to app</a>
      </body></html>
    `);
  } catch (err) {
    res.status(500).send("OAuth error: " + err);
  }
}
