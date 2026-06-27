# Requirements Document

## Introduction

CourseMate 2.0 is a major production-level upgrade to the existing MERN-stack Learning Management System. The existing platform already supports authentication, courses, quizzes, assignments, certificates, gamification, notifications, an AI tutor, placement hub, community, and an admin dashboard. This upgrade transforms the product across ten phases: a full UI/UX redesign with a professional light theme and design system, LinkedIn-style student profiles, an ATS resume analyzer, a LeetCode-style coding playground, an AI career mentor, a project showcase platform, advanced predictive analytics, a redesigned public homepage, performance optimizations to achieve Lighthouse scores above 90, and a comprehensive admin super dashboard. The goal is to elevate CourseMate from a functional LMS into a complete student success platform that supports learning, building, and career placement.

---

## Glossary

- **Design_System**: The unified set of Tailwind CSS tokens, React component library, and Framer Motion animation presets used across the application.
- **Theme_Engine**: The module responsible for applying and persisting the application color theme (light by default).
- **Student_Profile**: The extended profile document for students, covering professional headline, experience, skills, projects, and achievements.
- **Profile_Strength_Calculator**: The algorithm that computes a 0–100 completeness score for a Student_Profile.
- **ATS_Analyzer**: The backend service that parses a resume file and a job description, then produces ATS metrics and AI-generated suggestions.
- **ResumeAnalysis**: The MongoDB document storing the output of one ATS_Analyzer run for a student.
- **Coding_Playground**: The in-browser IDE and code execution environment backed by Judge0 API.
- **Problem**: A coding challenge document including description, constraints, examples, test cases, and category tags.
- **Submission**: A student's code submission against a Problem, storing code, language, verdict, and execution metrics.
- **AI_Career_Mentor**: The AI service that takes a student's full profile and produces career path recommendations, skill gap analyses, and roadmaps.
- **Career_Readiness_Score**: A composite 0–100 score representing a student's overall job-readiness.
- **Project_Showcase**: The platform feature where students publish and discover projects.
- **ShowcaseProject**: A document representing a published project with metadata, media, reactions, and comments.
- **Analytics_Engine**: The backend service that computes learning consistency, engagement, and predictive scores.
- **Admin_Dashboard**: The super dashboard available only to users with the `admin` role.
- **Lighthouse_Score**: The score produced by Google Lighthouse across Performance, Accessibility, and SEO categories.
- **Judge0**: The third-party open-source code execution API used by the Coding_Playground.
- **Monaco_Editor**: The browser-based code editor (used in VS Code) integrated into the Coding_Playground.
- **Framer_Motion**: The React animation library used for transitions and micro-interactions.
- **Virtual_List**: A rendering technique that only mounts DOM nodes for visible list items.

---

## Requirements

### Requirement 1: Design System and Theme Migration

**User Story:** As a student, I want a clean, professional light-themed interface so that the platform feels modern and trustworthy compared to the current dark glassmorphism design.

#### Acceptance Criteria

1. THE Design_System SHALL define a primary color of `#2563EB`, a background color of `#FFFFFF`, a secondary background color of `#F8FAFC`, and a primary text color of `#0F172A` as CSS custom properties and Tailwind tokens.
2. THE Theme_Engine SHALL apply the light theme as the default theme for all unauthenticated and newly registered users.
3. THE Design_System SHALL export the following reusable React components: Button (with primary, secondary, ghost, and destructive variants), Input (with label, helper text, and error state), Card, Modal, Drawer, Tabs, Badge (with color variants), Tooltip, Progress (linear and circular), Avatar (with fallback initials), EmptyState, and LoadingState (skeleton and spinner variants).
4. WHEN a Design_System component is rendered, THE component SHALL conform to WCAG 2.1 AA color contrast requirements using the defined color tokens.
5. THE Design_System SHALL apply Framer_Motion page transition animations with a fade-and-slide pattern whenever the route changes.
6. THE Design_System SHALL apply Framer_Motion section reveal animations (fade-in from below) when a section enters the viewport for the first time.
7. THE Design_System SHALL apply Framer_Motion counter animations that animate numeric values from zero to their final value when a statistics section enters the viewport.
8. THE Design_System SHALL apply Framer_Motion staggered list animations so that list items animate in sequentially with a 50ms delay between each item.
9. THE Design_System SHALL implement a mobile-first responsive grid such that all pages are fully functional and visually correct at viewport widths of 320px, 768px, 1024px, and 1440px.
10. WHEN a user resizes the browser window, THE Design_System SHALL reflow layouts without horizontal scroll at any width above 320px.
11. IF a Design_System component receives invalid or missing required props, THEN THE component SHALL render a graceful fallback without throwing an unhandled JavaScript error.

---

### Requirement 2: LinkedIn-Style Student Profile

**User Story:** As a student, I want a rich professional profile page so that I can showcase my skills, experience, and projects to recruiters and the community.

#### Acceptance Criteria

1. THE Student_Profile model SHALL extend the existing User document with the following fields: `profilePhoto` (URL string), `bannerImage` (URL string), `fullName` (string, max 100 chars), `headline` (string, max 220 chars), `summary` (string, max 2000 chars), `location` (string), `experience` (array of objects with `title`, `company`, `startDate`, `endDate`, `current` boolean, `description`), `education` (array of objects with `institution`, `degree`, `field`, `startYear`, `endYear`), `technicalSkills` (array of strings), `softSkills` (array of strings), `projects` (array of objects with `title`, `description`, `techStack`, `githubUrl`, `liveUrl`, `coverImage`), `achievements` (array of objects with `type` enum of `certificate|hackathon|award`, `title`, `issuer`, `date`, `url`), and `socialLinks` extended with `leetcode` and `twitter` in addition to the existing `linkedin`, `github`, and `portfolio` fields.
2. THE Profile_Strength_Calculator SHALL compute a profile completeness score between 0 and 100 based on weighted criteria: photo (10 pts), headline (10 pts), summary (15 pts), at least one experience entry (15 pts), at least one education entry (10 pts), at least three technical skills (10 pts), at least one project (15 pts), at least one achievement (10 pts), and at least one social link (5 pts).
3. WHEN a student views their own profile, THE Student_Profile page SHALL display the Profile_Strength_Calculator score as a circular progress indicator with a label describing the next recommended action to increase the score.
4. WHEN a student updates any profile field, THE Profile_Strength_Calculator SHALL recompute the score and update the display without a full page reload.
5. THE Student_Profile page SHALL render a banner image area at the top, an avatar overlapping the banner, the student's fullName, headline, location, and social link icons below the avatar.
6. THE Student_Profile page SHALL render a tabbed layout with tabs: About, Experience, Education, Skills, Projects, Achievements.
7. THE Student_Profile page SHALL render the Experience and Education sections as a vertical timeline with company/institution logos, date ranges, and descriptions.
8. THE Student_Profile page SHALL render the Projects section as a responsive grid of project cards, each showing the cover image, title, tech stack badges, and links to GitHub and live demo.
9. WHEN a recruiter or peer visits another student's profile URL, THE Student_Profile page SHALL display the public profile view without editable controls.
10. THE Student_Profile page SHALL display a "Download Resume" button that generates a single-page PDF of the student's profile data.
11. IF a student attempts to save a headline longer than 220 characters, THEN THE Student_Profile SHALL reject the input and display a validation error message.
12. WHEN a student uploads a profile photo or banner image, THE system SHALL accept JPEG, PNG, and WebP formats up to 5MB and store the image via the existing Cloudinary integration.

---

### Requirement 3: ATS Resume Analyzer

**User Story:** As a student, I want to analyze my resume against a job description so that I can understand how well it will pass Applicant Tracking Systems and get actionable improvement suggestions.

#### Acceptance Criteria

1. THE ATS_Analyzer page SHALL accept a resume file upload in PDF or DOCX format with a maximum size of 10MB.
2. THE ATS_Analyzer page SHALL provide a text area for the student to paste a job description.
3. WHEN a student submits a resume and job description, THE ATS_Analyzer SHALL compute and return: an overall ATS Score (0–100), a Keyword Match percentage (0–100), a list of Matched Keywords, a list of Missing Keywords, a Skills Match percentage (0–100), and a Formatting Score (0–100).
4. WHEN analysis is complete, THE ATS_Analyzer SHALL display an AI-generated resume summary, a list of at least three improvement suggestions, and optional section-level rewrite suggestions.
5. THE ResumeAnalysis model SHALL persist each analysis result with fields: `studentId`, `resumeUrl`, `jobDescription` (hashed, not stored in full), `atsScore`, `keywordMatchPct`, `matchedKeywords`, `missingKeywords`, `skillsMatchPct`, `formattingScore`, `aiSummary`, `suggestions`, `createdAt`.
6. THE ATS_Analyzer history page SHALL list all past ResumeAnalysis records for the student, sorted by `createdAt` descending, showing date, ATS Score, and job title extracted from the job description.
7. WHEN a student selects two past ResumeAnalysis records, THE ATS_Analyzer SHALL display a side-by-side comparison view showing score deltas for each metric.
8. THE ATS_Analyzer SHALL provide a "Export Report" button that generates and downloads a PDF containing all metrics and AI suggestions for the selected analysis.
9. IF a student uploads a file that is not PDF or DOCX, THEN THE ATS_Analyzer SHALL reject the file and display a validation error without calling the AI service.
10. IF the AI service is unavailable or returns an error, THEN THE ATS_Analyzer SHALL display a user-friendly error message and retain the uploaded file so the student can retry.
11. WHEN THE ATS_Analyzer is computing results, THE system SHALL display a progress indicator and disable the submit button to prevent duplicate submissions.

---

### Requirement 4: Coding Playground

**User Story:** As a student, I want a browser-based coding environment with real problems and automated test execution so that I can practice and improve my data structures and algorithms skills.

#### Acceptance Criteria

1. THE Coding_Playground SHALL embed Monaco_Editor as the primary code editor with syntax highlighting for C, C++, Java, Python, and JavaScript.
2. WHEN a student selects a language from the language selector, THE Monaco_Editor SHALL switch the syntax highlighting mode and populate the editor with the language-specific starter code for the current Problem.
3. WHEN a student clicks "Run", THE Coding_Playground SHALL submit the code and visible test cases to the Judge0 API and display the output, status, execution time (ms), and memory used (KB) for each test case.
4. WHEN a student clicks "Submit", THE Coding_Playground SHALL run the code against all hidden test cases via the Judge0 API and return a verdict of Accepted, Wrong Answer, Time Limit Exceeded, Memory Limit Exceeded, Runtime Error, or Compilation Error.
5. THE Problem model SHALL store: `title`, `description` (Markdown), `difficulty` (Easy/Medium/Hard), `constraints`, `examples` (array of input/output/explanation), `starterCode` (map of language to code string), `testCases` (visible, array of input/expected output), `hiddenTestCases` (hidden, array of input/expected output), `categories` (array of strings from the allowed category list), `timeLimit` (ms), `memoryLimit` (KB), `acceptanceRate`, and `totalSubmissions`.
6. THE Coding_Playground SHALL support problems categorized as: Arrays, Strings, Trees, Graphs, Dynamic Programming, Greedy, and Recursion. A problem MAY belong to more than one category.
7. THE Coding_Playground problems list page SHALL support filtering by difficulty, category, and status (Solved, Attempted, Unsolved), and full-text search by problem title.
8. THE Submission model SHALL store: `studentId`, `problemId`, `code`, `language`, `verdict`, `executionTime`, `memoryUsed`, `testsPassed`, `totalTests`, and `submittedAt`.
9. THE Coding_Playground SHALL display a submission history list for each problem showing verdict, language, execution time, and date for the authenticated student.
10. THE Coding_Playground SHALL display a global leaderboard ranked by number of problems solved, with ties broken by total accepted submission count and then by earliest solve date.
11. THE Coding_Playground SHALL feature a Daily Challenge that surfaces one problem per calendar day, tracks completion, and awards 50 XP on first successful submission.
12. THE Coding_Playground SHALL feature a Weekly Contest with a fixed start and end time, a countdown timer, and a contest-specific leaderboard ranked by problems solved and then by penalty time.
13. THE Coding_Playground SHALL display a Coding Statistics page for the authenticated student showing: total problems solved by difficulty, a monthly submission activity heatmap (GitHub-style), and accepted vs. rejected submission ratio.
14. WHEN a student submits code and receives a verdict, THE Coding_Playground SHALL offer an "AI Code Review" option that calls the AI service and returns: estimated time complexity, estimated space complexity, a readability assessment, and at least two optimization suggestions.
15. IF the Judge0 API returns an error or times out after 10 seconds, THEN THE Coding_Playground SHALL display an error message and allow the student to resubmit without losing their code.
16. WHILE a code submission is being evaluated, THE Coding_Playground SHALL display a loading indicator on the Run/Submit button and prevent duplicate submissions.

---

### Requirement 5: AI Career Mentor

**User Story:** As a student, I want an AI-powered career mentor that analyses my complete profile and recommends personalised career paths and actionable roadmaps so that I know exactly what to do next to get hired.

#### Acceptance Criteria

1. THE AI_Career_Mentor SHALL accept as input: the student's Student_Profile, most recent ResumeAnalysis record, completed course list with grades, earned certificates, Coding_Playground statistics, and learning analytics scores.
2. THE AI_Career_Mentor SHALL generate career path recommendations for at least the following roles: Full Stack Developer, Frontend Developer, Backend Developer, AI/ML Engineer, Data Analyst, DevOps Engineer, and Product Manager.
3. FOR each recommended career path, THE AI_Career_Mentor SHALL produce: a match percentage (0–100) based on the student's current skills, a list of skill gaps (skills required for the role that the student lacks), and a prioritised list of recommended courses, certifications, and projects to close each gap.
4. THE AI_Career_Mentor SHALL compute a Career_Readiness_Score (0–100) and a Placement_Readiness_Score (0–100) and display them as prominent metrics on the mentor page.
5. THE AI_Career_Mentor SHALL generate a 30/60/90 day learning roadmap for the student's highest-matched career path, with each phase listing specific weekly tasks.
6. WHEN a student selects a career path from the recommendations list, THE AI_Career_Mentor SHALL display the full skill gap analysis and roadmap for that path without navigating away from the page.
7. WHEN a student's profile data changes (new course completed, new certificate earned, coding stats updated), THE AI_Career_Mentor SHALL flag the existing recommendations as stale and prompt the student to regenerate.
8. THE AI_Career_Mentor SHALL persist the most recent generated output per student in a `CareerMentorSnapshot` document containing `studentId`, `generatedAt`, `careerPaths`, `careerReadinessScore`, `placementReadinessScore`, and `roadmap`.
9. IF the AI service fails to return a response within 30 seconds, THEN THE AI_Career_Mentor SHALL display a timeout error and retain the last cached snapshot if one exists.
10. THE AI_Career_Mentor page SHALL display a "Last updated" timestamp so students know when the recommendations were generated.

---

### Requirement 6: Project Showcase Platform

**User Story:** As a student, I want to publish my projects and discover peers' work so that I can build a public portfolio and get inspired by the community.

#### Acceptance Criteria

1. THE Project_Showcase platform SHALL allow an authenticated student to create a ShowcaseProject with: `title` (required, max 100 chars), `description` (required, Markdown, max 2000 chars), `coverImage` (required, uploaded via Cloudinary), `additionalImages` (up to 5 images), `techStack` (required, array of strings, min 1), `githubUrl` (optional, valid URL), `liveDemoUrl` (optional, valid URL), `tags` (optional, max 10), and `visibility` (public or private).
2. WHEN a student publishes a ShowcaseProject, THE Project_Showcase SHALL make the project discoverable on the public Showcase feed immediately.
3. THE Project_Showcase feed SHALL support filtering by techStack, tags, and sorting by: Most Recent, Most Liked, Trending (likes + comments in the last 7 days).
4. WHEN an authenticated user clicks the like button on a ShowcaseProject, THE system SHALL increment the like count by 1 and record the user's `userId` to prevent duplicate likes from the same user.
5. IF an authenticated user has already liked a ShowcaseProject and clicks the like button again, THEN THE system SHALL remove the like (toggle off) and decrement the like count by 1.
6. THE Project_Showcase SHALL allow authenticated users to post plain-text comments (max 1000 chars) on any public ShowcaseProject, and display comments in chronological order.
7. THE Project_Showcase SHALL allow authenticated users to bookmark a ShowcaseProject, and the student SHALL be able to view all bookmarked projects on a "Saved Projects" page.
8. THE Project_Showcase SHALL provide a share button that copies the project's canonical URL to the clipboard.
9. THE Project_Showcase SHALL display a "Trending Projects" section on the main showcase page, listing the top 10 projects by engagement score (weighted sum of likes, comments, and bookmarks) in the last 7 days.
10. THE Project_Showcase SHALL display a "Featured Projects" section curated by admins, with the ability for admins to mark up to 5 projects as featured at any time.
11. WHEN a student's ShowcaseProject is linked to their Student_Profile, THE profile page SHALL display that project in the Projects tab of the profile.
12. IF a student sets a ShowcaseProject visibility to private, THEN THE project SHALL not appear in public feeds, search results, or another user's profile view.
13. THE ShowcaseProject model SHALL store: `authorId`, `title`, `description`, `coverImage`, `additionalImages`, `techStack`, `githubUrl`, `liveDemoUrl`, `tags`, `visibility`, `likeCount`, `commentCount`, `bookmarkCount`, `isFeatured`, `engagementScore`, `createdAt`, `updatedAt`.

---

### Requirement 7: Advanced Analytics

**User Story:** As a student, I want detailed analytics about my learning behaviour and predictive insights so that I can understand my strengths, fix weaknesses, and stay on track toward my goals.

#### Acceptance Criteria

1. THE Analytics_Engine SHALL compute and store a daily Learning Consistency Score (0–100) for each student, based on the ratio of active learning days to total days since enrollment.
2. THE Analytics_Engine SHALL compute a Learning Speed Score (0–100) for each student, defined as the ratio of lessons completed per week relative to the enrolled course's expected completion pace.
3. THE Analytics_Engine SHALL compute a Focus Score (0–100) for each student, based on the average session duration and the ratio of sessions that reached at least one lesson completion event.
4. THE Analytics_Engine SHALL compute an Engagement Score (0–100) for each student, combining quiz attempts, assignment submissions, community posts, and coding submissions into a single weighted score.
5. THE Analytics_Engine SHALL compute a Course Completion Prediction for each enrolled, in-progress course, expressed as a probability (0–100%) that the student will complete the course within the course's expected duration.
6. THE Analytics_Engine SHALL compute a Placement Prediction score (0–100) that estimates the likelihood of the student receiving a placement offer within 6 months, based on Career_Readiness_Score, coding statistics, certificate count, and course completion rate.
7. THE student analytics dashboard SHALL display weekly and monthly progress charts for lessons completed, quiz scores, and assignment grades, rendered as line or bar charts.
8. THE student analytics dashboard SHALL display goal tracking showing: defined learning goals, current progress against each goal, and estimated completion date.
9. WHEN the Analytics_Engine detects that a student's Learning Consistency Score has dropped below 50 for three consecutive days, THE system SHALL trigger an in-app notification and email reminding the student to resume their learning.
10. THE student analytics dashboard SHALL display an AI Insights section with at least three auto-generated text insights per week, derived from the student's analytics data and trend changes.
11. THE Analytics_Engine SHALL persist weekly snapshots in an `AnalyticsSnapshot` document with fields: `studentId`, `weekStart`, `consistencyScore`, `speedScore`, `focusScore`, `engagementScore`, `completionPredictions`, `placementPrediction`, `insights`.
12. IF the Analytics_Engine encounters missing or corrupt data for a student metric, THEN THE system SHALL substitute a default value of 0 and log a warning rather than failing the entire snapshot computation.

---

### Requirement 8: Homepage Redesign

**User Story:** As a visitor, I want an engaging, informative homepage that communicates the platform's value proposition immediately so that I am motivated to register and start learning.

#### Acceptance Criteria

1. THE Homepage SHALL render a Hero section with the headline "Learn. Build. Get Hired." displayed in the primary font at a minimum of 48px on desktop.
2. THE Hero section SHALL include an animated background with Framer_Motion floating tech icons (React, Node.js, Python, Docker, MongoDB logos) that move in a continuous looping float animation.
3. THE Hero section SHALL include a primary call-to-action button labeled "Start Learning Free" that navigates to the register page, and a secondary button labeled "Explore Courses" that navigates to the courses page.
4. THE Homepage SHALL render a Stats section displaying animated counters for: total registered students, total published courses, total certificates issued, and total placement offers facilitated.
5. THE Stats section counters SHALL animate from zero to the live value fetched from the backend when the section enters the viewport.
6. THE Homepage SHALL render a Trending Technologies section displaying at least 8 technology cards (React, Node.js, Python, Java, Data Science, DevOps, AI/ML, System Design), each linking to the courses filtered by that technology.
7. THE Homepage SHALL render an AI News section displaying the 5 most recent news items from the existing `News` model, each showing headline, source, and published date, with a link to the full article.
8. THE Homepage SHALL render an Internship Opportunities section displaying the 6 most recent active placement listings from the `Placement` model, each showing company name, role title, stipend, and application deadline.
9. THE Homepage SHALL render a Success Stories section with at least 3 student testimonial cards showing student name, role achieved, company, and a quote, sourced from a curated collection stored in the backend.
10. THE Homepage SHALL render a Student Projects section displaying the top 6 trending ShowcaseProjects by engagement score, each showing project title, author, tech stack badges, and like count.
11. THE Homepage SHALL render a Top Instructors section displaying the top 4 instructors ranked by average course rating, showing instructor name, avatar, course count, and average rating.
12. THE Homepage SHALL render a Community Highlights section showing the 3 most recent community posts with high engagement, linking to the full community thread.
13. ALL data sections on the Homepage (Stats, Trending Technologies, AI News, Internship Opportunities, Success Stories, Student Projects, Top Instructors, Community Highlights) SHALL be loaded asynchronously and SHALL display a LoadingState skeleton while data is being fetched.
14. IF any data section fails to load, THEN THE Homepage SHALL display an EmptyState for that section without affecting the rendering of other sections.

---

### Requirement 9: Performance Optimization

**User Story:** As a user, I want the application to load fast and feel responsive so that I can focus on learning without being frustrated by slow pages.

#### Acceptance Criteria

1. THE Frontend build SHALL implement route-based code splitting so that each page route is a separate JavaScript chunk that is only downloaded when that route is first visited.
2. THE Frontend SHALL lazy-load all images using the native HTML `loading="lazy"` attribute or an IntersectionObserver-based equivalent, including course thumbnails, avatars, and project images.
3. THE Frontend SHALL use `React.memo`, `useMemo`, and `useCallback` to prevent unnecessary re-renders on components that receive stable props, specifically: the course card grid, the coding problem list, and the leaderboard list.
4. THE Frontend SHALL use a Virtual_List implementation for any list exceeding 50 items, specifically: the course catalog, the problems list, the community feed, and leaderboard tables.
5. THE Frontend SHALL implement API response caching using a cache-first strategy with a stale-while-revalidate pattern for the following endpoints: course list, problem list, homepage stats, and student analytics snapshots.
6. THE Backend SHALL add database indexes on all fields used in sort or filter operations added by this upgrade, including: `AnalyticsSnapshot.studentId`, `AnalyticsSnapshot.weekStart`, `Submission.studentId`, `Submission.problemId`, `ShowcaseProject.engagementScore`, and `ShowcaseProject.isFeatured`.
7. WHEN measured with Google Lighthouse on a simulated 4G mobile connection, THE Homepage SHALL achieve a Performance score of at least 90, an Accessibility score of at least 90, and an SEO score of at least 90.
8. WHEN measured with Google Lighthouse on a simulated 4G mobile connection, THE CoursesPage SHALL achieve a Performance score of at least 90.
9. THE Frontend SHALL preload critical fonts (Inter) using a `<link rel="preload">` tag in the HTML document head.
10. THE Backend SHALL enable HTTP response compression (gzip or Brotli) for all API responses larger than 1KB.
11. IF a lazy-loaded image fails to load, THEN THE Frontend SHALL display a placeholder graphic in the same dimensions as the expected image.

---

### Requirement 10: Admin Super Dashboard

**User Story:** As an admin, I want a comprehensive dashboard with real-time metrics, analytics, and system health monitoring so that I can make data-driven decisions and keep the platform running smoothly.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL be accessible only to users whose `role` field equals `admin`, and any attempt by a non-admin user to access an admin route SHALL return a 403 Forbidden response.
2. THE Admin_Dashboard SHALL display a User Analytics section showing: total registered users, new users per day over the last 30 days (line chart), users by role breakdown (pie chart), and daily active users over the last 30 days (bar chart).
3. THE Admin_Dashboard SHALL display a Revenue Analytics section showing: total revenue, monthly recurring revenue trend (line chart), revenue by course (top 10 bar chart), and average revenue per user.
4. THE Admin_Dashboard SHALL display a Course Analytics section showing: total published courses, total enrollments, top 10 courses by enrollment count, top 10 courses by completion rate, and average quiz score across all courses.
5. THE Admin_Dashboard SHALL display a Placement Analytics section showing: total placement offers facilitated, placement rate (offers / enrolled students), top hiring companies, average time-to-placement in days, and placement count by career path.
6. THE Admin_Dashboard SHALL display a Real-Time Monitoring section showing: currently active user sessions (updated every 30 seconds via the existing Socket.io integration), ongoing code submissions in the Coding_Playground queue, and pending AI service requests.
7. THE Admin_Dashboard SHALL display a System Health section showing: MongoDB connection status, Redis connection status, Judge0 API response time (last ping), AI service availability, Cloudinary quota used percentage, and Node.js process uptime.
8. WHEN the System Health section detects that any monitored service is unavailable or has a response time above 2000ms, THE Admin_Dashboard SHALL highlight that service with a red status badge.
9. THE Admin_Dashboard SHALL display an AI Usage Analytics section showing: total AI API calls in the current month, breakdown by AI feature (AI Tutor, ATS Analyzer, AI Code Review, AI Career Mentor), estimated token usage, and estimated cost.
10. THE Admin_Dashboard SHALL allow admins to export any analytics table as a CSV file with a single click.
11. THE Admin_Dashboard data SHALL refresh automatically every 5 minutes without requiring a full page reload, using a background polling mechanism or server-sent events.
12. WHEN an admin marks a ShowcaseProject as featured or removes the featured flag, THE change SHALL take effect immediately without a page reload.
13. IF the backend returns an error for any Admin_Dashboard data fetch, THEN THE Admin_Dashboard SHALL display an inline error message for the affected section without hiding other sections.
