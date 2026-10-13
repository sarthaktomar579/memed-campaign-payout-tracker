'use client';

import React, { useState, useEffect } from 'react';
import { api, Campaign, Submission } from '../lib/api';
import ViewSimulatorModal from './ViewSimulatorModal';

export default function CreatorDashboard() {
  const [activeTab, setActiveTab] = useState<'browse' | 'submissions'>('browse');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [earningsSummary, setEarningsSummary] = useState({
    totalEarnings: 0,
    totalViews: 0,
    submissionsCount: 0
  });
  const [loading, setLoading] = useState(true);

  // Submit modal state
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [postLink, setPostLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // View simulator state
  const [simulatorTarget, setSimulatorTarget] = useState<Submission | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [campRes, earnRes] = await Promise.all([
        api.getLiveCampaigns(),
        api.getCreatorEarnings()
      ]);
      setCampaigns(campRes.campaigns);
      setSubmissions(earnRes.submissions);
      setEarningsSummary(earnRes.summary);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign || !postLink.trim()) return;

    try {
      setSubmitting(true);
      setSubmitError(null);
      await api.submitPost({
        campaignId: selectedCampaign._id,
        postLink: postLink.trim()
      });
      setSelectedCampaign(null);
      setPostLink('');
      await loadData();
      setActiveTab('submissions');
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Earnings Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-800/40 rounded-2xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider font-semibold text-emerald-400">Total Lifetime Earnings</p>
          <p className="text-3xl font-extrabold text-emerald-300 mt-1">₹{earningsSummary.totalEarnings.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Total Tracked Views</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{earningsSummary.totalViews.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Posts Submitted</p>
          <p className="text-2xl font-bold text-white mt-1">{earningsSummary.submissionsCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'browse'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          Browse Live Campaigns ({campaigns.length})
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'submissions'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          My Submissions & Payouts ({submissions.length})
        </button>
      </div>

      {/* Tab: Browse Live Campaigns */}
      {activeTab === 'browse' && (
        <div>
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Loading live campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 border border-slate-800/60 rounded-2xl">
              <p className="text-slate-400 text-sm">No live campaigns available right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {campaigns.map((camp) => (
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
                      <span className="text-[11px] font-semibold text-emerald-400">
                        Remaining: ₹{camp.remainingBudget.toLocaleString()}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-base truncate mb-3">{camp.name}</h3>

                    {/* Milestone Ladder */}
                    <div className="border border-slate-800/80 rounded-xl p-3 bg-slate-800/30 mb-4">
                      <p className="text-[11px] font-semibold text-slate-400 mb-1.5">Payout Ladder:</p>
                      <div className="space-y-1">
                        {camp.milestones.map((m, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center text-xs bg-slate-800/50 px-2 py-1 rounded"
                          >
                            <span className="text-slate-300 font-mono">{(m.viewsThreshold / 1000).toFixed(0)}K views</span>
                            <span className="text-emerald-400 font-bold">₹{m.payout.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedCampaign(camp);
                      setSubmitError(null);
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 rounded-xl transition shadow-md shadow-indigo-600/20"
                  >
                    Submit Post Link
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Submissions & Payouts */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 border border-slate-800/60 rounded-2xl">
              <p className="text-slate-400 text-sm">You have not submitted any posts yet.</p>
              <button
                onClick={() => setActiveTab('browse')}
                className="mt-3 text-xs text-indigo-400 hover:underline"
              >
                Browse live campaigns &rarr;
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => {
                const campName = typeof sub.campaignId === 'object' ? sub.campaignId.name : 'Campaign';
                const campPlatform = typeof sub.campaignId === 'object' ? sub.campaignId.platform : 'Platform';

                return (
                  <div
                    key={sub._id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {campPlatform}
                        </span>
                        <span className="text-sm font-bold text-white truncate">{campName}</span>
                        {sub.isFlagged && (
                          <span className="text-[10px] font-semibold bg-red-950/80 text-red-300 border border-red-800 px-2 py-0.5 rounded-full flex items-center space-x-1">
                            <span>⚠️ Flagged:</span>
                            <span className="truncate max-w-[150px]">{sub.flagReason || 'Spike'}</span>
                          </span>
                        )}
                      </div>

                      <div className="text-xs">
                        <a
                          href={sub.postLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:underline truncate block font-mono"
                        >
                          {sub.postLink}
                        </a>
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-slate-400 pt-1">
                        <span>
                          Views: <strong className="text-white font-mono">{sub.currentViews.toLocaleString()}</strong>
                        </span>
                        <span>
                          Highest Milestone: <strong className="text-indigo-400 font-mono">
                            {sub.highestMilestoneReached ? `${(sub.highestMilestoneReached.viewsThreshold / 1000).toFixed(0)}K views` : 'None yet'}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Payout & Actions */}
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-semibold text-slate-400">Total Payout</p>
                        <p className="text-xl font-extrabold text-emerald-400">₹{sub.currentPayout.toLocaleString()}</p>
                      </div>

                      <button
                        onClick={() => setSimulatorTarget(sub)}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 hover:text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center space-x-1"
                        title="Simulate views update endpoint"
                      >
                        <span>⚡</span>
                        <span>Simulate Views</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Submit Post Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setSelectedCampaign(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl font-bold"
            >
              ✕
            </button>

            <h2 className="text-lg font-bold mb-1">Submit Post Link</h2>
            <p className="text-xs text-slate-400 mb-4">
              Submitting for <span className="text-white font-semibold">{selectedCampaign.name}</span> ({selectedCampaign.platform})
            </p>

            {submitError && (
              <div className="p-3 mb-4 bg-red-900/40 border border-red-800 rounded-lg text-xs text-red-200">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmitPost} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Public Post URL (Instagram / YouTube)
                </label>
                <input
                  type="url"
                  placeholder="https://www.instagram.com/reel/C8XYZ123/"
                  value={postLink}
                  onChange={(e) => setPostLink(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCampaign(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition"
                >
                  {submitting ? 'Submitting...' : 'Submit Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulator Modal */}
      {simulatorTarget && (
        <ViewSimulatorModal
          submission={simulatorTarget}
          onClose={() => setSimulatorTarget(null)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}
