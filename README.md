# Shadow Tip4Serv Store Theme

Shadow is a modern React storefront for game servers using Tip4Serv. It includes a responsive catalog, product pages, cart drawer, checkout flow, account area, Discord OAuth support, theme switching, translations, and an admin page for storing the Tip4Serv API key server-side.

## Demo

Live demo: [https://shadow.ark-france.fr/](https://shadow.ark-france.fr/)

![Shadow theme showcase](theme_showcase.webp)

## Stack

- React 19
- TypeScript
- Vite 7
- Tailwind CSS 3
- React Router 7
- Node.js API server
- MySQL

## Backend

Supabase has been replaced by a Node/MySQL backend in `server/`.

The API exposes:

- `/api/tip4serv-proxy` for Tip4Serv catalog, store and checkout calls
- `/api/admin/*` for claiming the site, login and settings
- `/api/discord-oauth` for Discord OAuth exchange
- `/api/rcon-players` for configured RCON server listing

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a MySQL database and import the schema:

```bash
mysql -u shadow -p shadow < database/mysql/schema.sql
```

3. Copy `.env.example` to `.env`, then fill the MySQL values:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=shadow
MYSQL_PASSWORD=change-me
MYSQL_DATABASE=shadow
ADMIN_JWT_SECRET=change-this-long-random-secret
```

4. Start the API server:

```bash
npm run dev:api
```

5. Start the frontend:

```bash
npm run dev
```

6. Open `/admin`, claim the site, then save the Tip4Serv API key.

## Commands

```bash
npm run dev
npm run dev:api
npm test
npm run build
npm run typecheck
npm run lint
```

`npm test` exercises the checkout API with mocked upstream requests and a dummy
credential. It makes no real payments and does not need MySQL. Non-production
environments, including Railway staging, continue to reject checkout with HTTP 403.
