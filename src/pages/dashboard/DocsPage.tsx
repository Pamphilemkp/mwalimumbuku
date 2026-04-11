import { useState } from 'react';
import { BookOpen, Users, GraduationCap, Shield, CreditCard, MessageCircle, Award, Smile, Settings, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DocSection {
  id: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

const sections: DocSection[] = [
  {
    id: 'overview',
    title: 'Platform Overview',
    icon: BookOpen,
    content: (
      <div className="prose prose-sm max-w-none text-foreground/90">
        <h3 className="font-display text-lg font-semibold text-foreground">Welcome to Mwalimu Mbuku</h3>
        <p>Mwalimu Mbuku is a modern educational platform designed to scale for thousands of users. It provides a complete learning management system with role-based access for <strong>Students</strong>, <strong>Teachers</strong>, <strong>Parents</strong>, and <strong>Admins</strong>.</p>
        <h4>Key Features</h4>
        <ul>
          <li><strong>Interactive Courses</strong> — Structured lessons with embedded exercises and quizzes</li>
          <li><strong>Gamification</strong> — Points, badges, accuracy tracking, and streaks</li>
          <li><strong>Premium Content</strong> — Monetize courses with subscription gating</li>
          <li><strong>Real-time Messaging</strong> — Direct communication between users</li>
          <li><strong>Community Forum</strong> — Role-based discussion boards</li>
          <li><strong>Parent Monitoring</strong> — Track child progress and mood</li>
          <li><strong>Accessibility</strong> — Dyslexia-friendly mode, multi-language support (FR/EN)</li>
        </ul>
        <h4>Architecture</h4>
        <p>Built with React + Vite frontend, Lovable Cloud (PostgreSQL) backend with Row-Level Security, Edge Functions for server-side logic, and Stripe for payments.</p>
      </div>
    ),
  },
  {
    id: 'roles',
    title: 'User Roles & Access',
    icon: Users,
    content: (
      <div className="prose prose-sm max-w-none text-foreground/90">
        <h3 className="font-display text-lg font-semibold text-foreground">Role-Based Access Control</h3>
        <p>Every user is assigned one role at signup. Roles determine dashboard access and available features.</p>
        <div className="not-prose grid gap-3 mt-4">
          {[
            { role: 'Student', color: 'bg-primary/10 text-primary', features: 'Browse & enroll in courses, complete exercises, earn badges & points, track progress, log mood, participate in forums' },
            { role: 'Teacher', color: 'bg-accent/10 text-accent', features: 'Create & publish courses, add lessons & exercises, set assignments with deadlines, view student results & analytics' },
            { role: 'Parent', color: 'bg-secondary/10 text-secondary', features: 'Link children accounts, monitor progress & mood, view enrolled courses, send messages to teachers' },
            { role: 'Admin', color: 'bg-destructive/10 text-destructive', features: 'Full platform control: manage all users & roles, manage all courses, view analytics, manage subscriptions, moderate content' },
          ].map((r) => (
            <div key={r.role} className="rounded-xl border border-border bg-card p-4">
              <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold mb-2', r.color)}>{r.role}</span>
              <p className="text-sm text-muted-foreground">{r.features}</p>
            </div>
          ))}
        </div>
        <h4>Security</h4>
        <p>All data access is enforced at the database level using Row-Level Security (RLS) policies. Frontend routes are additionally guarded with role checks. Admin role cannot be self-assigned during signup.</p>
      </div>
    ),
  },
  {
    id: 'courses',
    title: 'Course Management',
    icon: GraduationCap,
    content: (
      <div className="prose prose-sm max-w-none text-foreground/90">
        <h3 className="font-display text-lg font-semibold text-foreground">Creating & Managing Courses</h3>
        <h4>For Teachers</h4>
        <ol>
          <li>Navigate to <strong>Dashboard → Create Course</strong></li>
          <li>Enter title, subject, level, and description</li>
          <li>Optionally mark as <strong>Premium</strong> (requires student subscription)</li>
          <li>After creation, you&apos;ll be taken to the <strong>Course Editor</strong></li>
          <li>Add <strong>Lessons</strong> with text content</li>
          <li>Add <strong>Exercises</strong> (multiple choice) to each lesson with point values</li>
          <li>Set <strong>Assignments</strong> with due dates</li>
          <li><strong>Publish</strong> the course when ready — it will appear in the course browser</li>
        </ol>
        <h4>For Students</h4>
        <ol>
          <li>Browse available courses in <strong>Dashboard → Courses</strong></li>
          <li>Filter by subject, level, or search by name</li>
          <li>Click <strong>Enroll</strong> on a free course (or upgrade for premium)</li>
          <li>Open a course → select a lesson → complete exercises</li>
          <li>Earn points for correct answers — retake exercises anytime</li>
        </ol>
        <h4>Premium Courses</h4>
        <p>Courses marked as premium require an active subscription. Students without a subscription see a lock screen with an upgrade prompt. Teachers and admins always have full access.</p>
      </div>
    ),
  },
  {
    id: 'admin',
    title: 'Admin Guide',
    icon: Shield,
    content: (
      <div className="prose prose-sm max-w-none text-foreground/90">
        <h3 className="font-display text-lg font-semibold text-foreground">Administration</h3>
        <h4>User Management</h4>
        <p>Navigate to <strong>Dashboard → Users</strong> to:</p>
        <ul>
          <li>View all registered users with their roles</li>
          <li>Search and filter users by name or email</li>
          <li>Change user roles (student, teacher, parent, admin)</li>
          <li>View subscription status and parent-child links</li>
        </ul>
        <h4>Course Management</h4>
        <p>Navigate to <strong>Dashboard → Manage Courses</strong> to:</p>
        <ul>
          <li>View all courses (published and drafts)</li>
          <li>Edit any course content</li>
          <li>Publish or unpublish courses</li>
          <li>Delete courses if needed</li>
        </ul>
        <h4>Analytics</h4>
        <p>View platform-wide metrics including user growth, enrollment trends, and exercise completion rates.</p>
        <h4>Teacher Access Codes</h4>
        <p>Teachers must provide a valid access code during signup. This is configured as a backend secret and validated server-side to prevent unauthorized teacher registrations.</p>
      </div>
    ),
  },
  {
    id: 'subscription',
    title: 'Subscriptions & Payments',
    icon: CreditCard,
    content: (
      <div className="prose prose-sm max-w-none text-foreground/90">
        <h3 className="font-display text-lg font-semibold text-foreground">Subscription System</h3>
        <p>The platform uses Stripe for payment processing with two tiers:</p>
        <div className="not-prose grid gap-3 mt-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="font-display font-semibold text-foreground">Free Tier</h4>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>✓ Access to free courses</li>
              <li>✓ Exercise completion & points</li>
              <li>✓ Badge earning</li>
              <li>✓ Forum & messaging</li>
            </ul>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <h4 className="font-display font-semibold text-amber-600">Premium Tier</h4>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>✓ All free features</li>
              <li>✓ Premium course access</li>
              <li>✓ Priority support</li>
              <li>✓ Advanced analytics</li>
            </ul>
          </div>
        </div>
        <h4>Payment Flow</h4>
        <ol>
          <li>Student navigates to <strong>Subscription</strong> page</li>
          <li>Clicks <strong>Upgrade to Premium</strong></li>
          <li>Redirected to Stripe Checkout</li>
          <li>After successful payment, subscription is activated</li>
          <li>Premium courses become accessible immediately</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'gamification',
    title: 'Gamification & Badges',
    icon: Award,
    content: (
      <div className="prose prose-sm max-w-none text-foreground/90">
        <h3 className="font-display text-lg font-semibold text-foreground">Points & Badges System</h3>
        <h4>Points</h4>
        <ul>
          <li>Each exercise has a configurable point value (default: 10)</li>
          <li>Points are awarded for correct answers</li>
          <li>Students can retake exercises to improve scores</li>
          <li>Total points determine badge eligibility</li>
        </ul>
        <h4>Badges</h4>
        <ul>
          <li>Badges are created by admins with a points threshold</li>
          <li>Students automatically earn badges when reaching the required points</li>
          <li>Earned badges are displayed in the student profile and badges page</li>
        </ul>
        <h4>Progress Tracking</h4>
        <ul>
          <li>Real-time accuracy tracking per exercise and overall</li>
          <li>Visual progress bars in course views</li>
          <li>Activity feed showing recent exercise attempts</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'forum',
    title: 'Forum & Messaging',
    icon: MessageCircle,
    content: (
      <div className="prose prose-sm max-w-none text-foreground/90">
        <h3 className="font-display text-lg font-semibold text-foreground">Communication</h3>
        <h4>Forum</h4>
        <ul>
          <li>Role-based visibility — posts can target specific roles</li>
          <li>Categories for organizing discussions</li>
          <li>Threaded replies for conversation flow</li>
          <li>Authors can edit/delete their own posts</li>
        </ul>
        <h4>Direct Messaging</h4>
        <ul>
          <li>Send private messages to any platform user</li>
          <li>Read receipts for sent messages</li>
          <li>Conversation threading by user</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'accessibility',
    title: 'Accessibility & Settings',
    icon: Settings,
    content: (
      <div className="prose prose-sm max-w-none text-foreground/90">
        <h3 className="font-display text-lg font-semibold text-foreground">Accessibility Features</h3>
        <ul>
          <li><strong>Dyslexia Mode</strong> — Toggle OpenDyslexic font with enhanced letter/word spacing</li>
          <li><strong>Multi-language</strong> — Full French and English support</li>
          <li><strong>Responsive Design</strong> — Mobile-first, works on all devices</li>
          <li><strong>Mood Tracking</strong> — Students can log daily moods for wellbeing monitoring</li>
          <li><strong>Dark Mode Ready</strong> — Full dark theme support</li>
        </ul>
        <h4>Profile Settings</h4>
        <p>Users can update their profile including:</p>
        <ul>
          <li>Full name and avatar</li>
          <li>Language preference</li>
          <li>Dyslexia mode toggle</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'mood',
    title: 'Mood Tracking',
    icon: Smile,
    content: (
      <div className="prose prose-sm max-w-none text-foreground/90">
        <h3 className="font-display text-lg font-semibold text-foreground">Student Wellbeing</h3>
        <p>The mood tracking feature helps monitor student wellbeing:</p>
        <ul>
          <li>Students log their daily mood (happy, neutral, sad, excited, tired, anxious)</li>
          <li>Optional notes can accompany mood entries</li>
          <li>Parents can view their linked children&apos;s mood history</li>
          <li>Helps identify patterns and potential concerns early</li>
        </ul>
      </div>
    ),
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview');
  const active = sections.find((s) => s.id === activeSection)!;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Documentation</h1>
        </div>
        <p className="mt-1 text-muted-foreground">Complete guide to using Mwalimu Mbuku</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar nav */}
        <nav className="space-y-1 rounded-2xl border border-border bg-card p-3">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all',
                activeSection === section.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <section.icon className="h-4 w-4 shrink-0" />
              {section.title}
            </button>
          ))}
        </nav>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-border bg-card p-6 sm:p-8"
          >
            {active.content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
