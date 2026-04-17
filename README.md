# ⚡ Post Weaver · Kanhaiya Kumar

A dark-themed LinkedIn post automation tool — generate, refine, and publish posts directly to LinkedIn with one click.

## Features

- **Generate** posts from a topic via n8n webhook
- **Refine / Iterate** the draft with follow-up prompts
- **Post directly to LinkedIn** via OAuth 2.0 (no n8n needed for publishing)
- **Persistent login** — authenticate once, token stored securely
- **Version history** — browse and restore previous drafts
- **Character counter** with 3000-char LinkedIn limit

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 (dark premium theme)
- LinkedIn REST API (`/rest/posts`) — version `202604`
- n8n webhooks for AI post generation
- Vercel serverless functions (`/api/`)

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your credentials:
   ```
   LINKEDIN_CLIENT_ID=
   LINKEDIN_CLIENT_SECRET=
   APP_URL=http://localhost:5173
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:5173` and connect your LinkedIn account via the header button.

## Deploy to Vercel

1. Push to GitHub and import the repo in [Vercel](https://vercel.com).
2. Set the following environment variables in the Vercel dashboard:
   - `LINKEDIN_CLIENT_ID`
   - `LINKEDIN_CLIENT_SECRET`
   - `APP_URL` (your Vercel deployment URL)
   - `LINKEDIN_ACCESS_TOKEN` (after authenticating via `/auth/linkedin`)
   - `LINKEDIN_PERSON_URN`
   - `LINKEDIN_USER_NAME`
3. Add your Vercel callback URL to the LinkedIn Developer Portal:
   `https://<your-app>.vercel.app/api/auth/linkedin/callback`
