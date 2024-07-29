# postgres-new

In-browser Postgres sandbox with AI assistance. Built on Next.js.

## Development

1. Install deps:
   ```shell
   npm i
   ```
2. Start local Supabase stack:
   ```shell
   npx supabase start
   ```
3. Store local Supabase URL/anon key in `.env.local`:
   ```shell
   npx supabase status -o env \
     --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
     --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY |
       grep NEXT_PUBLIC >> .env.local
   ```
4. Create an [OpenAI API key](https://platform.openai.com/api-keys) and save to `.env.local`:
   ```shell
   echo 'OPENAI_API_KEY="<openai-api-key>"' >> .env.local
   ```
5. Start Next.js development server:
   ```shell
   npm run dev
   ```
