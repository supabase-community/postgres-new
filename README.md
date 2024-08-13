# postgres.new

In-browser Postgres sandbox with AI assistance.

![github-repo-hero](https://github.com/user-attachments/assets/e55f7c0d-a817-4aeb-838e-728aabda3a5d)

With [postgres.new](https://postgres.new), you can instantly spin up an unlimited number of Postgres databases that run directly in your browser (and soon, deploy them to S3). 

Each database is paired with a large language model (LLM) which opens the door to some interesting use cases:

- Drag-and-drop CSV import (generate table on the fly)
- Generate and export reports
- Generate charts
- Build database diagrams

## How it works
All queries in postgres.new run directly in your browser. There’s no remote Postgres container or WebSocket proxy.

How is this possible? [PGlite](https://pglite.dev/), a WASM version of Postgres that can run directly in your browser. Every database that you create spins up a new instance of PGlite that exposes a fully-functional Postgres database. Data is stored in IndexedDB so that changes persist after refresh.

## Monorepo

This is a monorepo split into the following projects:

- [Frontend (Next.js)](./apps/postgres-new/): This contains the primary web app built with Next.js
- [Backend (pg-gateway)](./apps/db-service/): This serves S3-backed PGlite databases over the PG wire protocol using [pg-gateway](https://github.com/supabase-community/pg-gateway)

## Video

[![image](https://github.com/user-attachments/assets/9da04785-d813-4e9c-a400-4e00c63381a1)](https://youtu.be/ooWaPVvljlU)

## License

Apache 2.0
