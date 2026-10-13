import { Router } from 'express';
import {
  submitPost,
  updateViewsAndPayout
} from '../controllers/submissionController';
import { authenticate } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';

const router = Router();

// Creator: submit a post link to a campaign
router.post('/', authenticate, requireRole('creator'), submitPost);

// Simulation / Webhook: update views (no auth / role check required per specification)
router.patch('/:id/views', updateViewsAndPayout);

export default router;
