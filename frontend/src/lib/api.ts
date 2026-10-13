const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface Milestone {
  viewsThreshold: number;
  payout: number;
}

export interface Campaign {
  _id: string;
  brandId: { _id: string; name: string; email: string } | string;
  name: string;
  platform: 'Instagram' | 'YouTube';
  totalBudget: number;
  spentBudget: number;
  remainingBudget: number;
  milestones: Milestone[];
  status: 'active' | 'budget_exhausted' | 'completed';
  createdAt: string;
}

export interface Submission {
  _id: string;
  creatorId: string;
  campaignId: Campaign | string;
  postLink: string;
  currentViews: number;
  currentPayout: number;
  highestMilestoneReached?: Milestone;
  isFlagged: boolean;
  flagReason?: string;
  viewHistory: { views: number; timestamp: string; payoutDelta: number }[];
  status: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'brand' | 'creator';
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('memed_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }

  return data;
}

export const api = {
  // Auth
  register: (payload: { name: string; email: string; password: string; role: 'brand' | 'creator' }) =>
    apiRequest<{ success: boolean; token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  login: (payload: { email: string; password: string }) =>
    apiRequest<{ success: boolean; token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getMe: () =>
    apiRequest<{ success: boolean; user: User }>('/auth/me'),

  // Campaigns
  getLiveCampaigns: () =>
    apiRequest<{ success: boolean; campaigns: Campaign[]; source?: string }>('/campaigns/live'),

  getBrandCampaigns: () =>
    apiRequest<{ success: boolean; campaigns: Campaign[] }>('/campaigns/my'),

  createCampaign: (payload: {
    name: string;
    platform: 'Instagram' | 'YouTube';
    totalBudget: number;
    milestones: Milestone[];
  }) =>
    apiRequest<{ success: boolean; campaign: Campaign }>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Submissions
  submitPost: (payload: { campaignId: string; postLink: string }) =>
    apiRequest<{ success: boolean; submission: Submission }>('/submissions', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getCreatorEarnings: () =>
    apiRequest<{
      success: boolean;
      summary: { totalEarnings: number; totalViews: number; submissionsCount: number };
      submissions: Submission[];
    }>('/creators/earnings'),

  // Simulation: Update Views (no auth required)
  updateViews: (submissionId: string, views: number) =>
    apiRequest<{
      success: boolean;
      message: string;
      submission: Partial<Submission>;
      payoutDetails: { highestMilestoneCrossed: Milestone | null; deltaPaid: number; cappedDueToBudget: boolean };
      campaignBudget: { totalBudget: number; spentBudget: number; remainingBudget: number; status: string };
    }>(`/submissions/${submissionId}/views`, {
      method: 'PATCH',
      body: JSON.stringify({ views })
    })
};
