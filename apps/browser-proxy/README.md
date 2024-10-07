# Browser Proxy

This app is a proxy that sits between the browser and a PostgreSQL client.

It is using a WebSocket server and a TCP server to make the communication between the PGlite instance in the browser and a standard PostgreSQL client possible.

## Development

Copy the `.env.example` file to `.env` and set the correct environment variables.

Install dependencies:

```sh
npm install
```

Start the proxy in development mode:

```sh
npm run dev
```

## Deployment

Create a new app on Fly.io, for example `database-build-browser-proxy`.

Fill the app's secrets with the correct environment variables based on the `.env.example` file.

Deploy the app:

```sh
fly deploy --app database-build-browser-proxy
```