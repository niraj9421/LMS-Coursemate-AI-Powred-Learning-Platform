import { Schema, model, Document, Types } from 'mongoose';

// ─── GD Topic ─────────────────────────────────────────────────────────────────
export interface IGDTopic extends Document {
  title: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  keyPoints: string[];
}
const gdTopicSchema = new Schema<IGDTopic>({
  title: { type: String, required: true },
  category: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  description: String,
  keyPoints: [String],
}, { timestamps: true });
export const GDTopic = model<IGDTopic>('GDTopic', gdTopicSchema);

// ─── Aptitude Question ────────────────────────────────────────────────────────
export interface IAptitudeQuestion extends Document {
  category: 'quantitative' | 'logical' | 'verbal';
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}
const aptitudeSchema = new Schema<IAptitudeQuestion>({
  category: { type: String, enum: ['quantitative', 'logical', 'verbal'], required: true },
  question: { type: String, required: true },
  options: [String],
  correctAnswer: { type: String, required: true },
  explanation: String,
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
}, { timestamps: true });
aptitudeSchema.index({ category: 1 });
export const AptitudeQuestion = model<IAptitudeQuestion>('AptitudeQuestion', aptitudeSchema);

// ─── Company Kit ──────────────────────────────────────────────────────────────
export interface ICompanyKit extends Document {
  name: string;
  logo?: string;
  commonQuestions: Array<{ question: string; category: string }>;
  tips: string[];
  requiredSkills: string[];
  interviewProcess: string;
}
const companyKitSchema = new Schema<ICompanyKit>({
  name: { type: String, required: true, unique: true },
  logo: String,
  commonQuestions: [{ question: String, category: String }],
  tips: [String],
  requiredSkills: [String],
  interviewProcess: String,
}, { timestamps: true });
export const CompanyKit = model<ICompanyKit>('CompanyKit', companyKitSchema);

// ─── Resume Builder ───────────────────────────────────────────────────────────
export interface IResumeBuilder extends Document {
  userId: Types.ObjectId;
  personalInfo: { name?: string; email?: string; phone?: string; location?: string; linkedin?: string };
  education: Array<{ degree: string; institution: string; year: string; gpa?: string }>;
  experience: Array<{ title: string; company: string; duration: string; description?: string }>;
  skills: string[];
  projects: Array<{ name: string; description: string; techStack: string[]; link?: string }>;
  certifications: Array<{ name: string; issuer: string; year: string }>;
}
const resumeBuilderSchema = new Schema<IResumeBuilder>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  personalInfo: { name: String, email: String, phone: String, location: String, linkedin: String },
  education: [{ degree: String, institution: String, year: String, gpa: String }],
  experience: [{ title: String, company: String, duration: String, description: String }],
  skills: [String],
  projects: [{ name: String, description: String, techStack: [String], link: String }],
  certifications: [{ name: String, issuer: String, year: String }],
}, { timestamps: true });
export const ResumeBuilder = model<IResumeBuilder>('ResumeBuilder', resumeBuilderSchema);
