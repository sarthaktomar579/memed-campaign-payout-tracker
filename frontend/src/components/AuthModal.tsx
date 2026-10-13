'use client';

import React, { useState } from 'react';
import { api, User } from '../lib/api';

interface AuthModalProps {
  onSuccess: (user: User) => void;
  onClose?: () => void;
}

export default function AuthModal({ onSuccess, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'brand' | 'creator'>('brand');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let res;
      if (isLogin) {
        res = await api.login({ email, password });
      } else {
        res = await api.register({ name, email, password, role });
      }

      localStorage.setItem('memed_token', res.token);
      localStorage.setItem('memed_user', JSON.stringify(res.user));
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoRole: 'brand' | 'creator') => {
    setError(null);
    setLoading(true);
    const demoEmail = demoRole === 'brand' ? 'brand.demo@memed.com' : 'creator.demo@memed.com';
    const demoPassword = 'password123';
    const demoName = demoRole === 'brand' ? 'Nike Brand Demo' : 'Tanmay Bhat Meme Fan';

    try {
      // Attempt login first
      let res;
      try {
        res = await api.login({ email: demoEmail, password: demoPassword });
      } catch {
        // If not created yet, register it automatically
        res = await api.register({
          name: demoName,
          email: demoEmail,
          password: demoPassword,
          role: demoRole
        });
      }

      localStorage.setItem('memed_token', res.token);
      localStorage.setItem('memed_user', JSON.stringify(res.user));
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 text-white shadow-2xl relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl font-bold"
          >
            ✕
          </button>
        )}

        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-2 mb-2">
            <span className="text-2xl">🔥</span>
            <span className="text-xl font-black bg-gradient-to-r from-pink-500 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Meme'd
            </span>
          </div>
          <h2 className="text-lg font-bold text-white">
            {isLogin ? 'Sign In to Portal' : 'Create New Account'}
          </h2>
          <p className="text-xs text-slate-400">
            {isLogin
              ? 'Enter your credentials to access your dashboard'
              : 'Choose your role to get started on Meme’d'}
          </p>
        </div>

        {/* 1-Click Demo Buttons for Reviewers */}
        <div className="mb-5 bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
          <p className="text-[11px] font-semibold text-slate-300 text-center mb-2">
            ⚡ Quick 1-Click Evaluator Login:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('brand')}
              disabled={loading}
              className="py-1.5 px-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 rounded-lg text-xs font-semibold transition"
            >
              🏢 Brand Demo
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('creator')}
              disabled={loading}
              className="py-1.5 px-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 rounded-lg text-xs font-semibold transition"
            >
              🎨 Creator Demo
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-900/40 border border-red-800 rounded-lg text-xs text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Sarthak Tomar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Role</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('brand')}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    role === 'brand'
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  🏢 Brand
                </button>
                <button
                  type="button"
                  onClick={() => setRole('creator')}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    role === 'creator'
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  🎨 Creator
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-sm transition mt-2 disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
