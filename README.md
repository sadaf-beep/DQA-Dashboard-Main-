<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/96e3fef6-79e8-4288-aeb3-c462b6297bc7

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

The Gemini API key is no longer a local env var - it's set as a Supabase
Edge Function secret (`GEMINI_API_KEY`) and used only server-side by
`supabase/functions/gemini-proxy`. See `SECURITY.md`.
