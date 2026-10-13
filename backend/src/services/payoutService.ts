import { IMilestone } from '../models/Campaign';

export interface PayoutCalculationResult {
  highestMilestone: IMilestone | null;
  targetPayout: number;
  deltaPayout: number;
  cappedDueToBudget: boolean;
  newTotalPayout: number;
}

/**
 * Pure calculation function for milestone-based payout.
 * Highly testable with zero database side-effects.
 * 
 * @param newViews - Updated total view count of the post
 * @param milestones - Sorted list of campaign milestones (viewsThreshold, payout)
 * @param currentPayout - Amount already paid out to this submission
 * @param remainingBudget - Available budget left in the campaign
 */
export function calculatePayout(
  newViews: number,
  milestones: IMilestone[],
  currentPayout: number,
  remainingBudget: number
): PayoutCalculationResult {
  // Defensive: sort milestones ascending by viewsThreshold
  const sorted = [...milestones].sort((a, b) => a.viewsThreshold - b.viewsThreshold);

  // Find all milestones crossed
  const crossedMilestones = sorted.filter((m) => newViews >= m.viewsThreshold);

  if (crossedMilestones.length === 0) {
    return {
      highestMilestone: null,
      targetPayout: 0,
      deltaPayout: 0,
      cappedDueToBudget: false,
      newTotalPayout: currentPayout
    };
  }

  // Highest milestone crossed
  const highest = crossedMilestones[crossedMilestones.length - 1];
  const targetPayout = highest.payout;

  // If submission has already received this payout or higher (e.g. repeated update or lower view count), delta is 0
  if (targetPayout <= currentPayout) {
    return {
      highestMilestone: highest,
      targetPayout,
      deltaPayout: 0,
      cappedDueToBudget: false,
      newTotalPayout: currentPayout
    };
  }

  const desiredDelta = targetPayout - currentPayout;

  // Budget enforcement: campaign must never pay out more than remaining budget
  if (remainingBudget <= 0) {
    return {
      highestMilestone: highest,
      targetPayout,
      deltaPayout: 0,
      cappedDueToBudget: true,
      newTotalPayout: currentPayout
    };
  }

  if (desiredDelta <= remainingBudget) {
    return {
      highestMilestone: highest,
      targetPayout,
      deltaPayout: desiredDelta,
      cappedDueToBudget: false,
      newTotalPayout: currentPayout + desiredDelta
    };
  }

  // Budget is partially sufficient: pay out all remaining budget and cap
  return {
    highestMilestone: highest,
    targetPayout,
    deltaPayout: remainingBudget,
    cappedDueToBudget: true,
    newTotalPayout: currentPayout + remainingBudget
  };
}

/**
 * View spike anomaly detection (Bonus 5.b)
 * Flags suspicious sudden spikes in views
 */
export function detectViewSpike(
  previousViews: number,
  newViews: number,
  threshold = 100000
): { isSpike: boolean; reason?: string } {
  const jump = newViews - previousViews;
  if (jump > threshold) {
    return {
      isSpike: true,
      reason: `Suspicious view spike detected: +${jump.toLocaleString()} views in single update`
    };
  }
  return { isSpike: false };
}
