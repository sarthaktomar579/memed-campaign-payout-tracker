'use client';

import React, { useState } from 'react';
import { api, Submission } from '../lib/api';

interface ViewSimulatorModalProps {
  submission: Submission;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ViewSimulatorModal({
  submission,
  onClose,
  onSuccess
}: ViewSimulatorModalProps) {
  const [views, setViews] = useState<number>(submission.currentViews || 0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (targetViews: number) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.updateViews(submission._id, targetViews);
      setResult(res);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to update views');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl font-bold"
        >
          ✕
        </button>

        <div className="flex items-center space-x-2 mb-2">
          <span className="text-2xl">⚡</span>
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Simulate Post Views & Payout
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Calls <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300">PATCH /api/submissions/:id/views</code> to simulate external social metrics.
        </p>

        <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 mb-4 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Post Link:</span>
            <span className="font-mono text-blue-300 truncate max-w-[280px]">{submission.postLink}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Current Views:</span>
            <span className="font-semibold text-white">{submission.currentViews.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Current Payout:</span>
            <span className="font-semibold text-emerald-400">₹{submission.currentPayout.toLocaleString()}</span>
          </div>
        </div>

        {/* Quick Increment Buttons */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Quick Simulation Presets:
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => {
                const v = submission.currentViews + 10000;
                setViews(v);
                handleUpdate(v);
              }}
              disabled={loading}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 text-left transition"
            >
              +10k Views (Tier 1)
            </button>
            <button
              onClick={() => {
                const v = submission.currentViews + 50000;
                setViews(v);
                handleUpdate(v);
              }}
              disabled={loading}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 text-left transition"
            >
              +50k Views (Tier 2)
            </button>
            <button
              onClick={() => {
                const v = submission.currentViews + 100000;
                setViews(v);
                handleUpdate(v);
              }}
              disabled={loading}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 text-left transition"
            >
              +100k Views (Tier 3)
            </button>
            <button
              onClick={() => {
                const v = submission.currentViews + 150000;
                setViews(v);
                handleUpdate(v);
              }}
              disabled={loading}
              className="py-2 px-3 bg-red-950/60 hover:bg-red-900/60 border border-red-700/60 rounded-lg text-red-200 text-left transition flex items-center justify-between"
            >
              <span>Trigger Spike (+150k)</span>
              <span className="text-xs">⚠️</span>
            </button>
          </div>
        </div>

        {/* Custom Input */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Or Set Custom View Total:
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              min={0}
              value={views}
              onChange={(e) => setViews(Number(e.target.value))}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
            <button
              onClick={() => handleUpdate(views)}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
            >
              {loading ? 'Updating...' : 'Update Views'}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 mb-3 bg-red-900/40 border border-red-800 rounded-lg text-xs text-red-200">
            {error}
          </div>
        )}

        {/* Result Feedback Banner */}
        {result && (
          <div className="p-3 bg-emerald-950/50 border border-emerald-700/60 rounded-xl text-xs space-y-1.5 animate-in fade-in">
            <div className="font-semibold text-emerald-300 flex items-center space-x-1.5">
              <span>✓</span>
              <span>{result.message}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-slate-300">
              <div>
                Delta Paid: <span className="text-emerald-400 font-bold">₹{result.payoutDetails?.deltaPaid}</span>
              </div>
              <div>
                Total Payout: <span className="text-white font-bold">₹{result.submission?.currentPayout}</span>
              </div>
              <div>
                Remaining Budget: <span className="text-amber-300 font-bold">₹{result.campaignBudget?.remainingBudget}</span>
              </div>
              <div>
                Budget Capped: <span className={result.payoutDetails?.cappedDueToBudget ? "text-red-400 font-bold" : "text-slate-400"}>
                  {result.payoutDetails?.cappedDueToBudget ? 'YES (Capped)' : 'NO'}
                </span>
              </div>
            </div>
            {result.submission?.isFlagged && (
              <div className="mt-2 text-amber-300 bg-amber-950/60 border border-amber-800/80 p-2 rounded text-[11px]">
                ⚠️ <strong>Anomaly Flag:</strong> {result.submission?.flagReason}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
