/**
 * PM2 konfiguratsiyasi:  pm2 start ecosystem.config.js
 * Diqqat: SQLite bitta jarayon bilan ishlaydi — instances: 1 (cluster rejimi kerak emas).
 */
module.exports = {
  apps: [
    {
      name: 'proteach',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '400M',
      env: { NODE_ENV: 'production' },
      time: true,
    },
  ],
};
