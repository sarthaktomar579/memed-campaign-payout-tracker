import app from './app';
import { connectDB } from './config/db';
import { initRedis } from './config/redis';

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  await connectDB();
  initRedis();

  app.listen(PORT, () => {
    console.log(`🚀 Meme'd Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
