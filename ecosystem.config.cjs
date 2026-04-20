module.exports = {
  apps: [
    {
      name: 'signal-agent',
      script: 'index.js',
      cwd: './apps/bot',
      interpreter: '/opt/homebrew/bin/node',
      watch: true,
      env: {
        NODE_ENV: 'production',
      },
      // Autonomous restart if memory leaks or crashes occur
      max_memory_restart: '300M',
      restart_delay: 5000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'signal-console',
      script: './node_modules/.bin/next',
      args: 'dev -p 3100',
      cwd: './apps/dashboard',
      interpreter: '/opt/homebrew/bin/node',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3100
      },
      restart_delay: 5000,
    }
  ]
};
