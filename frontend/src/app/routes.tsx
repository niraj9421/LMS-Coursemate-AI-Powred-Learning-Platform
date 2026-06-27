import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'

const HomePage             = lazy(() => import('@/pages/HomePage'))
const LoginPage            = lazy(() => import('@/pages/LoginPage'))
const RegisterPage         = lazy(() => import('@/pages/RegisterPage'))
const ForgotPasswordPage   = lazy(() => import('@/pages/ForgotPasswordPage'))
const ResetPasswordPage    = lazy(() => import('@/pages/ResetPasswordPage'))
const VerifyEmailPage      = lazy(() => import('@/pages/VerifyEmailPage'))
const CoursesPage          = lazy(() => import('@/pages/CoursesPage'))
const CourseDetailPage     = lazy(() => import('@/pages/CourseDetailPage'))
const CertificateVerifyPage = lazy(() => import('@/pages/CertificateVerifyPage'))

// Student dashboard
const DashboardPage        = lazy(() => import('@/pages/DashboardPage'))
const MyCoursesPage        = lazy(() => import('@/pages/dashboard/MyCoursesPage'))
const MyProgressPage       = lazy(() => import('@/pages/dashboard/MyProgressPage'))
const MyCertificatesPage   = lazy(() => import('@/pages/dashboard/MyCertificatesPage'))
const CommunityPage        = lazy(() => import('@/pages/dashboard/CommunityPage'))
const CommunityPostPage    = lazy(() => import('@/pages/dashboard/CommunityPostPage'))
const CommunityChatPage    = lazy(() => import('@/pages/dashboard/CommunityChatPage'))
const PlacementPage        = lazy(() => import('@/pages/dashboard/PlacementPage'))
const AIAssistantPage      = lazy(() => import('@/pages/dashboard/AIAssistantPage'))
const CodingPlaygroundPage = lazy(() => import('@/pages/dashboard/CodingPlaygroundPage'))

// Placement sub-pages
const ResumeBuilderPage    = lazy(() => import('@/pages/placement/ResumeBuilderPage'))
const ResumeAnalyzerPage   = lazy(() => import('@/pages/placement/ResumeAnalyzerPage'))
const MockInterviewPage    = lazy(() => import('@/pages/placement/MockInterviewPage'))
const GDTopicsPage         = lazy(() => import('@/pages/placement/GDTopicsPage'))
const AptitudeTestPage     = lazy(() => import('@/pages/placement/AptitudeTestPage'))
const CompanyPrepPage      = lazy(() => import('@/pages/placement/CompanyPrepPage'))

// Teacher
const TeacherDashboardPage  = lazy(() => import('@/pages/teacher/TeacherDashboardPage'))
const CreateCoursePage       = lazy(() => import('@/pages/teacher/CreateCoursePage'))
const TeacherAnalyticsPage   = lazy(() => import('@/pages/teacher/TeacherAnalyticsPage'))
const TeacherAssignmentsPage = lazy(() => import('@/pages/teacher/TeacherAssignmentsPage'))
const TeacherAttendancePage  = lazy(() => import('@/pages/teacher/TeacherAttendancePage'))

// Admin
const AdminDashboardPage   = lazy(() => import('@/pages/admin/AdminDashboardPage'))
const AdminUsersPage       = lazy(() => import('@/pages/admin/AdminUsersPage'))
const AdminCoursesPage     = lazy(() => import('@/pages/admin/AdminCoursesPage'))

// Profile
const StudentProfilePage   = lazy(() => import('@/pages/profile/StudentProfilePage'))

const CourseStudentsPage   = lazy(() => import('@/pages/teacher/CourseStudentsPage'))
const CareerMentorPage     = lazy(() => import('@/pages/dashboard/CareerMentorPage'))
const ShowcasePage         = lazy(() => import('@/pages/showcase/ShowcasePage'))

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        <p className="text-sm text-text-muted">Loading...</p>
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface text-center px-4">
      <div>
        <p className="text-8xl font-extrabold text-border mb-4">404</p>
        <h1 className="text-2xl font-bold text-text mb-2">Page Not Found</h1>
        <p className="text-text-muted mb-6">The page you're looking for doesn't exist.</p>
        <a href="/" className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors">
          ← Back to Home
        </a>
      </div>
    </div>
  )
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:id" element={<CourseDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        <Route path="/certificates/verify/:id" element={<CertificateVerifyPage />} />

        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/courses" element={<MyCoursesPage />} />
        <Route path="/dashboard/progress" element={<MyProgressPage />} />
        <Route path="/dashboard/certificates" element={<MyCertificatesPage />} />
        <Route path="/dashboard/community" element={<CommunityPage />} />
        <Route path="/dashboard/community/:postId" element={<CommunityPostPage />} />
        <Route path="/dashboard/chat" element={<CommunityChatPage />} />
        <Route path="/dashboard/placement" element={<PlacementPage />} />
        <Route path="/dashboard/placement/resume-builder" element={<ResumeBuilderPage />} />
        <Route path="/dashboard/placement/resume-analyzer" element={<ResumeAnalyzerPage />} />
        <Route path="/dashboard/placement/interview" element={<MockInterviewPage />} />
        <Route path="/dashboard/placement/gd-topics" element={<GDTopicsPage />} />
        <Route path="/dashboard/placement/aptitude" element={<AptitudeTestPage />} />
        <Route path="/dashboard/placement/companies" element={<CompanyPrepPage />} />
        <Route path="/dashboard/ai" element={<AIAssistantPage />} />
        <Route path="/dashboard/playground" element={<CodingPlaygroundPage />} />

        {/* Profile */}
        <Route path="/profile" element={<StudentProfilePage />} />
        <Route path="/settings" element={<StudentProfilePage />} />

        {/* Career Mentor */}
        <Route path="/dashboard/career" element={<CareerMentorPage />} />

        {/* Project Showcase */}
        <Route path="/showcase" element={<ShowcasePage />} />

        <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
        <Route path="/teacher/courses" element={<TeacherDashboardPage />} />
        <Route path="/teacher/courses/new" element={<CreateCoursePage />} />
        <Route path="/teacher/courses/:id/edit" element={<CreateCoursePage />} />
        <Route path="/teacher/courses/:courseId/students" element={<CourseStudentsPage />} />
        <Route path="/teacher/analytics" element={<TeacherAnalyticsPage />} />
        <Route path="/teacher/assignments" element={<TeacherAssignmentsPage />} />
        <Route path="/teacher/attendance" element={<TeacherAttendancePage />} />

        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/courses" element={<AdminCoursesPage />} />

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  )
}
