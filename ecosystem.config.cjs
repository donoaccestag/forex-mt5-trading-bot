module.exports = {
  apps: [
    {
      name: 'forex-bot',
      script: 'dist/index.js',
      cwd: process.cwd(),
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      log_file: './logs/pm2.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      time: true,
    },
  ],
};
