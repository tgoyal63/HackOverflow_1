# HackOverflow frontend

Use Node.js 22.22.2 or later within the Node 22 release line. Run commands from
this directory. The app uses React 18, React Router 7, Vite, Vitest, and Biome.

```sh
npm ci --include=dev
npm run dev
```

Development runs at `http://localhost:3000`. To use a local API, set
`VITE_API_BASE_URL=http://localhost:8082` in `.env.local` before starting Vite.
The default remains `https://hackoverflow-backend.vercel.app`. Vite variables are
public build configuration: do not put credentials in them.

Production uses a compiled static
bundle and a separate lightweight server:

```sh
npm test
npm run build
npm run test:production
npm start
```

`npm run build` runs the lint gate, then writes the production bundle to `build`.
`npm run lint` rejects warnings; `npm run test:watch` starts interactive tests.
The HTTP smoke tests launch the real production start command on a temporary port
and verify direct routes, assets, HEAD, and startup failures.

`npm start` serves existing build files using `serve-handler` with React Router
fallback. It binds to `0.0.0.0:$PORT` (default 3000), rejects invalid/occupied ports,
and fails if `build/index.html` is absent. It never compiles or watches source.
The `asset-manifest.json` URL and main JS/CSS entries remain available.

## Existing Render service

- Service: `srv-chrqa464dadfn66u54eg`
- Root directory: `client`
- Build command: `npm ci --include=dev && npm run build`
- Start command: `npm start`
- Health check path: `/`
- Instance type: **Free**, 512 MB

Build dependencies must be included even when the environment sets
`NODE_ENV=production`. Compilation stays in the build phase, outside the web
service's limited runtime memory. The frontend calls the separately hosted
backend configured in `src/Context/appContext.jsx`.

The existing Vercel frontend is also connected to `main`. `vercel.json` selects
Vite, includes build dependencies, publishes `build`, and supports direct SPA
routes. Both existing Vercel projects use Node 22; the backend root is `server`.
