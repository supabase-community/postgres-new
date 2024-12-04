# @database.build/web

In-browser Postgres sandbox with AI assistance. Built on Next.js.

## Architecture

We use PGlite for 2 purposes:

1. A "meta" DB that keeps track of all of the user databases along with their message history
2. A "user" DB for each database the user creates along with whatever tables/data they've created

Both databases are stored locally in the browser via IndexedDB. This means that these databases are not persisted to the cloud and cannot be accessed from multiple devices (though this is on the roadmap).

Every PGlite instance runs in a Web Worker so that the main thread is not blocked.

## AI

The AI component is powered by OpenAI's GPT-4o model by default. The project uses [Vercel's AI SDK](https://sdk.vercel.ai/docs/introduction) to simplify message streams and tool calls.

### Environment Variables

In addition to the required `OPENAI_API_KEY`, the following environment variables can be configured:

- `OPENAI_API_BASE`: (Optional) The base URL for the OpenAI API. Defaults to `https://api.openai.com/v1`.
- `OPENAI_MODEL`: (Optional) The model used by the AI component. Defaults to `gpt-4o-2024-08-06`.

**NOTE**: The current prompts and tools are designed around the GPT-4o model. If you choose to use a different model, expect different behavior and results. Additionally, ensure that the model you select supports tool (function) call capabilities.

## Authentication

Because LLMs cost money, a lightweight auth wall exists to prevent abuse. It is currently only used to validate that the user has a legitimate GitHub account, but in the future it could be used to save private/public databases to the cloud.

Authentication and users are managed by a [Supabase](https://supabase.com/) database. You can find the migrations and other configuration for this in the root [`./supabase`](../../supabase/) directory.

## Development

The Next.js server should run from the monorepo root. See [Development](../../README.md#development).
