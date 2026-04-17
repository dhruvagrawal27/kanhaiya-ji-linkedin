import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const response = await fetch("https://glowing-g79w8.crab.containers.automata.host/webhook/kanhaiya-iter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const text = await response.text();
    try {
      res.json(JSON.parse(text));
    } catch {
      res.status(500).json({ error: "Webhook returned non-JSON", raw: text });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to reach webhook" });
  }
}
