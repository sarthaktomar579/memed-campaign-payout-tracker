import { Schema, model, Document, Types } from 'mongoose';
import { IMilestone } from './Campaign';

export interface IViewHistoryItem {
  views: number;
  timestamp: Date;
  payoutDelta: number;
}

export interface ISubmission extends Document {
  creatorId: Types.ObjectId;
  campaignId: Types.ObjectId;
  postLink: string;
  currentViews: number;
  currentPayout: number;
  highestMilestoneReached?: IMilestone;
  isFlagged: boolean;
  flagReason?: string;
  viewHistory: IViewHistoryItem[];
  status: 'active' | 'flagged' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const ViewHistorySchema = new Schema<IViewHistoryItem>(
  {
    views: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    payoutDelta: { type: Number, default: 0 }
  },
  { _id: false }
);

const SubmissionSchema = new Schema<ISubmission>(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true
    },
    postLink: {
      type: String,
      required: [true, 'Post link is required'],
      trim: true
    },
    currentViews: {
      type: Number,
      default: 0,
      min: [0, 'Views cannot be negative']
    },
    currentPayout: {
      type: Number,
      default: 0,
      min: [0, 'Payout cannot be negative']
    },
    highestMilestoneReached: {
      viewsThreshold: { type: Number },
      payout: { type: Number }
    },
    isFlagged: {
      type: Boolean,
      default: false
    },
    flagReason: {
      type: String,
      default: null
    },
    viewHistory: {
      type: [ViewHistorySchema],
      default: []
    },
    status: {
      type: String,
      enum: ['active', 'flagged', 'completed'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

// Prevent creator submitting duplicate link to same campaign
SubmissionSchema.index({ campaignId: 1, postLink: 1 }, { unique: true });

export const Submission = model<ISubmission>('Submission', SubmissionSchema);
