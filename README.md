# database.build ([formerly postgres.new](#why-rename-postgresnew))

In-browser Postgres sandbox with AI assistance.

![github-repo-hero](https://github.com/user-attachments/assets/1ace0688-dfa7-4ddb-86bc-c976fa5b2f42)

With [database.build](https://database.build), you can instantly spin up an unlimited number of Postgres databases that run directly in your browser (and soon, deploy them to S3).

Each database is paired with a large language model (LLM) which opens the door to some interesting use cases:

- Drag-and-drop CSV import (generate table on the fly)
- Generate and export reports
- Generate charts
- Build database diagrams

## How it works

All queries in database.build run directly in your browser. There’s no remote Postgres container or WebSocket proxy.

How is this possible? [PGlite](https://pglite.dev/), a WASM version of Postgres that can run directly in your browser. Every database that you create spins up a new instance of PGlite that exposes a fully-functional Postgres database. Data is stored in IndexedDB so that changes persist after refresh.

## Monorepo

This is a monorepo split into the following projects:

- [Web](./apps/web/): The primary web app built with Next.js
- [Browser proxy](./apps/browser-proxy/): Proxies Postgres TCP connections back to the browser using [pg-gateway](https://github.com/supabase-community/pg-gateway) and Web Sockets
- [Deploy worker](./apps/deploy-worker/): Deploys in-browser databases to database platforms (currently Supabase is supported)

### Setup

From the monorepo root:

1. Install dependencies

   ```shell
   npm i
   ```

2. Start local Supabase stack:
   ```shell
   npx supabase start
   ```
3. Store local Supabase URL/anon key in `./apps/web/.env.local`:
   ```shell
   npx supabase status -o env \
     --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
     --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY |
       grep NEXT_PUBLIC >> ./apps/web/.env.local
   ```
4. Create an [OpenAI API key](https://platform.openai.com/api-keys) and save to `./apps/web/.env.local`:
   ```shell
   echo 'OPENAI_API_KEY="<openai-api-key>"' >> ./apps/web/.env.local
   ```
5. Store local KV (Redis) vars. Use these exact values:

   ```shell
   echo 'KV_REST_API_URL="http://localhost:8080"' >> ./apps/web/.env.local
   echo 'KV_REST_API_TOKEN="local_token"' >> ./apps/web/.env.local
   ```

6. Start local Redis containers (used for rate limiting). Serves an API on port 8080:

   ```shell
   docker compose -f ./apps/web/docker-compose.yml up -d
   ```

7. Fill in the remaining variables for each app as seen in:

   - `./apps/web/.env.example`
   - `./apps/browser-proxy/.env.example`
   - `./apps/deploy-worker/.env.example`

### Development

From the monorepo root:

```shell
npm run dev
```

_**Important:** This command uses `turbo` under the hood which understands the relationship between dependencies in the monorepo and automatically builds them accordingly (ie. `./packages/*`). If you by-pass `turbo`, you will have to manually build each `./packages/*` before each `./app/*` can use them._

## Why rename postgres.new?

This project is not an official Postgres project and we don’t want to mislead anyone! We’re renaming to database.build because, well, that’s what this does. This will still be 100% Postgres-focused, just with a different URL.

## Video

[![image](https://github.com/user-attachments/assets/9da04785-d813-4e9c-a400-4e00c63381a1)](https://youtu.be/ooWaPVvljlU)

## License

Apache 2.0
