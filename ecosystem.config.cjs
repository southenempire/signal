module.exports = {
  apps: [
    {
      name: 'signal-agent',
      script: 'index.js',
      cwd: './apps/bot',
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
      script: 'npm',
      args: 'run dev', // Using dev for hackathon flexibility, or 'start' for production
      cwd: './apps/dashboard',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      restart_delay: 5000,
    }
  ]
};
