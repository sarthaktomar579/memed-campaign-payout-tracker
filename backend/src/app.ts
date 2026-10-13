import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import campaignRoutes from './routes/campaignRoutes';
import submissionRoutes from './routes/submissionRoutes';
import creatorRoutes from './routes/creatorRoutes';
import { errorHandler } from './middlewares/errorHandler';

dotenv.config();

const app: Application = express();

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

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
