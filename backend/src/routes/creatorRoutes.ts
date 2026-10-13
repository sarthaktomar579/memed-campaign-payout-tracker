import { Router } from 'express';
import { getCreatorEarnings } from '../controllers/submissionController';
import { authenticate } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';

const router = Router();

// Creator: View their total earnings and submission breakdown
router.get('/earnings', authenticate, requireRole('creator'), getCreatorEarnings);

export default router;
