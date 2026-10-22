# HackOverflow API

Use Node.js 22 and run commands from this directory:

```sh
npm ci
npm test
npm run test:integration
```

The full integration gate starts a disposable MongoDB 7 replica set through Docker,
selects a loopback port, uses a database named `hackoverflow_test_*`, and removes
the container afterward. It runs authorization, stored-data, request/response,
friendship, vote concurrency, rollback, and password regressions without touching
production data or external provider accounts. `npm test` runs unit/HTTP fixtures
and skips the database suite unless `MONGODB_TEST_URI` is provided; use the full
integration command for release validation.

## Run

```sh
npm run dev
npm start
```

Development uses Node's built-in watch mode. Production runs `node index.js`,
connects to the database before listening, and exits unsuccessfully if startup
fails. `PORT` takes precedence over `APP_PORT`, with default 8082. Bind host is
`0.0.0.0`. Importing `index.js` exports the Express handler for Vercel without
opening another listener.

Configuration:

- `SECRET`: required JWT signing key; preserve the existing value when deploying
  to retain current users' signed sessions.
- `MONGODB_URI`: optional full connection URI, including database name.
- Otherwise `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` configure the existing
  MongoDB connection. Credentials are encoded before constructing its URI.
- `CODECHEF_CLIENT_ID` and `CODECHEF_CLIENT_SECRET`: existing provider credentials
  when required by the CodeChef API.

Store credentials outside Git. A database credential formerly appeared in a code
comment; removing the comment does not revoke it or remove it from Git history.
The credential owner must rotate/revoke it and update the deployed configuration.

## Transaction and legacy-data requirements

Friendship and vote changes require MongoDB replica-set transactions, including
Atlas replica sets. A standalone MongoDB returns a controlled 503 for these
operations. Transactions serialize conflicting user pairs and roll back partial
writes. Existing collections, IDs, statuses, stored tokens, and successful API
response shapes remain compatible.

Duplicate, inconsistent, or partially referenced legacy social records return
409 with a reconciliation message. No records are automatically deleted, merged,
or re-scored. Review and reconcile affected live records with their owner before
retrying; automated repair would need a separate, reviewed data migration.

Provider failures have bounded time/response sizes and controlled 502/503/504
responses. External provider availability and deployed database permissions must
be checked separately from local fixture tests.
