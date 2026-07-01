// PM2 process config — committed, MUST NOT contain secrets.
// Runtime secrets (JWT_SECRET, ANTHROPIC_API_KEY, DATABASE_URL) live in the
// server-side .env file, loaded via env_file below. See specs/deploy.md §5.
module.exports = {
  apps: [
    {
      name: 'training-app',
      script: 'dist/server/server.js',
      cwd: '/var/www/training-app',
      instances: 1, // 'max' for cluster mode once the app is verified stateless
      exec_mode: 'fork',
      env: { NODE_ENV: 'production', PORT: 3000 },
      env_file: '.env', // runtime secrets from the server-side .env
    },
  ],
}
