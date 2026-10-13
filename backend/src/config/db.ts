import mongoose from 'mongoose';

export const connectDB = async (mongoUri?: string): Promise<void> => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  const uri = mongoUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/memed';
  try {
    const conn = await mongoose.connect(uri);
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}`);
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
      process.exit(1);
    }
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected successfully');
  } catch (error) {
    console.error('[MongoDB] Disconnect error:', error);
  }
};
