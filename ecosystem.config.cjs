// PM2 process config — committed, MUST NOT contain secrets.
// Runtime secrets (JWT_SECRET, ANTHROPIC_API_KEY, DATABASE_URL) live in the
// server-side .env file, loaded via node_args below. See specs/deploy.md §5.
//
// No `cwd`: PM2 resolves the relative `script`/`env_file` against this config
// file's directory, i.e. wherever the release is deployed (DEPLOY_PATH). That
// keeps the deploy path in one place (the CI secret) instead of hardcoded here.
module.exports = {
  apps: [
    {
      name: 'training-app',
      script: '.output/server/index.mjs', // Nitro node-server entry (listens on PORT)
      instances: 1, // 'max' for cluster mode once the app is verified stateless
      exec_mode: 'fork',
      env: { NODE_ENV: 'production', PORT: 3000 },
      // PM2 has no `env_file` option — load .env natively via Node (>=20.6).
      node_args: '--env-file=.env',
    },
  ],
}
