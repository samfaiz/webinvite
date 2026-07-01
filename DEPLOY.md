# Deploying to your VPS

Single Linux server (Ubuntu 22.04+ assumed). Docker Compose runs the two apps;
host **nginx + certbot** terminate HTTPS and reverse-proxy to them. The database
(SQLite) and all uploads live on persistent Docker volumes.

```
Internet ──▶ nginx (443, host) ──┬─ /        ─▶ frontend container :3000
                                 ├─ /api/    ─▶ backend  container :4000
                                 └─ /uploads/─▶ backend  container :4000
                                          volumes: db(/data)  uploads(/app/uploads)
```

---

## 0. Before you start
- A domain (e.g. `your-domain.com`) with an **A record** pointing to the VPS IP
  (add `www` too if you want it).
- SSH access to the VPS as a sudo user.

## 1. Install Docker, nginx, certbot on the VPS
```bash
# Docker + compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

# nginx + certbot
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

## 2. Get the code
```bash
git clone https://github.com/<you>/<repo>.git
cd <repo>
```

## 3. Configure environment (never commit these)
```bash
# backend secrets
cp backend/.env.example backend/.env
nano backend/.env
#   JWT_SECRET=<long random string, e.g. `openssl rand -hex 32`>
#   FRONTEND_ORIGIN=https://your-domain.com
#   MAIL_FROM=Eternal <no-reply@your-domain.com>
#   (DATABASE_URL and PORT are set by docker-compose — leave as-is)

# frontend build-time API URL (root .env, read by docker-compose)
echo 'NEXT_PUBLIC_API_URL=https://your-domain.com/api' > .env
```

## 4. Build and start the containers
```bash
docker compose up -d --build
docker compose ps          # backend + frontend should be "running"
docker compose logs -f backend   # watch first-boot migrations
```
The backend runs `prisma migrate deploy` on boot (creates the SQLite schema on
the `db` volume) and seeds the sample music library.

## 5. Point nginx at the containers
```bash
sudo cp nginx/wedding.conf /etc/nginx/sites-available/wedding.conf
sudo sed -i 's/your-domain.com/REAL-DOMAIN.com/g' /etc/nginx/sites-available/wedding.conf
sudo ln -s /etc/nginx/sites-available/wedding.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## 6. Enable HTTPS
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```
Certbot adds the 443 server block, installs the cert, and sets up auto-renewal.
Visit `https://your-domain.com` — the invitation builder should load.

## 7. Create the first admin
Register a normal account on the site (`/login` → create account), then promote it:
```bash
docker compose exec backend sh -c \
  "echo \"UPDATE User SET role='admin' WHERE email='you@example.com';\" | npx prisma db execute --schema prisma/schema.prisma --stdin"
```
Log out/in — you now have `/admin` (Designs, Music, Email settings, RSVPs).
Then set the outgoing email under **Admin → Email settings** (Gmail needs an
App Password) so RSVP exports actually send.

---

## Updating after a code change
```bash
git pull
docker compose up -d --build
```
Migrations apply automatically on backend boot.

## Backups (important — this is all the real data)
```bash
# database
docker compose cp backend:/data/prod.db ./backup-$(date +%F).db
# uploaded media
docker run --rm -v "$(pwd)":/out -v wedding_uploads:/u alpine \
  tar czf /out/uploads-$(date +%F).tgz -C /u .
```
Schedule these with cron. (Volume names are prefixed by the compose project dir,
e.g. `wedding_db` / `wedding_uploads` — check with `docker volume ls`.)

## Scaling later (optional)
SQLite is fine for launch-level traffic. If writes grow heavy, switch to
PostgreSQL: change the Prisma `provider` to `postgresql`, add a `db` service to
compose, regenerate migrations, and point `DATABASE_URL` at it. Ask and I'll wire it.

---

# Alternative: CloudPanel (or any panel-managed server)

If your site lives at `/home/<user>/htdocs/<domain>` (e.g.
`/home/webinvite/htdocs/webinvite.co`), you're on **CloudPanel**. It already
runs nginx + Let's Encrypt, so **skip Docker + host-nginx above** and run the two
Node apps with **PM2**, then point CloudPanel's vhost at them.

### 1. Create the site in CloudPanel
Add a **Node.js** site for your domain (pick **Node 20+**). CloudPanel creates
the user + `/home/<user>/htdocs/<domain>` and can issue the SSL cert (SSL/TLS tab).

### 2. Get the code into the site dir
SSH in, then (as root, or `su - <user>`):
```bash
cd /home/webinvite/htdocs/webinvite.co
rm -f index.html            # remove CloudPanel's placeholder if present
git clone https://github.com/<you>/<repo>.git .
npm install -g pm2          # if not already installed
```

### 3. Backend
```bash
cd /home/webinvite/htdocs/webinvite.co/backend
cp .env.example .env
nano .env
#   JWT_SECRET=<openssl rand -hex 32>
#   FRONTEND_ORIGIN=https://webinvite.co
#   DATABASE_URL="file:./prod.db"     # MUST start with file:  (→ prisma/prod.db)
#   PORT=4000
npm ci
npx prisma migrate deploy
npm run build
```

### 4. Frontend
```bash
cd /home/webinvite/htdocs/webinvite.co/frontend
echo 'NEXT_PUBLIC_API_URL=https://webinvite.co/api' > .env.local
npm ci
npm run build
```

### 5. Start both with PM2
```bash
cd /home/webinvite/htdocs/webinvite.co
pm2 start ecosystem.config.js
pm2 save
pm2 startup          # run the command it prints (as root) so they survive reboot
pm2 status           # webinvite-api + webinvite-web should be "online"
```

### 6. Point CloudPanel's vhost at the apps
Site → **Vhost** tab. Inside the `server { ... }` block, set the body-size limit
and route the three paths (put `/api/` and `/uploads/` **before** the `/` block):
```nginx
client_max_body_size 100M;

location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
location /uploads/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```
Save (CloudPanel reloads nginx), then enable **Let's Encrypt SSL** in the SSL/TLS tab.

### 7. First admin
```bash
cd /home/webinvite/htdocs/webinvite.co/backend
echo "UPDATE User SET role='admin' WHERE email='you@example.com';" \
  | npx prisma db execute --schema prisma/schema.prisma --stdin
```

### Updating later
```bash
cd /home/webinvite/htdocs/webinvite.co && git pull
cd backend  && npm ci && npx prisma migrate deploy && npm run build && pm2 restart webinvite-api
cd ../frontend && npm ci && npm run build && pm2 restart webinvite-web
```

Uploads live at `backend/uploads/` and the DB at `backend/prisma/prod.db` — both
on the normal filesystem, so back them up (and they survive redeploys).

---

## Troubleshooting
- **502 from nginx** → a container isn't up: `docker compose ps` / `logs`.
- **Uploads/images 404 or wrong host** → confirm nginx passes `Host` and
  `X-Forwarded-Proto` (they're in `wedding.conf`); the API builds URLs from them.
- **CORS errors** → `FRONTEND_ORIGIN` in `backend/.env` must match your https domain.
- **Changed `NEXT_PUBLIC_API_URL`** → rebuild the frontend (`docker compose up -d --build`);
  it's baked in at build time.
