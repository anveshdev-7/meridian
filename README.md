# Meridian

A clean AI chatbot with chat history, settings and a light/dark theme. Powered by Groq (GPT-OSS 120B). The API key stays on the server and is never sent to the browser.

## Run locally

1. Install Node.js 18 or newer.
2. Copy `.env.example` to `.env` and put your Groq API key in it.
3. Run `node server.js` (or double-click `start.bat` on Windows).
4. Open http://localhost:3000

## Deploy

This app needs a Node server, so GitHub Pages will not work. Use a host that runs Node (Render, Railway, Fly.io):

- Start command: `node server.js`
- Environment variable: `GROQ_API_KEY` set to your key in the host's dashboard

## Security

Never commit `.env`. It is listed in `.gitignore`.
