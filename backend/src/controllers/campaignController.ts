import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { Campaign, IMilestone } from '../models/Campaign';
import { getCache, setCache, invalidateCache } from '../config/redis';

export const createCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, platform, totalBudget, milestones } = req.body;
    const brandId = req.user?._id;

    if (!name || !platform || totalBudget === undefined || !milestones) {
      res.status(400).json({
        success: false,
        message: 'name, platform, totalBudget, and milestones are required.'
      });
      return;
    }

    if (!['Instagram', 'YouTube'].includes(platform)) {
      res.status(400).json({
        success: false,
        message: 'Platform must be either "Instagram" or "YouTube".'
      });
      return;
    }

    if (typeof totalBudget !== 'number' || totalBudget <= 0) {
      res.status(400).json({
        success: false,
        message: 'totalBudget must be a positive number.'
      });
      return;
    }

    if (!Array.isArray(milestones) || milestones.length === 0) {
      res.status(400).json({
        success: false,
        message: 'milestones must be a non-empty array of { viewsThreshold, payout }.'
      });
      return;
    }

    // Validate milestone entries
    for (const m of milestones) {
      if (typeof m.viewsThreshold !== 'number' || m.viewsThreshold <= 0 || typeof m.payout !== 'number' || m.payout < 0) {
        res.status(400).json({
          success: false,
          message: 'Each milestone must have a positive viewsThreshold and non-negative payout.'
        });
        return;
      }
    }

    // Sort milestones ascending by viewsThreshold
    const sortedMilestones: IMilestone[] = [...milestones].sort(
      (a, b) => a.viewsThreshold - b.viewsThreshold
    );

    const campaign = await Campaign.create({
      brandId,
      name,
      platform,
      totalBudget,
      spentBudget: 0,
      remainingBudget: totalBudget,
      milestones: sortedMilestones,
      status: 'active'
    });

    // Invalidate live campaigns cache (Bonus 5.a)
    await invalidateCache('campaigns:live*');

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      campaign
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBrandCampaigns = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const brandId = req.user?._id;
    const campaigns = await Campaign.find({ brandId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: campaigns.length,
      campaigns
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLiveCampaigns = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cacheKey = 'campaigns:live';
    const cached = await getCache(cacheKey);

    if (cached) {
      res.json({
        success: true,
        source: 'redis_cache',
        campaigns: JSON.parse(cached)
      });
      return;
    }

    // Live campaigns have remainingBudget > 0 and status 'active'
    const campaigns = await Campaign.find({
      status: 'active',
      remainingBudget: { $gt: 0 }
    })
      .populate('brandId', 'name email')
      .sort({ createdAt: -1 });

    // Cache for 60 seconds (Bonus 5.a)
    await setCache(cacheKey, JSON.stringify(campaigns), 60);

    res.json({
      success: true,
      source: 'database',
      count: campaigns.length,
      campaigns
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
