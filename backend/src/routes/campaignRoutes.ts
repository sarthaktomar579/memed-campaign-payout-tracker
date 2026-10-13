import { Router } from 'express';
import {
  createCampaign,
  getBrandCampaigns,
  getLiveCampaigns
} from '../controllers/campaignController';
import { authenticate } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';

const router = Router();

// Creator / Public: browse live campaigns
router.get('/live', getLiveCampaigns);

// Brand: create campaign
router.post('/', authenticate, requireRole('brand'), createCampaign);

// Brand: get their campaigns (spent vs remaining)
router.get('/my', authenticate, requireRole('brand'), getBrandCampaigns);

export default router;
