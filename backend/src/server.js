import app from './app.js';
import { config } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';

const startServer = async () => {
  try {
    // Connect databases
    await connectDatabase();
    await connectRedis();
    
    // Start HTTP server
    app.listen(config.PORT, config.HOST, () => {
      console.log(`\n✓ ${config.APP_NAME} API v${config.APP_VERSION} running`);
      console.log(`✓ Environment: ${config.NODE_ENV}`);
      console.log(`✓ Server: http://${config.HOST}:${config.PORT}`);
      console.log(`✓ Endpoints: http://localhost:${config.PORT}/health\n`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n✓ Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n✓ Shutting down gracefully...');
  process.exit(0);
});

startServer();
