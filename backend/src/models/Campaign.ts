import { Schema, model, Document, Types } from 'mongoose';

export type PlatformType = 'Instagram' | 'YouTube';
export type CampaignStatus = 'active' | 'budget_exhausted' | 'completed';

export interface IMilestone {
  viewsThreshold: number;
  payout: number;
}

export interface ICampaign extends Document {
  brandId: Types.ObjectId;
  name: string;
  platform: PlatformType;
  totalBudget: number;
  spentBudget: number;
  remainingBudget: number;
  milestones: IMilestone[];
  status: CampaignStatus;
  createdAt: Date;
  updatedAt: Date;
}

const MilestoneSchema = new Schema<IMilestone>(
  {
    viewsThreshold: {
      type: Number,
      required: true,
      min: [1, 'viewsThreshold must be greater than 0']
    },
    payout: {
      type: Number,
      required: true,
      min: [0, 'payout cannot be negative']
    }
  },
  { _id: false }
);

const CampaignSchema = new Schema<ICampaign>(
  {
    brandId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true
    },
    platform: {
      type: String,
      enum: ['Instagram', 'YouTube'],
      required: [true, 'Platform is required']
    },
    totalBudget: {
      type: Number,
      required: [true, 'Total budget is required'],
      min: [1, 'Total budget must be greater than 0']
    },
    spentBudget: {
      type: Number,
      default: 0,
      min: [0, 'Spent budget cannot be negative']
    },
    remainingBudget: {
      type: Number,
      required: true,
      default: function () {
        return this.totalBudget;
      },
      min: [0, 'Remaining budget cannot be negative']
    },
    milestones: {
      type: [MilestoneSchema],
      required: true,
      validate: {
        validator: function (milestones: IMilestone[]) {
          return Array.isArray(milestones) && milestones.length > 0;
        },
        message: 'A campaign must have at least one milestone'
      }
    },
    status: {
      type: String,
      enum: ['active', 'budget_exhausted', 'completed'],
      default: 'active',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook: ensure milestones are always sorted by viewsThreshold ascending
CampaignSchema.pre('save', function (next) {
  if (this.isModified('milestones') && this.milestones) {
    this.milestones.sort((a, b) => a.viewsThreshold - b.viewsThreshold);
  }
  next();
});

export const Campaign = model<ICampaign>('Campaign', CampaignSchema);
