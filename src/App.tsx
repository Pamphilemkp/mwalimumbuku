import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/i18n/LanguageContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { lazy, Suspense } from "react";

// Eager-load critical path pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
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

// Teacher pages
const TeacherCourses = lazy(() => import("./pages/dashboard/TeacherCourses"));
const CreateCourse = lazy(() => import("./pages/dashboard/CreateCourse"));
const CourseEditor = lazy(() => import("./pages/dashboard/CourseEditor"));
const TeacherResults = lazy(() => import("./pages/dashboard/TeacherResults"));

// Parent pages
const ChildrenPage = lazy(() => import("./pages/dashboard/ChildrenPage"));
const ChildProgress = lazy(() => import("./pages/dashboard/ChildProgress"));

// Shared pages
const ForumPage = lazy(() => import("./pages/dashboard/ForumPage"));
const MessagesPage = lazy(() => import("./pages/dashboard/MessagesPage"));
const SubscriptionPage = lazy(() => import("./pages/dashboard/SubscriptionPage"));

// Admin pages
const AdminUsers = lazy(() => import("./pages/dashboard/AdminUsers"));
const AdminCourses = lazy(() => import("./pages/dashboard/AdminCourses"));
const AdminAnalytics = lazy(() => import("./pages/dashboard/AdminAnalytics"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 5, // 5 minutes garbage collection
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function DashboardRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{children}</DashboardLayout>
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
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
                <Route path="/dashboard" element={<Dashboard />} />

                <Route path="/dashboard/profile" element={<DashboardRoute><ProfilePage /></DashboardRoute>} />

                <Route path="/dashboard/courses" element={<DashboardRoute><CourseBrowser /></DashboardRoute>} />
                <Route path="/dashboard/courses/:courseId" element={<DashboardRoute><CourseView /></DashboardRoute>} />
                <Route path="/dashboard/progress" element={<DashboardRoute><ProgressPage /></DashboardRoute>} />
                <Route path="/dashboard/badges" element={<DashboardRoute><BadgesPage /></DashboardRoute>} />
                <Route path="/dashboard/mood" element={<DashboardRoute><MoodPage /></DashboardRoute>} />

                <Route path="/dashboard/my-courses" element={<DashboardRoute><TeacherCourses /></DashboardRoute>} />
                <Route path="/dashboard/create-course" element={<DashboardRoute><CreateCourse /></DashboardRoute>} />
                <Route path="/dashboard/courses/:courseId/edit" element={<DashboardRoute><CourseEditor /></DashboardRoute>} />
                <Route path="/dashboard/results" element={<DashboardRoute><TeacherResults /></DashboardRoute>} />

                <Route path="/dashboard/children" element={<DashboardRoute><ChildrenPage /></DashboardRoute>} />
                <Route path="/dashboard/child-progress" element={<DashboardRoute><ChildProgress /></DashboardRoute>} />

                <Route path="/dashboard/users" element={<DashboardRoute><AdminUsers /></DashboardRoute>} />
                <Route path="/dashboard/manage-courses" element={<DashboardRoute><AdminCourses /></DashboardRoute>} />
                <Route path="/dashboard/analytics" element={<DashboardRoute><AdminAnalytics /></DashboardRoute>} />

                <Route path="/dashboard/forum" element={<DashboardRoute><ForumPage /></DashboardRoute>} />
                <Route path="/dashboard/messages" element={<DashboardRoute><MessagesPage /></DashboardRoute>} />
                <Route path="/dashboard/subscription" element={<DashboardRoute><SubscriptionPage /></DashboardRoute>} />

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
