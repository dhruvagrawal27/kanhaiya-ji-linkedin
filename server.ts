import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

// ─── Config from environment ─────────────────────────────────────────────────
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID!;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET!;
const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const REDIRECT_URI = `${APP_URL}/auth/linkedin/callback`;
const TOKEN_FILE = path.join(process.cwd(), ".linkedin-token.json");

type LinkedInToken = { accessToken: string; personUrn: string; name: string };

// ─── Load persisted token ─────────────────────────────────────────────────────
function loadToken(): LinkedInToken | null {
  // 1. Prefer env vars (used on Vercel / production)
  if (process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_PERSON_URN) {
    return {
      accessToken: process.env.LINKEDIN_ACCESS_TOKEN,
      personUrn: process.env.LINKEDIN_PERSON_URN,
      name: process.env.LINKEDIN_USER_NAME || "User",
    };
  }
  // 2. Fall back to local token file (dev)
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
    }
  } catch {}
  return null;
}

function saveToken(token: LinkedInToken) {
  try {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2));
    console.log("[linkedin] Token saved to .linkedin-token.json (auto-loaded on next start)");
    console.log("[linkedin] ── For Vercel deployment, set these env vars ──────────────");
    console.log(`[linkedin]   LINKEDIN_ACCESS_TOKEN = ${token.accessToken}`);
    console.log(`[linkedin]   LINKEDIN_PERSON_URN   = ${token.personUrn}`);
    console.log(`[linkedin]   LINKEDIN_USER_NAME    = ${token.name}`);
    console.log("[linkedin] ────────────────────────────────────────────────────────────");
  } catch (err) {
    console.error("[linkedin] Could not save token file:", err);
  }
}

let linkedInToken: LinkedInToken | null = loadToken();
if (linkedInToken) {
  console.log(`[linkedin] Auto-loaded token for: ${linkedInToken.name}`);
}

// ─── Server ───────────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // ─── LinkedIn OAuth ──────────────────────────────────────────────────────

  app.get("/auth/linkedin", (_req, res) => {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: LINKEDIN_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: "openid profile email w_member_social",
    });
    res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
  });

  app.get("/auth/linkedin/callback", async (req, res) => {
    const code = req.query.code as string;
    if (!code) return res.status(400).send("Missing authorization code");

    try {
      const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: REDIRECT_URI,
          client_id: LINKEDIN_CLIENT_ID,
          client_secret: LINKEDIN_CLIENT_SECRET,
        }),
      });
      const tokenData = await tokenRes.json() as any;
      if (!tokenData.access_token) {
        console.error("[linkedin] Token exchange failed:", tokenData);
        return res.status(500).send("Failed to get access token: " + JSON.stringify(tokenData));
      }

      const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = await profileRes.json() as any;

      const token: LinkedInToken = {
        accessToken: tokenData.access_token,
        personUrn: `urn:li:person:${profile.sub}`,
        name: profile.name || profile.given_name || "User",
      };

      linkedInToken = token;
      saveToken(token);
      console.log(`[linkedin] Authenticated as: ${token.name}`);
      res.redirect("/?linkedin=connected");
    } catch (err) {
      console.error("[linkedin] OAuth error:", err);
      res.status(500).send("OAuth failed: " + err);
    }
  });

  app.get("/auth/linkedin/status", (_req, res) => {
    if (linkedInToken) {
      res.json({ connected: true, name: linkedInToken.name });
    } else {
      res.json({ connected: false });
    }
  });

  app.get("/auth/linkedin/logout", (_req, res) => {
    linkedInToken = null;
    try { fs.unlinkSync(TOKEN_FILE); } catch {}
    res.json({ ok: true });
  });

  // ─── API Routes ──────────────────────────────────────────────────────────

  app.post("/api/generate", async (req, res) => {
    try {
      const response = await fetch("https://glowing-g79w8.crab.containers.automata.host/webhook/kanhaiya", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("[generate] Error:", error);
      res.status(500).json({ error: "Failed to fetch from webhook" });
    }
  });

  app.post("/api/iterate", async (req, res) => {
    try {
      console.log("[iterate] Sending:", JSON.stringify(req.body));
      const response = await fetch("https://glowing-g79w8.crab.containers.automata.host/webhook/kanhaiya-iter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const text = await response.text();
      console.log("[iterate] Response:", text);
      try {
        res.json(JSON.parse(text));
      } catch {
        res.status(500).json({ error: "Webhook returned non-JSON", raw: text });
      }
    } catch (error) {
      console.error("[iterate] Error:", error);
      res.status(500).json({ error: "Failed to fetch from webhook" });
    }
  });

  app.post("/api/post", async (req, res) => {
    const { post } = req.body;
    if (!post) return res.status(400).json({ error: "No post content provided" });
    if (!linkedInToken) return res.status(401).json({ error: "Not authenticated with LinkedIn" });

    try {
      console.log("[post] Posting as:", linkedInToken.personUrn);
      const response = await fetch("https://api.linkedin.com/rest/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${linkedInToken.accessToken}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202504",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: linkedInToken.personUrn,
          commentary: post,
          visibility: "PUBLIC",
          distribution: {
            feedDistribution: "MAIN_FEED",
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          lifecycleState: "PUBLISHED",
          isReshareDisabledByAuthor: false,
        }),
      });

      console.log("[post] LinkedIn API status:", response.status);
      if (response.status === 201 || response.status === 200) {
        res.json([{ posted: "yes" }]);
      } else {
        const errText = await response.text();
        console.error("[post] LinkedIn API error:", errText);
        res.status(500).json({ error: "LinkedIn API error", details: errText });
      }
    } catch (error) {
      console.error("[post] Error:", error);
      res.status(500).json({ error: "Failed to post to LinkedIn" });
    }
  });

  // ─── Vite / Static ───────────────────────────────────────────────────────

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
