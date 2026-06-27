import { Schema, model, Document, Types } from 'mongoose';

export interface ICareerPath {
  role: string;
  matchPercentage: number;
  skillGaps: string[];
  recommendedCourses: string[];
  recommendedCertifications: string[];
  recommendedProjects: string[];
}

export interface IRoadmapPhase {
  phase: '30d' | '60d' | '90d';
  tasks: Array<{ week: number; task: string; type: string }>;
}

export interface ICareerMentorSnapshot extends Document {
  studentId: Types.ObjectId;
  generatedAt: Date;
  // User inputs stored for display & re-generation
  interests: string[];
  targetRole: string;
  workPreference: string;
  timeline: string;
  // AI output
  careerReadinessScore: number;
  placementReadinessScore: number;
  careerPaths: ICareerPath[];
  topCareerPath: string;
  roadmap: IRoadmapPhase[];
  insights: string[];
  salaryInsights: Array<{ role: string; minSalary: string; maxSalary: string; currency: string }>;
  isStale: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const careerMentorSchema = new Schema<ICareerMentorSnapshot>({
  studentId:               { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  generatedAt:             { type: Date, default: Date.now },
  interests:               { type: [String], default: [] },
  targetRole:              { type: String, default: '' },
  workPreference:          { type: String, default: '' },
  timeline:                { type: String, default: '' },
  careerReadinessScore:    { type: Number, default: 0, min: 0, max: 100 },
  placementReadinessScore: { type: Number, default: 0, min: 0, max: 100 },
  careerPaths: [{ type: Schema.Types.Mixed }],
  topCareerPath: String,
  roadmap: [{ type: Schema.Types.Mixed }],
  insights: [String],
  salaryInsights: [{ type: Schema.Types.Mixed }],
  isStale: { type: Boolean, default: false },
}, { timestamps: true, strict: false });

export const CareerMentorSnapshot = model<ICareerMentorSnapshot>('CareerMentorSnapshot', careerMentorSchema);
