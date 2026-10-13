import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import campaignRoutes from './routes/campaignRoutes';
import submissionRoutes from './routes/submissionRoutes';
import creatorRoutes from './routes/creatorRoutes';
import { errorHandler } from './middlewares/errorHandler';
import { connectDB } from './config/db';

dotenv.config();

const app: Application = express();

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Auto-connect database for serverless requests
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// Root Route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: "Meme'd Campaign Payout Tracker API",
    status: 'online',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      campaigns: '/api/campaigns',
      submissions: '/api/submissions',
      creators: '/api/creators'
    }
  });
});

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: "Meme'd Payout Tracker API",
    timestamp: new Date().toISOString()
  });
});

// Route registration
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/creators', creatorRoutes);

// Error Handling
app.use(errorHandler);

export default app;
