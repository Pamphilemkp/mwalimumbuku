import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/i18n/LanguageContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import OnboardingGuard from "@/components/OnboardingGuard";
import DashboardLayout from "@/components/DashboardLayout";
import { lazy, Suspense } from "react";

// Eager-load critical path pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Mission from "./pages/Mission";
import NotFound from "./pages/NotFound";

// Lazy-load everything else
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

// Student pages
const CourseBrowser = lazy(() => import("./pages/dashboard/CourseBrowser"));
const CourseView = lazy(() => import("./pages/dashboard/CourseView"));
const ProgressPage = lazy(() => import("./pages/dashboard/ProgressPage"));
const BadgesPage = lazy(() => import("./pages/dashboard/BadgesPage"));
const MoodPage = lazy(() => import("./pages/dashboard/MoodPage"));
const ProfilePage = lazy(() => import("./pages/dashboard/ProfilePage"));
const StudentAssignmentsPage = lazy(() => import("./pages/dashboard/StudentAssignmentsPage"));
const StudentGradesPage = lazy(() => import("./pages/dashboard/StudentGradesPage"));

// Teacher pages
const TeacherCourses = lazy(() => import("./pages/dashboard/TeacherCourses"));
const CreateCourse = lazy(() => import("./pages/dashboard/CreateCourse"));
const CourseEditor = lazy(() => import("./pages/dashboard/CourseEditor"));
const TeacherResults = lazy(() => import("./pages/dashboard/TeacherResults"));
const TeacherSubmissionsPage = lazy(() => import("./pages/dashboard/TeacherSubmissionsPage"));

// Parent pages
const ChildrenPage = lazy(() => import("./pages/dashboard/ChildrenPage"));
const ChildProgress = lazy(() => import("./pages/dashboard/ChildProgress"));

// Shared pages
const ForumPage = lazy(() => import("./pages/dashboard/ForumPage"));
const MessagesPage = lazy(() => import("./pages/dashboard/MessagesPage"));
const SubscriptionPage = lazy(() => import("./pages/dashboard/SubscriptionPage"));
const GamesPage = lazy(() => import("./pages/dashboard/GamesPage"));
const ToolboxPage = lazy(() => import("./pages/dashboard/ToolboxPage"));

// Admin pages
const AdminUsers = lazy(() => import("./pages/dashboard/AdminUsers"));
const AdminCourses = lazy(() => import("./pages/dashboard/AdminCourses"));
const AdminAnalytics = lazy(() => import("./pages/dashboard/AdminAnalytics"));
const AdminSettingsPage = lazy(() => import("./pages/dashboard/AdminSettingsPage"));

const AdminAnnouncementsPage = lazy(() => import("./pages/dashboard/AdminAnnouncementsPage"));
const AdminAssignTeacherPage = lazy(() => import("./pages/dashboard/AdminAssignTeacherPage"));
const ParentRolePage = lazy(() => import("./pages/dashboard/ParentRolePage"));

// Docs
const DocsPage = lazy(() => import("./pages/dashboard/DocsPage"));
const OnboardingPage = lazy(() => import("./pages/dashboard/OnboardingPage"));
const OnboardingRouter = lazy(() => import("./pages/onboarding/OnboardingRouter"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
    mutations: {
      retry: 1,
    },
  },
});

// Expose for auth cleanup
(window as any).__queryClient = queryClient;

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function DashboardRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: import('@/lib/auth').AppRole[] }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <OnboardingGuard>
        <DashboardLayout>{children}</DashboardLayout>
      </OnboardingGuard>
    </ProtectedRoute>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/mission" element={<Mission />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                <Route path="/onboarding/:role" element={<OnboardingRouter />} />

                <Route path="/dashboard" element={<DashboardRoute><Dashboard /></DashboardRoute>} />

                <Route path="/dashboard/profile" element={<DashboardRoute><ProfilePage /></DashboardRoute>} />
                <Route path="/dashboard/my-role" element={<DashboardRoute allowedRoles={['parent']}><ParentRolePage /></DashboardRoute>} />
                <Route path="/dashboard/announcements" element={<DashboardRoute allowedRoles={['admin']}><AdminAnnouncementsPage /></DashboardRoute>} />
                <Route path="/dashboard/assign-teachers" element={<DashboardRoute allowedRoles={['admin']}><AdminAssignTeacherPage /></DashboardRoute>} />

                <Route path="/dashboard/courses" element={<DashboardRoute><CourseBrowser /></DashboardRoute>} />
                <Route path="/dashboard/courses/:courseId" element={<DashboardRoute><CourseView /></DashboardRoute>} />
                <Route path="/dashboard/progress" element={<DashboardRoute><ProgressPage /></DashboardRoute>} />
                <Route path="/dashboard/badges" element={<DashboardRoute><BadgesPage /></DashboardRoute>} />
                <Route path="/dashboard/mood" element={<DashboardRoute><MoodPage /></DashboardRoute>} />
                <Route path="/dashboard/assignments" element={<DashboardRoute allowedRoles={['student']}><StudentAssignmentsPage /></DashboardRoute>} />
                <Route path="/dashboard/grades" element={<DashboardRoute allowedRoles={['student']}><StudentGradesPage /></DashboardRoute>} />

                <Route path="/dashboard/my-courses" element={<DashboardRoute allowedRoles={['teacher', 'admin']}><TeacherCourses /></DashboardRoute>} />
                <Route path="/dashboard/create-course" element={<DashboardRoute allowedRoles={['teacher', 'admin']}><CreateCourse /></DashboardRoute>} />
                <Route path="/dashboard/courses/:courseId/edit" element={<DashboardRoute allowedRoles={['teacher', 'admin']}><CourseEditor /></DashboardRoute>} />
                <Route path="/dashboard/results" element={<DashboardRoute allowedRoles={['teacher', 'admin']}><TeacherResults /></DashboardRoute>} />
                <Route path="/dashboard/submissions" element={<DashboardRoute allowedRoles={['teacher', 'admin']}><TeacherSubmissionsPage /></DashboardRoute>} />

                <Route path="/dashboard/children" element={<DashboardRoute><ChildrenPage /></DashboardRoute>} />
                <Route path="/dashboard/child-progress" element={<DashboardRoute><ChildProgress /></DashboardRoute>} />

                <Route path="/dashboard/users" element={<DashboardRoute allowedRoles={['admin']}><AdminUsers /></DashboardRoute>} />
                <Route path="/dashboard/manage-courses" element={<DashboardRoute allowedRoles={['admin']}><AdminCourses /></DashboardRoute>} />
                <Route path="/dashboard/analytics" element={<DashboardRoute allowedRoles={['admin']}><AdminAnalytics /></DashboardRoute>} />
                <Route path="/dashboard/settings" element={<DashboardRoute allowedRoles={['admin']}><AdminSettingsPage /></DashboardRoute>} />

                <Route path="/dashboard/forum" element={<DashboardRoute><ForumPage /></DashboardRoute>} />
                <Route path="/dashboard/messages" element={<DashboardRoute><MessagesPage /></DashboardRoute>} />
                <Route path="/dashboard/games" element={<DashboardRoute><GamesPage /></DashboardRoute>} />
                <Route path="/dashboard/toolbox" element={<DashboardRoute><ToolboxPage /></DashboardRoute>} />
                <Route path="/dashboard/subscription" element={<DashboardRoute><SubscriptionPage /></DashboardRoute>} />
                <Route path="/dashboard/docs" element={<DashboardRoute><DocsPage /></DashboardRoute>} />
                <Route path="/dashboard/onboarding" element={<DashboardRoute><OnboardingPage /></DashboardRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
