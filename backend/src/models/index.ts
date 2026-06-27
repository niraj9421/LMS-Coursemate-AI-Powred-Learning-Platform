// ─── Models barrel ────────────────────────────────────────────────────────────
// Import from here for convenience: import { User, Course, ... } from '../models'

export { User } from './User';
export type { IUser, IGamification, IPreferences } from './User';

export { Category } from './Category';
export type { ICategory } from './Category';

export { Course } from './Course';
export type { ICourse } from './Course';

export { Chapter } from './Chapter';
export type { IChapter } from './Chapter';

export { Lesson } from './Lesson';
export type { ILesson, IFlashcard, IResource } from './Lesson';

export { Quiz, Question, QuizAttempt } from './Quiz';
export type { IQuiz, IQuestion, IQuizAttempt, IQuizSettings } from './Quiz';

export { Assignment, Submission } from './Assignment';
export type { IAssignment, ISubmission } from './Assignment';

export { Enrollment, LessonProgress } from './Enrollment';
export type { IEnrollment, ILessonProgress } from './Enrollment';

export { Certificate } from './Certificate';
export type { ICertificate } from './Certificate';

export { InterviewSession, ResumeAnalysis } from './Placement';
export type { IInterviewSession, IResumeAnalysis } from './Placement';

export { LearningPath } from './LearningPath';
export type { ILearningPath } from './LearningPath';

export { Notification } from './Notification';
export type { INotification, NotificationType } from './Notification';

export { UserAnalytics } from './Analytics';
export type { IUserAnalytics } from './Analytics';

export { News } from './News';
export type { INews } from './News';

export { Badge } from './Badge';
export type { IBadge } from './Badge';

export { Post, Reply } from './Community';
export type { IPost, IReply } from './Community';

export { AttendanceSession } from './Attendance';
export type { IAttendanceSession, IAttendanceRecord } from './Attendance';
