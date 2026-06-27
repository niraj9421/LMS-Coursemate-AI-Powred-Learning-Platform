import { Schema, model, Document, Types } from 'mongoose';

export interface IStudentProfile extends Document {
  userId: Types.ObjectId;
  // Personal
  profilePhoto: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: string;
  address?: string; city?: string; state?: string; country?: string;
  // Academic
  collegeName?: string; universityName?: string; department?: string;
  degree?: string; specialization?: string; passingYear?: number; cgpa?: number;
  // Professional
  headline?: string;
  summary?: string;
  experience: Array<{ company: string; role: string; startDate: Date; endDate?: Date; current: boolean; description: string }>;
  // Skills
  technicalSkills: string[];
  softSkills: string[];
  // Projects
  projects: Array<{ title: string; description: string; technologies: string[]; githubLink?: string; liveLink?: string; imageUrl?: string }>;
  // Achievements
  achievements: {
    certificates: Array<{ name: string; issuer: string; year: number; url?: string }>;
    hackathons: Array<{ name: string; position: string; year: number }>;
    awards: Array<{ name: string; description: string; year: number }>;
  };
  // Social
  socialLinks: { linkedin?: string; github?: string; portfolio?: string; leetcode?: string; codeforces?: string };
  // Computed
  profileStrength: number;
  isPublic: boolean;
  createdAt: Date; updatedAt: Date;
}

const studentProfileSchema = new Schema<IStudentProfile>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  profilePhoto: { type: String, default: '' },
  fullName: { type: String, required: true },
  phone: String, dateOfBirth: Date, gender: String,
  address: String, city: String, state: String, country: String,
  collegeName: String, universityName: String, department: String,
  degree: String, specialization: String, passingYear: Number, cgpa: Number,
  headline: String, summary: String,
  experience: [{
    company: String, role: String, startDate: Date, endDate: Date,
    current: { type: Boolean, default: false }, description: String,
  }],
  technicalSkills: [String], softSkills: [String],
  projects: [{ title: String, description: String, technologies: [String], githubLink: String, liveLink: String, imageUrl: String }],
  achievements: {
    certificates: [{ name: String, issuer: String, year: Number, url: String }],
    hackathons:   [{ name: String, position: String, year: Number }],
    awards:       [{ name: String, description: String, year: Number }],
  },
  socialLinks: { linkedin: String, github: String, portfolio: String, leetcode: String, codeforces: String },
  profileStrength: { type: Number, default: 0, min: 0, max: 100 },
  isPublic: { type: Boolean, default: true },
}, { timestamps: true });

// Calculate profile strength before save
studentProfileSchema.pre('save', function(next) {
  let score = 0;
  if (this.profilePhoto) score += 5;
  if (this.headline) score += 10;
  if (this.summary) score += 10;
  if (this.phone) score += 5;
  if (this.city && this.country) score += 5;
  if (this.collegeName) score += 5;
  if (this.degree) score += 5;
  if (this.technicalSkills.length >= 3) score += 10;
  if (this.experience.length >= 1) score += 15;
  if (this.projects.length >= 1) score += 10;
  if (this.socialLinks.linkedin) score += 5;
  if (this.socialLinks.github) score += 5;
  if (this.achievements.certificates.length >= 1) score += 5;
  if (this.achievements.hackathons.length >= 1 || this.achievements.awards.length >= 1) score += 5;
  this.profileStrength = Math.min(score, 100);
  next();
});

export const StudentProfile = model<IStudentProfile>('StudentProfile', studentProfileSchema);
