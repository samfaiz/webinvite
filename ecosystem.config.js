// PM2 process list for panel-managed servers (CloudPanel, etc.) where nginx +
// SSL are handled by the panel. Run `pm2 start ecosystem.config.js` from the
// repo root (e.g. /home/webinvite/htdocs/webinvite.co).
//
//   backend  → NestJS API on 127.0.0.1:4000 (reads backend/.env)
//   frontend → Next.js on 127.0.0.1:3000

module.exports = {
  apps: [
    {
      name: "webinvite-api",
      cwd: "backend",
      script: "dist/main.js",
      env: { NODE_ENV: "production" },
    },
    {
      name: "webinvite-web",
      cwd: "frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      env: { NODE_ENV: "production", PORT: "3000" },
    },
  ],
};
