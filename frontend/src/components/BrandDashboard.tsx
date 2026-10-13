'use client';

import React, { useState, useEffect } from 'react';
import { api, Campaign, Milestone } from '../lib/api';

const DEFAULT_MILESTONES: Milestone[] = [
  { viewsThreshold: 10000, payout: 500 },
  { viewsThreshold: 50000, payout: 2000 },
  { viewsThreshold: 100000, payout: 5000 }
];

export default function BrandDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<'Instagram' | 'YouTube'>('Instagram');
  const [totalBudget, setTotalBudget] = useState<number>(20000);
  const [milestones, setMilestones] = useState<Milestone[]>(DEFAULT_MILESTONES);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await api.getBrandCampaigns();
      setCampaigns(res.campaigns);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleAddMilestone = () => {
    const lastThreshold = milestones.length > 0 ? milestones[milestones.length - 1].viewsThreshold : 0;
    const lastPayout = milestones.length > 0 ? milestones[milestones.length - 1].payout : 0;
    setMilestones([
      ...milestones,
      { viewsThreshold: lastThreshold + 50000, payout: lastPayout + 2000 }
    ]);
  };

  const handleRemoveMilestone = (index: number) => {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleMilestoneChange = (index: number, field: keyof Milestone, value: number) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Campaign name is required');
      return;
    }
    if (totalBudget <= 0) {
      setError('Total budget must be greater than 0');
      return;
    }
    if (milestones.length === 0) {
      setError('At least one milestone is required');
      return;
    }

    try {
      setCreating(true);
      await api.createCampaign({
        name,
        platform,
        totalBudget,
        milestones
      });
      setShowCreateModal(false);
      setName('');
      setTotalBudget(20000);
      setMilestones(DEFAULT_MILESTONES);
      await fetchCampaigns();
    } catch (err: any) {
      setError(err.message || 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const totalSpentAcrossAll = campaigns.reduce((sum, c) => sum + (c.spentBudget || 0), 0);
  const totalBudgetAcrossAll = campaigns.reduce((sum, c) => sum + (c.totalBudget || 0), 0);
  const totalRemainingAcrossAll = campaigns.reduce((sum, c) => sum + (c.remainingBudget || 0), 0);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Total Campaigns</p>
          <p className="text-2xl font-bold text-white mt-1">{campaigns.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Total Budget Allocated</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">₹{totalBudgetAcrossAll.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Total Budget Spent</p>
          <p className="text-2xl font-bold text-rose-400 mt-1">₹{totalSpentAcrossAll.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Remaining Budget</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">₹{totalRemainingAcrossAll.toLocaleString()}</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl">
        <div>
          <h2 className="text-lg font-bold text-white">Brand Campaign Manager</h2>
          <p className="text-xs text-slate-400">Monitor budget utilization and configure milestone ladder payouts.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center space-x-1.5"
        >
          <span>+</span>
          <span>Create Campaign</span>
        </button>
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800/60 rounded-2xl">
          <p className="text-slate-400 text-sm">No campaigns created yet.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-3 text-xs text-indigo-400 hover:underline"
          >
            Create your first campaign &rarr;
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {campaigns.map((camp) => {
            const spentPercent = camp.totalBudget > 0 ? Math.min(100, (camp.spentBudget / camp.totalBudget) * 100) : 0;
            return (
              <div
                key={camp._id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        camp.platform === 'Instagram'
                          ? 'bg-pink-950/70 text-pink-300 border border-pink-800/60'
                          : 'bg-red-950/70 text-red-300 border border-red-800/60'
                      }`}
                    >
                      {camp.platform}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        camp.remainingBudget <= 0 || camp.status === 'budget_exhausted'
                          ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                          : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                      }`}
                    >
                      {camp.remainingBudget <= 0 ? 'Exhausted' : 'Active'}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-base truncate mb-3">{camp.name}</h3>

                  {/* Budget Progress Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Spent: <strong className="text-rose-400">₹{camp.spentBudget.toLocaleString()}</strong></span>
                      <span>Left: <strong className="text-emerald-400">₹{camp.remainingBudget.toLocaleString()}</strong></span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-rose-500 to-amber-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${spentPercent}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-right text-slate-400">
                      Total: ₹{camp.totalBudget.toLocaleString()} ({spentPercent.toFixed(1)}% utilized)
                    </p>
                  </div>

                  {/* Milestones preview */}
                  <div className="border-t border-slate-800/80 pt-3">
                    <p className="text-[11px] font-semibold text-slate-400 mb-1.5">Milestone Ladder:</p>
                    <div className="space-y-1">
                      {camp.milestones.map((m, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-xs bg-slate-800/40 px-2 py-1 rounded"
                        >
                          <span className="text-slate-300 font-mono">{(m.viewsThreshold / 1000).toFixed(0)}K views</span>
                          <span className="text-emerald-400 font-semibold">₹{m.payout.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 pt-4 mt-3 border-t border-slate-800/60">
                  Created {new Date(camp.createdAt).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl font-bold"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold mb-1">Create Brand Campaign</h2>
            <p className="text-xs text-slate-400 mb-4">Set up a campaign with platform, budget cap, and milestone ladders.</p>

            {error && (
              <div className="p-3 mb-4 bg-red-900/40 border border-red-800 rounded-lg text-xs text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Campaign Name</label>
                <input
                  type="text"
                  placeholder="e.g. Diwal Meme Blitz 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="YouTube">YouTube</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Total Budget (₹)</label>
                  <input
                    type="number"
                    min={1}
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Milestone Ladder Editor */}
              <div className="border border-slate-800 rounded-xl p-3 bg-slate-800/30">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Milestone Ladder (Threshold & Payout)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    + Add Milestone
                  </button>
                </div>

                <div className="space-y-2">
                  {milestones.map((m, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-xs">
                      <div className="flex-1">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Views Threshold</span>
                        <input
                          type="number"
                          min={1}
                          value={m.viewsThreshold}
                          onChange={(e) => handleMilestoneChange(idx, 'viewsThreshold', Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Payout (₹)</span>
                        <input
                          type="number"
                          min={0}
                          value={m.payout}
                          onChange={(e) => handleMilestoneChange(idx, 'payout', Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-emerald-400 font-mono font-semibold"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMilestone(idx)}
                        disabled={milestones.length <= 1}
                        className="text-slate-500 hover:text-rose-400 disabled:opacity-30 pt-3 text-sm px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition"
                >
                  {creating ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
