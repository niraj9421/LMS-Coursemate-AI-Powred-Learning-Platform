# Implementation Plan

## Task 1: Project Scaffolding & Infrastructure Setup

**Requirements:** 16.1, 16.2, 17.1–17.8

- [x] 1.1 Initialize the backend Node.js/Express project with TypeScript, folder structure (`src/config`, `src/models`, `src/controllers`, `src/services`, `src/routes`, `src/middleware`, `src/validators`, `src/utils`, `src/jobs`, `src/types`), and `tsconfig.json`
- [x] 1.2 Initialize the frontend React project with Vite, TypeScript, Tailwind CSS, and folder structure (`src/app`, `src/components/ui`, `src/components/layout`, `src/features`, `src/pages`, `src/hooks`, `src/services`, `src/utils`, `src/types`)
- [x] 1.3 Configure MongoDB Atlas connection with Mongoose, including auto-reconnect with exponential backoff on connection loss
- [x] 1.4 Configure Redis client (`ioredis`) for caching and session management
- [x] 1.5 Configure Cloudinary SDK for media storage with upload presets for images, videos, and documents
- [x] 1.6 Set up environment variable validation using Zod (`src/config/env.ts`) covering all required secrets and service URLs
- [x] 1.7 Implement the global Express middleware stack: Helmet.js security headers, CORS with origin whitelist, Morgan request logger, JSON body parser, and global error handler with Winston logging
- [x] 1.8 Implement the `ApiResponse` and `ApiError` utility classes and `asyncHandler` wrapper for consistent response envelopes (`{ success, data, message, error }`)
- [x] 1.9 Configure Redux Toolkit store with `rootReducer`, React Query client, and React Router v6 in the frontend
- [x] 1.10 Set up the Axios instance (`src/services/api.ts`) with base URL, JWT Authorization header injection, and automatic token refresh on 401 responses

## Task 2: Database Models & Indexes

**Requirements:** 1.1–1.6, 3.1–3.5, 4.1–4.4, 5.1–5.3, 6.1–6.2, 7.1–7.7, 8.1–8.4, 10.1, 11.1–11.2, 12.1–12.2, 13.1–13.3, 17.1–17.2

- [x] 2.1 Create the `User` Mongoose model with fields: name, email (unique indexed), password (bcrypt), avatar, role (enum: admin/teacher/student, default: student), googleId, isEmailVerified, emailVerificationToken, passwordResetToken, passwordResetExpires, bio, skills, socialLinks, gamification (xp, level, streak, lastActiveDate, badges), preferences (theme, notifications, learningGoal)
- [x] 2.2 Create the `Course` Mongoose model with fields: title (text indexed), slug (unique), description (text indexed), shortDescription, thumbnail, previewVideo, instructor (ref: User), category (ref: Category), tags, level, language, price, discountPrice, currency, status (draft/published/archived), chapters, enrollmentCount, rating, requirements, outcomes, totalDuration, totalLessons, certificate, aiGenerated, deletedAt (soft-delete)
- [x] 2.3 Create the `Chapter` and `Lesson` Mongoose models with ordering, locking, lesson types (video/pdf/text/quiz/assignment), aiNotes, aiFlashcards, and resource attachments
- [x] 2.4 Create the `Quiz`, `Question`, and `QuizAttempt` Mongoose models with question types (mcq/true_false/subjective/fill_blank), settings (timeLimit, passingScore, shuffleQuestions, maxAttempts), and attempt tracking (answers map, score, percentage, status)
- [x] 2.5 Create the `Assignment` and `Submission` Mongoose models with due date, max marks, file attachments, submission status (pending/submitted/graded), and grading fields
- [x] 2.6 Create the `Enrollment` and `LessonProgress` Mongoose models with compound unique index on `{userId, courseId}`, progress percentage, completedLessons array, and status (active/completed/dropped)
- [x] 2.7 Create the `Certificate` Mongoose model with uniqueId (UUID v4), QR code URL, PDF URL, and compound unique index on `{userId, courseId}`
- [x] 2.8 Create the `InterviewSession` and `ResumeAnalysis` Mongoose models with role, type, questions/answers arrays, scores, feedback, strengths, improvements, and ATS score fields
- [x] 2.9 Create the `LearningPath` Mongoose model with goal, weeklyPlan, milestones, estimatedCompletionDate, and progress tracking
- [x] 2.10 Create the `Notification` Mongoose model with type enum, isRead flag, and a 90-day TTL index on `createdAt`
- [x] 2.11 Create the `UserAnalytics` Mongoose model for daily snapshots with learningTime, lessonsCompleted, quizzesTaken, averageQuizScore, xpEarned, loginCount
- [x] 2.12 Create the `News`, `Category`, `Badge`, and `Community` (Post/Reply) Mongoose models
- [x] 2.13 Create the `Attendance` Mongoose model with sessionId, courseId, teacherId, QR token, expiry, and attendance records with duplicate prevention
- [x] 2.14 Apply all required MongoDB indexes: compound `{userId, courseId}` on Enrollment and LessonProgress; text index on Course title+description; TTL index on Notification; indexes on Quiz/Attempt for leaderboard queries

## Task 3: Authentication System (Backend)

**Requirements:** 1.1–1.5, 16.2, 16.3

- [x] 3.1 Implement `POST /api/v1/auth/register` — validate input with Zod (name, email, password min 8 chars), hash password with bcrypt cost 12, create user with role `student`, generate signed email verification token, send verification email asynchronously
- [x] 3.2 Implement `GET /api/v1/auth/verify-email/:token` — validate token, mark `isEmailVerified: true`, invalidate token
- [x] 3.3 Implement `POST /api/v1/auth/login` — validate credentials, check email verified, compare bcrypt hash, issue JWT access token (15 min) and refresh token (7 days), apply Redis-backed rate limiter (10 req/15 min per IP), return generic error on failure
- [x] 3.4 Implement `POST /api/v1/auth/refresh-token` — validate refresh token, check it is not blacklisted in Redis, issue new token pair
- [x] 3.5 Implement `POST /api/v1/auth/logout` — blacklist the refresh token in Redis with 7-day TTL
- [x] 3.6 Implement `POST /api/v1/auth/google` — validate Google ID token using `google-auth-library`, find or create user by email, link googleId, issue JWT pair
- [x] 3.7 Implement `POST /api/v1/auth/forgot-password` — generate signed reset token (1-hour expiry), store hashed token on user, send reset email
- [x] 3.8 Implement `POST /api/v1/auth/reset-password/:token` — validate token and expiry, hash new password, clear reset token fields
- [x] 3.9 Implement `authenticate` middleware — extract and verify JWT from Authorization header, attach `req.user`; return `401` if missing or expired
- [x] 3.10 Implement `authorize(roles[])` middleware — check `req.user.role` against allowed roles; return `403 Forbidden` if not permitted
- [x] 3.11 Implement `rateLimiter` middleware using `express-rate-limit` backed by Redis store

## Task 4: User Profile API (Backend)

**Requirements:** 1.6, 13.1

- [x] 4.1 Implement `GET /api/v1/users/me` — return authenticated user's public profile (exclude password, tokens)
- [x] 4.2 Implement `PUT /api/v1/users/me` — validate and update name, bio, skills, socialLinks, preferences (theme, notifications, learningGoal)
- [x] 4.3 Implement avatar upload — accept image file via multipart form, validate MIME type (image/*) and size (≤5 MB), upload to Cloudinary, update user avatar URL
- [x] 4.4 Implement `GET /api/v1/users/:id/profile` — return public profile of any user (name, avatar, bio, skills, gamification stats, badges)
- [x] 4.5 Implement `GET /api/v1/users/me/analytics` — return last 30 days of daily analytics snapshots for the authenticated student
- [x] 4.6 Implement `GET /api/v1/users/me/certificates` — return all certificates for the authenticated student

## Task 5: Course Management API (Backend)

**Requirements:** 3.1–3.5, 16.1–16.3, 17.1–17.3

- [x] 5.1 Implement `POST /api/v1/courses` (teacher only) — validate with Zod, generate slug, create course with `status: 'draft'`, upload thumbnail to Cloudinary
- [x] 5.2 Implement `GET /api/v1/courses` — full-text search, filter by category/level/price/rating, cursor-based pagination (20/page), cache results in Redis (5-min TTL)
- [x] 5.3 Implement `GET /api/v1/courses/:id` — return course with chapters, lessons (locked/unlocked based on enrollment), instructor info, and enrollment count
- [x] 5.4 Implement `PUT /api/v1/courses/:id` (owner or admin) — update course fields, re-upload thumbnail if changed, recalculate slug if title changed
- [x] 5.5 Implement `DELETE /api/v1/courses/:id` (owner or admin) — soft-delete by setting `deletedAt` timestamp
- [x] 5.6 Implement `POST /api/v1/courses/:id/publish` (owner or admin) — validate course has at least one published chapter, change status to `published`
- [x] 5.7 Implement `POST /api/v1/courses/:id/enroll` (student only) — check course is published, prevent duplicate enrollment (return `409` if exists), create Enrollment record, increment `enrollmentCount` atomically, send enrollment notification
- [x] 5.8 Implement `GET /api/v1/courses/:id/progress` — return enrollment progress, completed lessons, and next lesson for the authenticated student
- [x] 5.9 Implement `GET /api/v1/courses/recommended` — return courses based on student's skills and learning history
- [x] 5.10 Implement chapter CRUD: `POST /api/v1/courses/:id/chapters`, `PUT /api/v1/chapters/:id`, `DELETE /api/v1/chapters/:id` with order management
- [x] 5.11 Implement lesson CRUD: `POST /api/v1/chapters/:id/lessons`, `PUT /api/v1/lessons/:id`, `DELETE /api/v1/lessons/:id`; handle video/PDF upload to Cloudinary; auto-update course `totalDuration` and `totalLessons`
- [x] 5.12 Implement `POST /api/v1/lessons/:id/complete` — validate enrollment and 80% watch time for videos, create/update LessonProgress, recalculate enrollment progress, award XP, trigger certificate generation if progress = 100%
- [x] 5.13 Implement course rating: `POST /api/v1/courses/:id/rate` — validate student is enrolled, upsert rating, recalculate course average rating and count
- [x] 5.14 Implement `upload` middleware using Multer with memory storage, MIME type validation, and size limits (50 MB video, 10 MB documents)

## Task 6: Quiz & Assessment API (Backend)

**Requirements:** 4.1–4.4

- [x] 6.1 Implement `POST /api/v1/quizzes` (teacher only) — create quiz with settings (timeLimit, passingScore, shuffleQuestions, shuffleOptions, maxAttempts, showResults), xpReward, and questions
- [x] 6.2 Implement `GET /api/v1/quizzes/:id` — return quiz with questions (shuffle if configured), excluding correct answers for students
- [x] 6.3 Implement `POST /api/v1/quizzes/:id/start` — validate enrollment, check max attempts not exceeded, create QuizAttempt with `status: 'in_progress'` and `startedAt`
- [x] 6.4 Implement `POST /api/v1/attempts/:id/answer` — validate attempt is in progress and not expired, store answer in attempt's answers map
- [ ] 6.5 Implement `POST /api/v1/attempts/:id/submit` — evaluate all answers: auto-grade MCQ/True-False/Fill-blank, AI-grade subjective; calculate score, percentage, pass/fail; update attempt to `evaluated`; award XP if passed; return detailed results
- [ ] 6.6 Implement time-limit enforcement — when `startedAt + timeLimit` is exceeded, auto-submit the attempt with answers provided so far
- [ ] 6.7 Implement `GET /api/v1/quizzes/:id/leaderboard` — return top scores ranked by percentage then time taken
- [ ] 6.8 Implement `GET /api/v1/quizzes/:id/analytics` (teacher only) — return average score, pass rate, per-question correct/incorrect counts, difficulty distribution

## Task 7: Assignment System API (Backend)

**Requirements:** 5.1–5.3, 12.2

- [ ] 7.1 Implement `POST /api/v1/assignments` (teacher only) — create assignment with title, description, dueDate, maxMarks, and optional reference file upload to Cloudinary
- [ ] 7.2 Implement `GET /api/v1/assignments/:id` — return assignment details; students see their own submission status
- [ ] 7.3 Implement `POST /api/v1/assignments/:id/submit` (student only) — validate enrollment, upload submission file (PDF/DOCX/ZIP ≤10 MB) to Cloudinary, create Submission record with `status: 'submitted'`, record timestamp, award XP
- [ ] 7.4 Implement `PUT /api/v1/submissions/:id/grade` (teacher only) — validate submission belongs to teacher's course, set score and feedback, update status to `graded`, send grading notification to student
- [ ] 7.5 Implement deadline reminder cron job — run daily, find assignments with `dueDate` within 24 hours, send reminder notifications to students who have not submitted

## Task 8: Certificate System (Backend)

**Requirements:** 6.1–6.2

- [ ] 8.1 Implement `generateCertificate(userId, courseId)` service — validate enrollment progress = 100% and course has `certificate: true`, check no existing certificate, generate UUID v4 certificateId, render PDF with `pdf-lib` (student name, course name, instructor, issue date), upload PDF to Cloudinary
- [ ] 8.2 Implement QR code generation using `qrcode` library — generate QR pointing to `/verify/{certificateId}`, embed in PDF before upload
- [ ] 8.3 Implement `GET /api/v1/certificates/verify/:id` (public) — return certificate details for verification display
- [ ] 8.4 Implement `GET /api/v1/certificates/:id/download` (authenticated) — return Cloudinary PDF URL for the student's certificate
- [ ] 8.5 Trigger certificate email on generation — send email with PDF attachment or download link asynchronously

## Task 9: Gamification Engine (Backend)

**Requirements:** 8.1–8.4

- [ ] 9.1 Implement `GamificationService.awardXP(userId, action, metadata)` — look up base XP from action table, apply streak multiplier (1.2× for 3–6 days, 1.5× for 7+ days), add to user's total XP, recalculate level using threshold array [0,100,250,500,1000,2000,4000,8000,15000,30000], persist atomically, trigger badge check on level-up
- [ ] 9.2 Implement `GamificationService.updateStreak(userId)` — compare `lastActiveDate` to today; if yesterday, increment streak; if today, no change; if older, reset to 1; update `lastActiveDate`; award streak XP
- [ ] 9.3 Implement `GamificationService.checkAndAwardBadges(userId)` — evaluate badge eligibility rules (level milestones, course completions, streak records), award new badges, send badge-earned notification
- [ ] 9.4 Implement `GET /api/v1/gamification/stats` — return user's XP, level, streak, badges, and rank
- [ ] 9.5 Implement `GET /api/v1/gamification/leaderboard?scope=global|course|weekly` — return top 50 entries with rank, name, avatar, XP, level; cache in Redis with 1-min TTL
- [ ] 9.6 Integrate `updateStreak` call into the lesson completion and quiz submission flows

## Task 10: Notification System (Backend)

**Requirements:** 12.1–12.2

- [ ] 10.1 Implement `NotificationService.create(userId, type, title, message, link?)` — create Notification document; emit real-time event via Socket.io to the user's room
- [ ] 10.2 Implement `GET /api/v1/notifications` — return paginated notifications for authenticated user, sorted by `createdAt` descending
- [ ] 10.3 Implement `PUT /api/v1/notifications/:id/read` — mark single notification as read
- [ ] 10.4 Implement `PUT /api/v1/notifications/read-all` — mark all unread notifications for the user as read
- [ ] 10.5 Implement Socket.io server setup — authenticate socket connections with JWT, join user to their personal room on connect
- [ ] 10.6 Implement `EmailService` using Nodemailer — configure SMTP/SendGrid transport, create HTML email templates for: verification, password reset, enrollment confirmation, certificate issued, assignment graded
- [ ] 10.7 Implement deadline reminder cron job (node-cron, runs daily at 8 AM) — query assignments due within 24 hours, create in-app notifications and send reminder emails to non-submitted students

## Task 11: Analytics System (Backend)

**Requirements:** 13.1–13.3

- [ ] 11.1 Implement daily analytics snapshot cron job — runs at midnight, aggregates each active student's learning time, lessons completed, quizzes taken, average quiz score, XP earned, and login count for the day; upserts `UserAnalytics` document
- [ ] 11.2 Implement `GET /api/v1/users/me/analytics` — return last 30 days of daily snapshots for charts
- [ ] 11.3 Implement `GET /api/v1/courses/:id/analytics` (teacher only) — return total enrollments, active students (accessed in last 7 days), average completion rate, average quiz score, and per-lesson completion rates
- [ ] 11.4 Implement `GET /api/v1/admin/analytics` (admin only) — return platform totals: users, new users (last 30 days), courses, enrollments, revenue; include daily trend data for charts
- [ ] 11.5 Implement `GET /api/v1/admin/analytics/export` (admin only) — generate and return a CSV report of platform analytics

## Task 12: AI Orchestration Service (Backend)

**Requirements:** 7.1–7.7, 16.3

- [ ] 12.1 Implement `AIRouter` service (`src/services/ai/ai.router.ts`) — abstract Gemini API and OpenAI API behind a unified `generate(prompt, options)` interface; implement fallback to secondary provider on 5xx or rate limit; return `503` with `Retry-After` header when both providers fail
- [ ] 12.2 Implement prompt template files for each AI feature: `course.prompts.ts` (structure generation, chapter content), `tutor.prompts.ts` (Q&A with course context), `interview.prompts.ts` (question generation, answer evaluation), `resume.prompts.ts` (ATS analysis, feedback)
- [ ] 12.3 Implement AI usage tracking — log each AI request (userId, feature, tokens used, timestamp) to a `AIUsageLog` collection; enforce daily limits (50 free / 200 premium) and return `429` when exceeded
- [ ] 12.4 Implement AI Course Generator service (`src/services/ai/course-generator.service.ts`) — extract text from PDF (pdf-parse), DOCX (mammoth), PPTX; chunk into ≤4000 token segments; generate course structure then per-chapter content (summary, notes, flashcards, MCQs, assignments); stream progress via SSE; save draft course
- [ ] 12.5 Implement AI Tutor service (`src/services/ai/tutor.service.ts`) — build prompt with course context and last 10 messages; call AIRouter; parse structured response (answer, examples, relatedTopics, followUpQuestions); persist conversation; cache response in Redis (1-hour TTL, key: hash of courseId+question)
- [ ] 12.6 Implement Learning Path Generator service — fetch user skills and completed courses; call AI for skill gap analysis; query relevant published courses; build weekly schedule within hour budget; generate milestones; save LearningPath document
- [ ] 12.7 Implement AI Interview Simulator service (`src/services/ai/interview.service.ts`) — generate role-specific questions; evaluate each answer (score 0–100, confidence, clarity); generate final report (overall score, strengths, improvements); save InterviewSession
- [ ] 12.8 Implement AI Resume Analyzer service (`src/services/ai/resume.service.ts`) — extract text from uploaded PDF/DOCX; call AI for ATS score, skills found, skills gap, keyword suggestions, section feedback; save ResumeAnalysis document
- [ ] 12.9 Implement Performance Prediction service (`src/services/ai/prediction.service.ts`) — aggregate student metrics (completion rate, avg quiz score, consistency, streak, submission rate, avg learning time); apply weighted scoring model; call AI for weak area identification; return prediction with risk level and improvement plan
- [ ] 12.10 Implement Project Idea Generator — accept domain and skill level; call AI to generate ≥3 project ideas each with title, description, features, tech stack, and architecture; return results

## Task 13: AI Feature API Routes (Backend)

**Requirements:** 7.1–7.7

- [ ] 13.1 Implement `POST /api/v1/ai/generate-course` (teacher only) — accept multipart file upload, validate file type (PDF/DOCX/PPTX), call course generator service, stream SSE progress events to client
- [ ] 13.2 Implement `POST /api/v1/ai/tutor` (student only) — validate question ≤2000 chars and courseId enrollment, enforce daily query limit, call tutor service, return structured response
- [ ] 13.3 Implement `POST /api/v1/ai/learning-path` (student only) — validate inputs (goal, level, hoursPerDay 0.5–12, weeks 1–52), call learning path service, return and save path
- [ ] 13.4 Implement `POST /api/v1/ai/interview/start` — validate role and type, create InterviewSession, return first question
- [ ] 13.5 Implement `POST /api/v1/ai/interview/:id/answer` — validate session is active, evaluate answer, store result, return next question or final report if complete; award XP on completion
- [ ] 13.6 Implement `POST /api/v1/ai/resume/analyze` — accept PDF/DOCX upload (≤10 MB), call resume analyzer service, return and save analysis
- [ ] 13.7 Implement `GET /api/v1/ai/performance/:courseId` — aggregate student metrics, run prediction, return result (accessible by student and course teacher)
- [ ] 13.8 Implement `POST /api/v1/ai/project-ideas` — validate domain and skill level, call project idea generator, return ≥3 ideas

## Task 14: Placement Hub API (Backend)

**Requirements:** 9.1–9.3

- [ ] 14.1 Implement Resume Builder API — `GET /api/v1/placement/resume-builder` (return saved resume data), `POST /api/v1/placement/resume-builder` (save resume sections: personal info, education, experience, skills, projects, certifications), `GET /api/v1/placement/resume-builder/export` (generate and return PDF using pdf-lib)
- [ ] 14.2 Implement `GET /api/v1/placement/gd-topics` — return paginated list of GD topics with category and difficulty
- [ ] 14.3 Implement `GET /api/v1/placement/aptitude/:category` — return timed aptitude test (quantitative/logical/verbal) with questions; `POST /api/v1/placement/aptitude/:id/submit` — auto-evaluate and return score with correct answers
- [ ] 14.4 Implement `GET /api/v1/placement/company/:name` — return company prep kit with common interview questions, tips, and required skills
- [ ] 14.5 Seed the database with initial GD topics, aptitude questions, and company prep data

## Task 15: Community Hub API (Backend)

**Requirements:** 10.1

- [ ] 15.1 Implement `GET /api/v1/community/posts` — return paginated posts with reply count and upvote count; support sort by `recent` and `top`
- [ ] 15.2 Implement `POST /api/v1/community/posts` — create post with title and body; award XP to author
- [ ] 15.3 Implement `POST /api/v1/community/posts/:id/reply` — add threaded reply to a post
- [ ] 15.4 Implement `POST /api/v1/community/posts/:id/upvote` — toggle upvote on a post or reply; prevent duplicate upvotes
- [ ] 15.5 Implement `DELETE /api/v1/community/posts/:id` (admin or author) — delete post and its replies

## Task 16: Attendance System API (Backend)

**Requirements:** 11.1–11.2

- [ ] 16.1 Implement `POST /api/v1/attendance/session` (teacher only) — generate a time-limited QR token (JWT, 15-min expiry) for a class session; return QR code image
- [ ] 16.2 Implement `POST /api/v1/attendance/mark` (student only) — validate QR token is valid and not expired, check student is enrolled in the course, prevent duplicate mark for same session, record attendance with timestamp
- [ ] 16.3 Implement `GET /api/v1/attendance/:courseId` (teacher only) — return per-student attendance percentage and session-by-session records
- [ ] 16.4 Implement `GET /api/v1/attendance/:courseId/export` (teacher only) — generate and return CSV attendance report

## Task 17: Admin API (Backend)

**Requirements:** 14.1–14.5

- [ ] 17.1 Implement `GET /api/v1/admin/users` (admin only) — return paginated, searchable, filterable user list with role, status, and join date
- [ ] 17.2 Implement `PUT /api/v1/admin/users/:id/role` (admin only) — change user role; validate new role is valid enum value
- [ ] 17.3 Implement `DELETE /api/v1/admin/users/:id` (admin only) — deactivate or hard-delete user account
- [ ] 17.4 Implement `GET /api/v1/admin/courses` (admin only) — return all courses regardless of status
- [ ] 17.5 Implement `PUT /api/v1/admin/courses/:id/status` (admin only) — change course status to published/archived/draft
- [ ] 17.6 Implement News CRUD: `GET/POST /api/v1/news`, `PUT/DELETE /api/v1/news/:id` (admin for write, public for read) with category assignment
- [ ] 17.7 Implement Category CRUD: `GET/POST /api/v1/categories`, `PUT/DELETE /api/v1/categories/:id` (admin for write, public for read)
- [ ] 17.8 Implement news feed refresh cron job — runs every 6 hours, fetches technology news from News API across 5 categories, upserts articles to the News collection

## Task 18: Design System & UI Component Library (Frontend)

**Requirements:** 15.1–15.2

- [ ] 18.1 Configure Tailwind CSS with custom design tokens: color palette (primary gradient, surface glass, text), font family (Inter/Geist), border radius, and box shadow for glassmorphism effects; configure dark mode via `class` strategy
- [ ] 18.2 Implement `ThemeProvider` — read theme from Redux store, apply `dark` class to `<html>`, persist preference to user profile on change
- [ ] 18.3 Build `Button` component — variants: primary (gradient), secondary (glass), ghost, danger; sizes: sm/md/lg; loading spinner state; hover/focus animations with Framer Motion
- [ ] 18.4 Build `Card` component — glassmorphism style (backdrop-blur, semi-transparent bg, subtle border); hover lift animation; dark/light mode variants
- [ ] 18.5 Build `Input` and `Textarea` components — glassmorphism style, label, inline error message display, focus ring animation
- [ ] 18.6 Build `Modal` component — Framer Motion entrance/exit animation, backdrop blur overlay, close on Escape key and backdrop click
- [ ] 18.7 Build `Badge`, `Avatar`, `Skeleton`, and `Toast` components — Badge with color variants; Avatar with fallback initials; Skeleton with shimmer animation; Toast with auto-dismiss and Framer Motion slide-in
- [ ] 18.8 Build `Navbar` component — logo, navigation links, theme toggle button, notification bell with unread count badge, user avatar dropdown (profile, dashboard, logout); responsive hamburger menu for mobile
- [ ] 18.9 Build `Sidebar` component for dashboards — collapsible on mobile, active link highlighting, role-based navigation items
- [ ] 18.10 Build `DashboardLayout` component — Sidebar + top bar + main content area with responsive grid
- [ ] 18.11 Build `Footer` component — quick links, social media icons, newsletter subscription form with email capture

## Task 19: Home Page (Frontend)

**Requirements:** 2.1–2.8

- [ ] 19.1 Build `HeroSection` — full-viewport animated gradient background (Framer Motion), tagline text, glassmorphism AI search bar with animated placeholder, floating tech icons (CSS keyframe animations), "Generate Learning Path" and "Explore Courses" CTA buttons
- [ ] 19.2 Build `NewsHub` section — category filter tabs (AI/Startup/Web Dev/Data/Cybersec), horizontally scrollable news card row; each card shows image, headline, summary, "Read More" link; fetch from `/api/v1/news` with React Query
- [ ] 19.3 Build `TrendingTechnologies` section — 7-card grid; each card shows tech name, icon, demand %, salary range, growth %; animate demand progress bars on scroll using Intersection Observer
- [ ] 19.4 Build `CareerRoadmaps` section — 8 interactive cards; hover/click expands to show required skills, roadmap steps, job opportunities, salary insights; Framer Motion layout animation
- [ ] 19.5 Build `FeaturedCourses` section — tabbed interface (Popular/Recommended/Trending); `CourseCard` component with thumbnail, title, instructor, rating stars, enrollment count; fetch from `/api/v1/courses` with React Query
- [ ] 19.6 Build `SuccessStories` section — auto-playing testimonial carousel with Framer Motion; each slide shows student photo, name, company, testimonial text
- [ ] 19.7 Build `InnovationHub` section — 3-column grid (AI Innovations, Research Trends, Emerging Technologies) with article cards
- [ ] 19.8 Assemble the full `HomePage` by composing all sections with smooth scroll behavior and section entrance animations
