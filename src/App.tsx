import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Student pages
import CourseBrowser from "./pages/dashboard/CourseBrowser";
import CourseView from "./pages/dashboard/CourseView";
import ProgressPage from "./pages/dashboard/ProgressPage";
import BadgesPage from "./pages/dashboard/BadgesPage";
import MoodPage from "./pages/dashboard/MoodPage";
import ProfilePage from "./pages/dashboard/ProfilePage";

// Teacher pages
import TeacherCourses from "./pages/dashboard/TeacherCourses";
import CreateCourse from "./pages/dashboard/CreateCourse";
import CourseEditor from "./pages/dashboard/CourseEditor";
import TeacherResults from "./pages/dashboard/TeacherResults";

// Parent pages
import ChildrenPage from "./pages/dashboard/ChildrenPage";
import ChildProgress from "./pages/dashboard/ChildProgress";

// Admin pages
import AdminUsers from "./pages/dashboard/AdminUsers";
import AdminCourses from "./pages/dashboard/AdminCourses";
import AdminAnalytics from "./pages/dashboard/AdminAnalytics";

const queryClient = new QueryClient();

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
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Dashboard home uses its own layout */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Shared routes */}
            <Route path="/dashboard/profile" element={<DashboardRoute><ProfilePage /></DashboardRoute>} />

            {/* Student routes */}
            <Route path="/dashboard/courses" element={<DashboardRoute><CourseBrowser /></DashboardRoute>} />
            <Route path="/dashboard/courses/:courseId" element={<DashboardRoute><CourseView /></DashboardRoute>} />
            <Route path="/dashboard/progress" element={<DashboardRoute><ProgressPage /></DashboardRoute>} />
            <Route path="/dashboard/badges" element={<DashboardRoute><BadgesPage /></DashboardRoute>} />
            <Route path="/dashboard/mood" element={<DashboardRoute><MoodPage /></DashboardRoute>} />

            {/* Teacher routes */}
            <Route path="/dashboard/my-courses" element={<DashboardRoute><TeacherCourses /></DashboardRoute>} />
            <Route path="/dashboard/create-course" element={<DashboardRoute><CreateCourse /></DashboardRoute>} />
            <Route path="/dashboard/courses/:courseId/edit" element={<DashboardRoute><CourseEditor /></DashboardRoute>} />
            <Route path="/dashboard/results" element={<DashboardRoute><TeacherResults /></DashboardRoute>} />

            {/* Parent routes */}
            <Route path="/dashboard/children" element={<DashboardRoute><ChildrenPage /></DashboardRoute>} />
            <Route path="/dashboard/child-progress" element={<DashboardRoute><ChildProgress /></DashboardRoute>} />

            {/* Admin routes */}
            <Route path="/dashboard/users" element={<DashboardRoute><AdminUsers /></DashboardRoute>} />
            <Route path="/dashboard/manage-courses" element={<DashboardRoute><AdminCourses /></DashboardRoute>} />
            <Route path="/dashboard/analytics" element={<DashboardRoute><AdminAnalytics /></DashboardRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
