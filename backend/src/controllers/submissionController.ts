import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { Submission } from '../models/Submission';
import { Campaign } from '../models/Campaign';
import { calculatePayout, detectViewSpike } from '../services/payoutService';
import { invalidateCache } from '../config/redis';

export const submitPost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { campaignId, postLink } = req.body;
    const creatorId = req.user?._id;

    if (!campaignId || !postLink) {
      res.status(400).json({
        success: false,
        message: 'campaignId and postLink are required.'
      });
      return;
    }

    // Verify campaign existence and budget status
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    if (campaign.remainingBudget <= 0 || campaign.status === 'budget_exhausted') {
      res.status(400).json({
        success: false,
        message: 'This campaign budget is already exhausted. No new submissions accepted.'
      });
      return;
    }

    // Check duplicate submission
    const existing = await Submission.findOne({ campaignId, postLink });
    if (existing) {
      res.status(409).json({
        success: false,
        message: 'This post link has already been submitted to this campaign.'
      });
      return;
    }

    const submission = await Submission.create({
      creatorId,
      campaignId,
      postLink,
      currentViews: 0,
      currentPayout: 0,
      viewHistory: [{ views: 0, timestamp: new Date(), payoutDelta: 0 }]
    });

    res.status(201).json({
      success: true,
      message: 'Post submitted successfully',
      submission
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCreatorEarnings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const creatorId = req.user?._id;

    const submissions = await Submission.find({ creatorId })
      .populate('campaignId', 'name platform totalBudget status')
      .sort({ createdAt: -1 });

    const totalEarnings = submissions.reduce((sum, s) => sum + (s.currentPayout || 0), 0);
    const totalViews = submissions.reduce((sum, s) => sum + (s.currentViews || 0), 0);

    res.json({
      success: true,
      summary: {
        totalEarnings,
        totalViews,
        submissionsCount: submissions.length
      },
      submissions
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/submissions/:id/views
 * Simulates platform view updates. No role check needed on this endpoint.
 * Protected against race condition double-spending via atomic condition locking.
 */
export const updateViewsAndPayout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { views } = req.body;

    if (views === undefined || typeof views !== 'number' || views < 0) {
      res.status(400).json({
        success: false,
        message: 'Valid non-negative views count is required.'
      });
      return;
    }

    const submission = await Submission.findById(id);
    if (!submission) {
      res.status(404).json({ success: false, message: 'Submission not found' });
      return;
    }

    const campaign = await Campaign.findById(submission.campaignId);
    if (!campaign) {
      res.status(404).json({ success: false, message: 'Associated campaign not found' });
      return;
    }

    // Check for unusual view velocity / spike anomaly (Bonus 5.b)
    const spikeCheck = detectViewSpike(submission.currentViews, views);
    if (spikeCheck.isSpike) {
      submission.isFlagged = true;
      submission.flagReason = spikeCheck.reason;
    }

    // Calculate payout through pure calculation engine
    const payoutResult = calculatePayout(
      views,
      campaign.milestones,
      submission.currentPayout,
      campaign.remainingBudget
    );

    let actualDelta = payoutResult.deltaPayout;

    // If there is a payout delta, atomically deduct from campaign budget (Stretch 6.a)
    if (actualDelta > 0) {
      // Atomic query condition: remainingBudget must be at least actualDelta
      let updatedCampaign = await Campaign.findOneAndUpdate(
        { _id: campaign._id, remainingBudget: { $gte: actualDelta } },
        {
          $inc: { spentBudget: actualDelta, remainingBudget: -actualDelta }
        },
        { new: true }
      );

      // Concurrency race fallback: if another simultaneous process claimed the budget first
      if (!updatedCampaign) {
        const freshCampaign = await Campaign.findById(campaign._id);
        const availableBudget = freshCampaign ? freshCampaign.remainingBudget : 0;

        if (availableBudget <= 0) {
          actualDelta = 0; // budget exhausted by competing thread
        } else {
          // Take whatever partial budget remains
          actualDelta = Math.min(actualDelta, availableBudget);
          updatedCampaign = await Campaign.findOneAndUpdate(
            { _id: campaign._id, remainingBudget: { $gte: actualDelta } },
            {
              $inc: { spentBudget: actualDelta, remainingBudget: -actualDelta }
            },
            { new: true }
          );
        }
      }

      // Check if campaign budget is now exhausted
      if (updatedCampaign && updatedCampaign.remainingBudget <= 0) {
        await Campaign.updateOne(
          { _id: campaign._id },
          { $set: { status: 'budget_exhausted', remainingBudget: 0 } }
        );
        await invalidateCache('campaigns:live*');
      }
    }

    // Update submission record
    submission.currentViews = views;
    submission.currentPayout += actualDelta;
    if (payoutResult.highestMilestone) {
      submission.highestMilestoneReached = payoutResult.highestMilestone;
    }

    submission.viewHistory.push({
      views,
      timestamp: new Date(),
      payoutDelta: actualDelta
    });

    await submission.save();

    // Fetch refreshed campaign for response metrics
    const latestCampaign = await Campaign.findById(campaign._id);

    res.json({
      success: true,
      message: actualDelta > 0
        ? `Views updated. Credited payout delta of ₹${actualDelta}.`
        : 'Views updated. No new payout milestone crossed.',
      submission: {
        id: submission._id,
        postLink: submission.postLink,
        currentViews: submission.currentViews,
        currentPayout: submission.currentPayout,
        highestMilestoneReached: submission.highestMilestoneReached,
        isFlagged: submission.isFlagged,
        flagReason: submission.flagReason
      },
      payoutDetails: {
        highestMilestoneCrossed: payoutResult.highestMilestone,
        deltaPaid: actualDelta,
        cappedDueToBudget: payoutResult.cappedDueToBudget || (latestCampaign?.remainingBudget === 0)
      },
      campaignBudget: {
        totalBudget: latestCampaign?.totalBudget,
        spentBudget: latestCampaign?.spentBudget,
        remainingBudget: latestCampaign?.remainingBudget,
        status: latestCampaign?.status
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
