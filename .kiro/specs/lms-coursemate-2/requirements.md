# Requirements Document

## Introduction

LMS Coursemate 2.0 is a production-ready, AI-powered Student Success Ecosystem delivered as a SaaS platform. It unifies learning management, AI tutoring, career development, placement preparation, industry analytics, community features, and gamification into a single cohesive product. The platform serves three roles — Student, Teacher, and Admin — and is designed to feel like a premium startup product combining the best of Moodle, Coursera, LinkedIn Learning, Duolingo, Notion, and ChatGPT.

## Requirements

### 1. Authentication & User Management

#### 1.1 User Registration
- **1.1.1** The system MUST allow new users to register with name, email, and password.
- **1.1.2** The system MUST send an email verification link upon registration.
- **1.1.3** The system MUST prevent login until the email address is verified.
- **1.1.4** The system MUST enforce a minimum password length of 8 characters.
- **1.1.5** The system MUST hash passwords using bcrypt with a cost factor of 12 before storage.
- **1.1.6** The system MUST assign the `student` role by default on registration.

#### 1.2 User Login
- **1.2.1** The system MUST authenticate users via email and password.
- **1.2.2** The system MUST issue a short-lived JWT access token (15-minute expiry) on successful login.
- **1.2.3** The system MUST issue a long-lived refresh token (7-day expiry) on successful login.
- **1.2.4** The system MUST support token refresh via a dedicated endpoint without requiring re-login.
- **1.2.5** The system MUST rate-limit login attempts to a maximum of 10 per IP per 15 minutes.
- **1.2.6** The system MUST return a generic error message on failed login to prevent user enumeration.

#### 1.3 Google OAuth
- **1.3.1** The system MUST support login and registration via Google OAuth 2.0.
- **1.3.2** The system MUST validate Google ID tokens using Google's public keys.
- **1.3.3** The system MUST create a new user account automatically on first Google login.
- **1.3.4** The system MUST link a Google account to an existing account if the email matches.

#### 1.4 Password Recovery
- **1.4.1** The system MUST provide a "Forgot Password" flow that sends a signed reset link to the user's email.
- **1.4.2** The system MUST expire password reset tokens after 1 hour.
- **1.4.3** The system MUST allow users to set a new password using a valid reset token.
- **1.4.4** The system MUST invalidate the reset token after it is used.

#### 1.5 Role-Based Access Control
- **1.5.1** The system MUST enforce three roles: `admin`, `teacher`, and `student`.
- **1.5.2** The system MUST restrict role changes to admin users only.
- **1.5.3** The system MUST return `403 Forbidden` when a user accesses a resource outside their role.
- **1.5.4** The system MUST support logout that invalidates the refresh token via Redis blacklisting.

#### 1.6 User Profile
- **1.6.1** The system MUST allow users to update their name, bio, avatar, skills, and social links.
- **1.6.2** The system MUST store avatar images on Cloudinary.
- **1.6.3** The system MUST allow users to set a preferred theme (dark or light).
- **1.6.4** The system MUST allow users to configure notification preferences.

---

### 2. Home Page & Landing Experience

#### 2.1 Hero Section
- **2.1.1** The system MUST display a full-viewport hero section with an animated gradient background.
- **2.1.2** The system MUST display the tagline: "Learn Smarter. Stay Updated. Get Placed."
- **2.1.3** The system MUST include an AI-powered search bar with glassmorphism styling.
- **2.1.4** The system MUST include a "Generate Learning Path" CTA button.
- **2.1.5** The system MUST include an "Explore Courses" CTA button.
- **2.1.6** The system MUST display floating animated technology icons in the hero background.

#### 2.2 Live Technology News Hub
- **2.2.1** The system MUST display a horizontally scrollable news card section on the home page.
- **2.2.2** The system MUST fetch and display news across five categories: AI, Startup, Web Development, Data Analytics, and Cybersecurity.
- **2.2.3** Each news card MUST display an image, headline, summary, and a "Read More" link.
- **2.2.4** The system MUST provide category filter tabs to switch between news categories.
- **2.2.5** The system MUST refresh the news feed automatically via a background cron job.

#### 2.3 Trending Technologies
- **2.3.1** The system MUST display a grid of trending technology cards covering: AI, Machine Learning, React, Cloud Computing, Cybersecurity, Data Analytics, and Blockchain.
- **2.3.2** Each technology card MUST display industry demand percentage, salary range, and growth percentage.
- **2.3.3** The system MUST animate demand bars on scroll into view.

#### 2.4 AI Career Roadmaps
- **2.4.1** The system MUST display interactive career roadmap cards for: Full Stack Developer, Frontend Developer, Backend Developer, Data Analyst, Data Scientist, AI Engineer, UI/UX Designer, and Digital Marketer.
- **2.4.2** Each roadmap card MUST display required skills, learning roadmap steps, job opportunities, and salary insights.
- **2.4.3** The system MUST expand roadmap details on hover or click.

#### 2.5 Featured Courses
- **2.5.1** The system MUST display a featured courses section with three tabs: Popular, Recommended, and Trending.
- **2.5.2** The system MUST show at least 4 course cards per tab.
- **2.5.3** Each course card MUST display thumbnail, title, instructor name, rating, and enrollment count.

#### 2.6 Student Success Stories
- **2.6.1** The system MUST display a testimonial carousel with student success stories.
- **2.6.2** Each story MUST include student name, photo, placement company, and testimonial text.

#### 2.7 Innovation Hub
- **2.7.1** The system MUST display a three-column grid covering AI Innovations, Research Trends, and Emerging Technologies.

#### 2.8 Footer
- **2.8.1** The system MUST display a professional footer with quick navigation links, social media links, and a newsletter subscription form.
- **2.8.2** The newsletter form MUST capture and store email addresses.

---

### 3. Course Management

#### 3.1 Course Creation (Teacher)
- **3.1.1** The system MUST allow teachers to create a course with title, description, short description, category, level, price, thumbnail, tags, requirements, and outcomes.
- **3.1.2** The system MUST save new courses with `status: 'draft'` by default.
- **3.1.3** The system MUST allow teachers to publish a draft course, changing its status to `'published'`.
- **3.1.4** The system MUST allow teachers to archive a published course.
- **3.1.5** The system MUST allow teachers to soft-delete a course (not permanently remove it).
- **3.1.6** The system MUST generate a unique URL-friendly slug from the course title.

#### 3.2 Chapter & Lesson Management
- **3.2.1** The system MUST allow teachers to add, edit, reorder, and delete chapters within a course.
- **3.2.2** The system MUST allow teachers to add lessons of types: video, PDF, text, quiz, or assignment.
- **3.2.3** The system MUST allow teachers to upload video files and PDFs to Cloudinary.
- **3.2.4** The system MUST allow teachers to mark individual lessons as free preview.
- **3.2.5** The system MUST allow teachers to lock chapters until prerequisites are completed.
- **3.2.6** The system MUST automatically update `totalDuration` and `totalLessons` on the course when lessons change.

#### 3.3 Course Discovery & Enrollment
- **3.3.1** The system MUST provide a searchable, filterable course listing page with pagination (20 items per page).
- **3.3.2** The system MUST support filtering by category, level, price range, and rating.
- **3.3.3** The system MUST support full-text search on course title and description.
- **3.3.4** The system MUST allow students to enroll in a published course.
- **3.3.5** The system MUST prevent duplicate enrollments (one enrollment record per student-course pair).
- **3.3.6** The system MUST increment the course `enrollmentCount` atomically on enrollment.
- **3.3.7** The system MUST send an enrollment confirmation notification to the student.

#### 3.4 Course Progress Tracking
- **3.4.1** The system MUST track lesson completion per student.
- **3.4.2** The system MUST require at least 80% watch time for a video lesson to be marked complete.
- **3.4.3** The system MUST recalculate and update the enrollment progress percentage after each lesson completion.
- **3.4.4** The system MUST ensure course progress is monotonically non-decreasing (never goes backwards).
- **3.4.5** The system MUST trigger certificate generation automatically when progress reaches 100%.

#### 3.5 Course Rating
- **3.5.1** The system MUST allow enrolled students to rate a course (1–5 stars).
- **3.5.2** The system MUST update the course average rating and count after each new rating.

---

### 4. Quiz & Assessment System

#### 4.1 Quiz Creation
- **4.1.1** The system MUST allow teachers to create quizzes with a title, description, and configurable settings.
- **4.1.2** The system MUST support question types: MCQ, True/False, Subjective, and Fill-in-the-Blank.
- **4.1.3** The system MUST allow teachers to set a time limit (0 = unlimited), passing score percentage, max attempts, and whether to shuffle questions and options.
- **4.1.4** The system MUST allow teachers to assign an XP reward value to each quiz.
- **4.1.5** The system MUST allow teachers to set question difficulty: easy, medium, or hard.

#### 4.2 Quiz Attempt
- **4.2.1** The system MUST allow enrolled students to start a quiz attempt.
- **4.2.2** The system MUST enforce the time limit and auto-submit the attempt when time expires.
- **4.2.3** The system MUST allow students to submit individual answers before final submission.
- **4.2.4** The system MUST enforce the maximum attempts limit per student per quiz.
- **4.2.5** The system MUST record the start time and submission time of each attempt.

#### 4.3 Quiz Evaluation
- **4.3.1** The system MUST auto-evaluate MCQ, True/False, and Fill-in-the-Blank questions immediately on submission.
- **4.3.2** The system MUST use AI-assisted evaluation for subjective questions.
- **4.3.3** The system MUST calculate a score, percentage, and pass/fail result for each attempt.
- **4.3.4** The system MUST ensure quiz percentage is always within the range [0, 100].
- **4.3.5** The system MUST award XP to the student if the quiz is passed.
- **4.3.6** The system MUST return a detailed per-question result breakdown to the student.

#### 4.4 Quiz Analytics & Leaderboard
- **4.4.1** The system MUST provide a leaderboard for each quiz ranked by score and time taken.
- **4.4.2** The system MUST provide teachers with quiz analytics including average score, pass rate, and per-question difficulty analysis.

---

### 5. Assignment System

#### 5.1 Assignment Creation
- **5.1.1** The system MUST allow teachers to create assignments with a title, description, due date, and maximum marks.
- **5.1.2** The system MUST allow teachers to attach reference files to assignments.

#### 5.2 Assignment Submission
- **5.2.1** The system MUST allow students to upload assignment submissions (PDF, DOCX, ZIP).
- **5.2.2** The system MUST record the submission timestamp.
- **5.2.3** The system MUST track submission status: pending, submitted, graded.
- **5.2.4** The system MUST send assignment deadline reminder notifications 24 hours before the due date.

#### 5.3 Assignment Evaluation
- **5.3.1** The system MUST allow teachers to grade submissions with a numeric score and written feedback.
- **5.3.2** The system MUST notify students when their assignment has been graded.
- **5.3.3** The system MUST award XP to students upon assignment submission.

---

### 6. Certificate System

#### 6.1 Certificate Generation
- **6.1.1** The system MUST automatically generate a certificate when a student's course progress reaches 100%.
- **6.1.2** The system MUST only generate certificates for courses with the `certificate: true` flag.
- **6.1.3** The system MUST ensure at most one certificate is issued per student-course pair.
- **6.1.4** The system MUST generate a unique UUID v4 certificate ID for each certificate.
- **6.1.5** The system MUST render the certificate as a PDF including student name, course name, instructor name, and issue date.
- **6.1.6** The system MUST upload the generated PDF to Cloudinary and store the URL.

#### 6.2 Certificate Verification
- **6.2.1** The system MUST embed a QR code in each certificate linking to a public verification page at `/verify/{certificateId}`.
- **6.2.2** The system MUST provide a public endpoint to verify certificate authenticity by ID.
- **6.2.3** The system MUST allow students to download their certificate PDF at any time.
- **6.2.4** The system MUST send the certificate to the student's email upon generation.

---

### 7. AI Features

#### 7.1 AI Course Generator
- **7.1.1** The system MUST allow teachers to upload a PDF, DOCX, or PPTX file to trigger AI course generation.
- **7.1.2** The system MUST extract text from the uploaded file before sending to the AI service.
- **7.1.3** The system MUST reject files that are not PDF, DOCX, or PPTX with a `400 Bad Request` error.
- **7.1.4** The system MUST chunk extracted text into segments of at most 4,000 tokens for AI processing.
- **7.1.5** The AI MUST generate a course structure with chapters, each containing: summary, notes, flashcards, MCQs, and assignments.
- **7.1.6** The system MUST save the generated course with `status: 'draft'` and `aiGenerated: true`.
- **7.1.7** The system MUST log AI usage per teacher for rate limiting purposes.

#### 7.2 Smart AI Tutor
- **7.2.1** The system MUST allow enrolled students to ask questions to the AI Tutor within a course context.
- **7.2.2** The AI Tutor MUST return a structured response including: answer, examples, related topics, and follow-up questions.
- **7.2.3** The system MUST maintain conversation history (last 10 messages) as context for each session.
- **7.2.4** The system MUST persist conversation history to the database.
- **7.2.5** The system MUST enforce a daily AI query limit: 50 queries/day for free users, 200 queries/day for premium users.
- **7.2.6** The system MUST cache AI responses in Redis for 1 hour when the same question is asked in the same course context.
- **7.2.7** Questions MUST be limited to a maximum of 2,000 characters.

#### 7.3 Personalized Learning Path Generator
- **7.3.1** The system MUST allow students to generate a personalized learning path by providing: goal, current skill level, available hours per day (0.5–12), and duration in weeks (1–52).
- **7.3.2** The system MUST analyze the student's existing skills and completed courses before generating the path.
- **7.3.3** The AI MUST identify the skill gap between the student's current state and their goal.
- **7.3.4** The system MUST recommend relevant published courses from the platform to fill the skill gap.
- **7.3.5** The system MUST generate a weekly plan that does not exceed the student's total available hours.
- **7.3.6** The system MUST generate monthly milestones and an estimated completion date.
- **7.3.7** The system MUST save the learning path to the database and allow students to track progress against it.

#### 7.4 AI Interview Simulator
- **7.4.1** The system MUST support mock interviews for roles: Full Stack Developer, Frontend Developer, Data Analyst, Marketing Executive, and HR.
- **7.4.2** The system MUST support interview types: technical, HR, behavioral, and system design.
- **7.4.3** The system MUST present questions one at a time with a per-question timer.
- **7.4.4** The system MUST support both text and voice input for answers.
- **7.4.5** The AI MUST evaluate each answer and provide a score, confidence rating, and clarity rating.
- **7.4.6** The system MUST generate an overall interview score, strengths list, and improvement suggestions at the end of the session.
- **7.4.7** The system MUST store completed interview session reports for the student to review later.
- **7.4.8** The system MUST award XP to students upon completing an interview session.

#### 7.5 AI Resume Analyzer
- **7.5.1** The system MUST allow students to upload a resume (PDF or DOCX) for AI analysis.
- **7.5.2** The AI MUST generate an ATS compatibility score (0–100).
- **7.5.3** The AI MUST identify skills found in the resume and skills that are missing for the target role.
- **7.5.4** The AI MUST provide keyword suggestions to improve ATS ranking.
- **7.5.5** The AI MUST provide section-by-section feedback on the resume.
- **7.5.6** The system MUST store the analysis result linked to the student's account.

#### 7.6 Performance Prediction
- **7.6.1** The system MUST analyze a student's quiz scores, assignment submission rate, attendance, learning consistency, and streak to predict performance.
- **7.6.2** The system MUST calculate a success probability score (0–100%) using a weighted model.
- **7.6.3** The system MUST classify students into risk levels: low, medium, or high risk.
- **7.6.4** The AI MUST identify weak areas and generate a personalized improvement plan.
- **7.6.5** The system MUST make predictions available to both the student and their enrolled course teachers.

#### 7.7 Project Idea Generator
- **7.7.1** The system MUST allow students to select a domain and skill level to generate project ideas.
- **7.7.2** The AI MUST generate a project title, description, feature list, recommended tech stack, and high-level architecture for each idea.
- **7.7.3** The system MUST generate at least 3 project ideas per request.

---

### 8. Gamification System

#### 8.1 XP & Levels
- **8.1.1** The system MUST award XP for the following actions: lesson complete (10 XP), quiz pass (25 XP), assignment submit (15 XP), streak maintain (5 XP), course complete (100 XP), community post (5 XP), interview practice (20 XP).
- **8.1.2** The system MUST apply a 1.2× XP multiplier for students with a 3–6 day streak.
- **8.1.3** The system MUST apply a 1.5× XP multiplier for students with a 7+ day streak.
- **8.1.4** The system MUST maintain 10 level thresholds: [0, 100, 250, 500, 1000, 2000, 4000, 8000, 15000, 30000] XP.
- **8.1.5** The system MUST ensure a user's level is always consistent with their total XP.
- **8.1.6** The system MUST ensure XP is always non-negative.

#### 8.2 Badges
- **8.2.1** The system MUST check badge eligibility after every level-up.
- **8.2.2** The system MUST notify students when they earn a new badge.
- **8.2.3** The system MUST display earned badges on the student's profile.

#### 8.3 Streaks
- **8.3.1** The system MUST track daily learning streaks per student.
- **8.3.2** The system MUST increment the streak counter when a student completes at least one learning activity per day.
- **8.3.3** The system MUST reset the streak to 0 if a student misses a day.
- **8.3.4** The system MUST display the current streak prominently on the student dashboard.

#### 8.4 Leaderboards
- **8.4.1** The system MUST provide global, course-level, and weekly leaderboards.
- **8.4.2** The system MUST cache leaderboard data in Redis with a 1-minute TTL.
- **8.4.3** The system MUST display each student's rank, name, avatar, XP, and level on the leaderboard.

---

### 9. Placement Hub

#### 9.1 Resume Builder
- **9.1.1** The system MUST provide a structured resume builder with sections for personal info, education, experience, skills, projects, and certifications.
- **9.1.2** The system MUST allow students to export their built resume as a PDF.

#### 9.2 Mock Interviews & GD Topics
- **9.2.1** The system MUST provide a curated list of Group Discussion (GD) topics.
- **9.2.2** The system MUST provide aptitude tests by category (quantitative, logical, verbal).
- **9.2.3** The system MUST provide company-specific preparation kits with common interview questions and tips.

#### 9.3 Aptitude Tests
- **9.3.1** The system MUST provide timed aptitude tests with auto-evaluation.
- **9.3.2** The system MUST display the student's score and correct answers after submission.

---

### 10. Community Hub

#### 10.1 Discussion Forum
- **10.1.1** The system MUST allow any authenticated user to create a discussion post with a title and body.
- **10.1.2** The system MUST allow users to reply to posts with threaded comments.
- **10.1.3** The system MUST allow users to upvote posts and replies.
- **10.1.4** The system MUST display posts sorted by recency and by upvote count.
- **10.1.5** The system MUST award XP to students for creating community posts.
- **10.1.6** The system MUST allow admins to moderate (delete) posts and comments.

---

### 11. Attendance System

#### 11.1 QR Attendance
- **11.1.1** The system MUST allow teachers to generate a time-limited QR code for a class session.
- **11.1.2** The system MUST allow students to mark attendance by scanning the QR code.
- **11.1.3** The system MUST record the timestamp of each attendance mark.
- **11.1.4** The system MUST prevent duplicate attendance marks for the same session.

#### 11.2 Attendance Analytics
- **11.2.1** The system MUST display per-student attendance percentage per course.
- **11.2.2** The system MUST allow teachers to export attendance reports.
- **11.2.3** The system MUST include attendance rate as an input to the performance prediction model.

---

### 12. Notification System

#### 12.1 In-App Notifications
- **12.1.1** The system MUST deliver in-app notifications for: assignment due reminders, quiz results, badge earned, course updates, and admin announcements.
- **12.1.2** The system MUST allow users to mark individual notifications as read.
- **12.1.3** The system MUST allow users to mark all notifications as read at once.
- **12.1.4** The system MUST display an unread notification count badge in the navbar.
- **12.1.5** The system MUST auto-expire notification records after 90 days using a MongoDB TTL index.

#### 12.2 Email Notifications
- **12.2.1** The system MUST send email notifications for: email verification, password reset, enrollment confirmation, certificate issuance, and assignment grading.
- **12.2.2** The system MUST send assignment deadline reminder emails 24 hours before the due date via a background cron job.
- **12.2.3** Email sending MUST be handled asynchronously via a background job to avoid blocking API responses.

---

### 13. Analytics

#### 13.1 Student Analytics
- **13.1.1** The system MUST record a daily analytics snapshot per student including: learning time (minutes), lessons completed, quizzes taken, average quiz score, XP earned, and login count.
- **13.1.2** The system MUST display a student's learning progress over time as a chart on their dashboard.
- **13.1.3** The system MUST display a weekly learning time heatmap calendar on the student dashboard.
- **13.1.4** The system MUST display quiz performance trends on the student dashboard.

#### 13.2 Teacher Analytics
- **13.2.1** The system MUST provide teachers with per-course analytics: total enrollments, active students, average completion rate, and average quiz score.
- **13.2.2** The system MUST display student engagement metrics per course for teachers.

#### 13.3 Admin Analytics
- **13.3.1** The system MUST provide admins with platform-wide analytics: total users, new user growth, total courses, total enrollments, and revenue.
- **13.3.2** The system MUST display platform usage trends over time on the admin dashboard.
- **13.3.3** The system MUST allow admins to export analytics reports.

---

### 14. Admin Dashboard

#### 14.1 User Management
- **14.1.1** The system MUST allow admins to view, search, and filter all users.
- **14.1.2** The system MUST allow admins to change a user's role.
- **14.1.3** The system MUST allow admins to deactivate or delete a user account.

#### 14.2 Course Management
- **14.2.1** The system MUST allow admins to view all courses regardless of status.
- **14.2.2** The system MUST allow admins to change a course's status (publish, archive, or unpublish).
- **14.2.3** The system MUST allow admins to delete any course.

#### 14.3 News Management
- **14.3.1** The system MUST allow admins to manually create, edit, and delete news articles.
- **14.3.2** The system MUST allow admins to assign news articles to categories.

#### 14.4 Category Management
- **14.4.1** The system MUST allow admins to create, edit, and delete course categories.

#### 14.5 Reports
- **14.5.1** The system MUST allow admins to generate and download platform reports in CSV format.

---

### 15. UI/UX & Design System

#### 15.1 Visual Design
- **15.1.1** The system MUST implement a glassmorphism design style with frosted-glass card effects.
- **15.1.2** The system MUST use gradient backgrounds throughout the platform.
- **15.1.3** The system MUST implement smooth Framer Motion animations on page transitions, card hovers, and modal entrances.
- **15.1.4** The system MUST support dark mode and light mode, persisted to the user's profile.
- **15.1.5** The system MUST be fully responsive across mobile, tablet, and desktop breakpoints.
- **15.1.6** The platform MUST use modern typography with clear visual hierarchy.

#### 15.2 Component Standards
- **15.2.1** The system MUST use a reusable component library including: Button, Card, Modal, Input, Badge, Avatar, Skeleton loader, and Toast notification.
- **15.2.2** All interactive elements MUST have hover and focus states.
- **15.2.3** All loading states MUST display skeleton loaders rather than blank screens.
- **15.2.4** All forms MUST display inline validation errors.

---

### 16. API & Backend Standards

#### 16.1 API Design
- **16.1.1** All API endpoints MUST follow RESTful conventions under the base path `/api/v1`.
- **16.1.2** All API responses MUST use a consistent JSON envelope: `{ success, data, message, error }`.
- **16.1.3** All list endpoints MUST support cursor-based pagination with a default page size of 20.
- **16.1.4** All request bodies MUST be validated using Zod schemas before reaching controllers.
- **16.1.5** The system MUST return appropriate HTTP status codes: 200, 201, 400, 401, 403, 404, 409, 422, 429, 500, 503.

#### 16.2 Security
- **16.2.1** The system MUST apply Helmet.js security headers to all responses.
- **16.2.2** The system MUST enforce CORS with a strict origin whitelist.
- **16.2.3** The system MUST apply Redis-backed rate limiting on all auth endpoints.
- **16.2.4** The system MUST validate MIME types and enforce file size limits on all uploads (50 MB for video, 10 MB for documents).
- **16.2.5** The system MUST never log or expose secret values (tokens, passwords, API keys) in responses or logs.
- **16.2.6** The system MUST use parameterized queries via Mongoose to prevent NoSQL injection.

#### 16.3 Error Handling
- **16.3.1** The system MUST return `503 Service Unavailable` with a `Retry-After` header when the AI service is unavailable.
- **16.3.2** The system MUST implement Mongoose auto-reconnect with exponential backoff on database connection loss.
- **16.3.3** The system MUST return `409 Conflict` on concurrent duplicate enrollment attempts.
- **16.3.4** The system MUST auto-submit a quiz attempt with answers provided so far when the time limit expires.
- **16.3.5** All unhandled errors MUST be caught by a global error handler middleware and logged via Winston.

---

### 17. Performance & Scalability

- **17.1** The system MUST apply compound MongoDB indexes on `{userId, courseId}` for enrollment queries.
- **17.2** The system MUST apply a text index on course `title` and `description` for full-text search.
- **17.3** The system MUST cache course listing results in Redis with a 5-minute TTL.
- **17.4** The system MUST cache AI tutor responses in Redis with a 1-hour TTL.
- **17.5** The system MUST run analytics snapshots, email sending, and news feed refresh as background cron jobs.
- **17.6** The system MUST use Cloudinary's adaptive bitrate streaming for video lessons.
- **17.7** The system MUST use Cloudinary auto-transforms for responsive image delivery.
- **17.8** The system MUST process AI course generation requests sequentially with Server-Sent Events (SSE) progress updates to the teacher.

---

## Glossary

| Term | Definition |
|------|------------|
| **ATS** | Applicant Tracking System — software used by employers to filter resumes by keyword matching |
| **XP** | Experience Points — a numeric score awarded to students for completing learning activities |
| **Level** | A rank derived from a student's total XP, progressing through 10 thresholds |
| **Streak** | A consecutive-day counter that increments when a student completes at least one learning activity per day |
| **Badge** | A visual achievement award unlocked by reaching specific milestones (e.g., level-up, course completion) |
| **Enrollment** | A record linking a student to a course, tracking their progress and status |
| **LessonProgress** | A record tracking whether a specific lesson has been completed by a specific student |
| **Draft** | A course status indicating it is not yet visible to students |
| **Published** | A course status indicating it is visible and enrollable by students |
| **Archived** | A course status indicating it is hidden from discovery but accessible to existing enrollees |
| **Soft-delete** | Marking a record as deleted without removing it from the database |
| **JWT** | JSON Web Token — a signed token used for stateless authentication |
| **Refresh Token** | A long-lived token used to obtain a new access token without re-authentication |
| **Glassmorphism** | A UI design style using frosted-glass translucency, blur effects, and subtle borders |
| **SSE** | Server-Sent Events — a one-way server-to-client streaming protocol used for progress updates |
| **TTL Index** | A MongoDB index that automatically deletes documents after a specified time period |
| **Cursor-based Pagination** | A pagination strategy using a document ID as a cursor rather than page numbers, for consistent results |
| **AI Router** | An internal service that abstracts Gemini and OpenAI behind a unified interface with fallback logic |
| **Placement Hub** | The section of the platform dedicated to career preparation: resume builder, mock interviews, aptitude tests, and company prep |
| **GD Topic** | Group Discussion topic — a subject used in placement preparation for practicing verbal communication |
| **Performance Prediction** | An AI-driven feature that estimates a student's likelihood of course success based on behavioral metrics |
| **Learning Path** | A personalized, AI-generated study plan with daily/weekly schedules and course recommendations |
| **Course Context** | The combination of course ID, chapter ID, and conversation history passed to the AI Tutor for contextual responses |
