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

## Live Share
With Live Share, you can connect directly to your in-browser PGlite databases from _outside the browser_.

https://github.com/user-attachments/assets/eecc7f10-6251-4a18-9982-543ab349f3a8

## Monorepo

This is a monorepo split into the following projects:

- [Frontend (Next.js)](./apps/postgres-new/): This contains the primary web app built with Next.js
- [Backend (pg-gateway)](./apps/db-service/): This serves S3-backed PGlite databases over the PG wire protocol using [pg-gateway](https://github.com/supabase-community/pg-gateway)

## Why rename postgres.new?

This project is not an official Postgres project and we don’t want to mislead anyone! We’re renaming to database.build because, well, that’s what this does. This will still be 100% Postgres-focused, just with a different URL.

## Video

[![image](https://github.com/user-attachments/assets/9da04785-d813-4e9c-a400-4e00c63381a1)](https://youtu.be/ooWaPVvljlU)

## License

Apache 2.0
