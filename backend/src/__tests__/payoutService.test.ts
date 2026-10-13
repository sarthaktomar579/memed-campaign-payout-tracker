import { calculatePayout, detectViewSpike } from '../services/payoutService';
import { IMilestone } from '../models/Campaign';

describe('Payout Calculation & Budget Cap Engine', () => {
  // Standard test milestone ladder from Meme'd assignment:
  // 10K views -> ₹500, 50K views -> ₹2,000, 100K views -> ₹5,000
  const sampleMilestones: IMilestone[] = [
    { viewsThreshold: 10000, payout: 500 },
    { viewsThreshold: 50000, payout: 2000 },
    { viewsThreshold: 100000, payout: 5000 }
  ];

  describe('Single Milestone Progression', () => {
    it('should award 0 payout when views are below the first milestone', () => {
      const result = calculatePayout(8500, sampleMilestones, 0, 10000);

      expect(result.highestMilestone).toBeNull();
      expect(result.targetPayout).toBe(0);
      expect(result.deltaPayout).toBe(0);
      expect(result.cappedDueToBudget).toBe(false);
      expect(result.newTotalPayout).toBe(0);
    });

    it('should award first milestone payout (₹500) when crossing 10,000 views', () => {
      const result = calculatePayout(12000, sampleMilestones, 0, 10000);

      expect(result.highestMilestone).toEqual({ viewsThreshold: 10000, payout: 500 });
      expect(result.targetPayout).toBe(500);
      expect(result.deltaPayout).toBe(500);
      expect(result.cappedDueToBudget).toBe(false);
      expect(result.newTotalPayout).toBe(500);
    });
  });

  describe('Multi-Milestone Leap in a Single Update', () => {
    it('should award highest milestone payout (₹5,000) when jumping directly from 0 to 120,000 views', () => {
      const result = calculatePayout(120000, sampleMilestones, 0, 50000);

      expect(result.highestMilestone).toEqual({ viewsThreshold: 100000, payout: 5000 });
      expect(result.targetPayout).toBe(5000);
      expect(result.deltaPayout).toBe(5000);
      expect(result.newTotalPayout).toBe(5000);
    });
  });

  describe('Incremental Payout Deltas & Idempotency', () => {
    it('should deduct only the incremental delta when progressing from Milestone 1 to Milestone 2', () => {
      // Previously earned ₹500 at 10k views; now at 55k views (Milestone 2 is ₹2,000)
      const currentPayout = 500;
      const remainingBudget = 10000;

      const result = calculatePayout(55000, sampleMilestones, currentPayout, remainingBudget);

      expect(result.highestMilestone).toEqual({ viewsThreshold: 50000, payout: 2000 });
      expect(result.targetPayout).toBe(2000);
      expect(result.deltaPayout).toBe(1500); // 2000 - 500
      expect(result.newTotalPayout).toBe(2000);
    });

    it('should return 0 delta payout on repeated identical view updates (never double-pay)', () => {
      const currentPayout = 2000;
      const remainingBudget = 8000;

      const result = calculatePayout(55000, sampleMilestones, currentPayout, remainingBudget);

      expect(result.deltaPayout).toBe(0);
      expect(result.newTotalPayout).toBe(2000);
      expect(result.cappedDueToBudget).toBe(false);
    });

    it('should return 0 delta payout if views increase slightly without reaching the next milestone', () => {
      // Currently at ₹2,000 (50k milestone), views reach 75k (not yet 100k)
      const currentPayout = 2000;
      const remainingBudget = 8000;

      const result = calculatePayout(75000, sampleMilestones, currentPayout, remainingBudget);

      expect(result.highestMilestone?.viewsThreshold).toBe(50000);
      expect(result.deltaPayout).toBe(0);
      expect(result.newTotalPayout).toBe(2000);
    });
  });

  describe('Campaign Budget Cap Enforcement', () => {
    it('should award ₹0 delta if campaign budget is completely exhausted (remainingBudget = 0)', () => {
      const currentPayout = 500;
      const remainingBudget = 0;

      const result = calculatePayout(60000, sampleMilestones, currentPayout, remainingBudget);

      expect(result.deltaPayout).toBe(0);
      expect(result.cappedDueToBudget).toBe(true);
      expect(result.newTotalPayout).toBe(500);
    });

    it('should cap payout to exact remaining budget when budget runs out mid-payout', () => {
      // Creator qualifies for ₹2,000 milestone (delta = ₹1,500 over existing ₹500), but only ₹800 remains
      const currentPayout = 500;
      const remainingBudget = 800;

      const result = calculatePayout(55000, sampleMilestones, currentPayout, remainingBudget);

      expect(result.highestMilestone).toEqual({ viewsThreshold: 50000, payout: 2000 });
      expect(result.targetPayout).toBe(2000);
      expect(result.deltaPayout).toBe(800); // Capped to remaining budget
      expect(result.cappedDueToBudget).toBe(true);
      expect(result.newTotalPayout).toBe(1300); // 500 + 800
    });

    it('should handle unsorted milestone inputs gracefully', () => {
      const unsortedMilestones: IMilestone[] = [
        { viewsThreshold: 100000, payout: 5000 },
        { viewsThreshold: 10000, payout: 500 },
        { viewsThreshold: 50000, payout: 2000 }
      ];

      const result = calculatePayout(55000, unsortedMilestones, 0, 10000);
      expect(result.highestMilestone).toEqual({ viewsThreshold: 50000, payout: 2000 });
      expect(result.deltaPayout).toBe(2000);
    });
  });

  describe('View Spike Anomaly Detection (Bonus 5.b)', () => {
    it('should flag an abnormal surge of views exceeding the velocity threshold', () => {
      const spike = detectViewSpike(10000, 150000, 100000);
      expect(spike.isSpike).toBe(true);
      expect(spike.reason).toContain('Suspicious view spike detected: +140,000 views');
    });

    it('should not flag organic normal view progression', () => {
      const normal = detectViewSpike(10000, 25000, 100000);
      expect(normal.isSpike).toBe(false);
      expect(normal.reason).toBeUndefined();
    });
  });
});
