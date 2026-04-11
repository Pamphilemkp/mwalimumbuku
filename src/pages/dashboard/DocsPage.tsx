import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { BookOpen, Users, GraduationCap, Shield, CreditCard, MessageCircle, Award, Smile, Settings, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function DocsPage() {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', icon: BookOpen },
    { id: 'roles', icon: Users },
    { id: 'courses', icon: GraduationCap },
    { id: 'admin', icon: Shield },
    { id: 'subscription', icon: CreditCard },
    { id: 'gamification', icon: Award },
    { id: 'forum', icon: MessageCircle },
    { id: 'accessibility', icon: Settings },
    { id: 'mood', icon: Smile },
  ];

  const sectionTitle = (id: string) => t.docs.sections[id as keyof typeof t.docs.sections] || id;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><BookOpen className="h-5 w-5 text-primary" /></div>
          <h1 className="font-display text-3xl font-bold text-foreground">{t.docs.title}</h1>
        </div>
        <p className="mt-1 text-muted-foreground">{t.docs.subtitle}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="space-y-1 rounded-2xl border border-border bg-card p-3">
          {sections.map((section) => (
            <button key={section.id} onClick={() => setActiveSection(section.id)}
              className={cn('flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all',
                activeSection === section.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
              <section.icon className="h-4 w-4 shrink-0" />{sectionTitle(section.id)}
            </button>
          ))}
        </nav>
        <AnimatePresence mode="wait">
          <motion.div key={activeSection} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <DocContent sectionId={activeSection} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function DocContent({ sectionId }: { sectionId: string }) {
  const { lang } = useLanguage();
  // Content is educational documentation - kept bilingual inline for maintainability
  const content: Record<string, Record<string, React.ReactNode>> = {
    overview: {
      fr: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Bienvenue sur Mwalimu Mbuku</h3><p>Mwalimu Mbuku est une plateforme éducative moderne conçue pour des milliers d'utilisateurs. Elle offre un système complet de gestion d'apprentissage avec un accès basé sur les rôles : <strong>Élèves</strong>, <strong>Enseignants</strong>, <strong>Parents</strong> et <strong>Administrateurs</strong>.</p><h4>Fonctionnalités clés</h4><ul><li><strong>Cours interactifs</strong> — Leçons structurées avec exercices et quiz intégrés</li><li><strong>Gamification</strong> — Points, badges, suivi de précision et séries</li><li><strong>Contenu Premium</strong> — Monétisez les cours avec des abonnements</li><li><strong>Messagerie temps réel</strong> — Communication directe entre utilisateurs</li><li><strong>Forum communautaire</strong> — Discussions par rôle</li><li><strong>Suivi parental</strong> — Suivez la progression et l'humeur de l'enfant</li><li><strong>Accessibilité</strong> — Mode dyslexie, support multilingue (FR/EN)</li></ul></div>),
      en: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Welcome to Mwalimu Mbuku</h3><p>Mwalimu Mbuku is a modern educational platform designed to scale for thousands of users. It provides a complete LMS with role-based access for <strong>Students</strong>, <strong>Teachers</strong>, <strong>Parents</strong>, and <strong>Admins</strong>.</p><h4>Key Features</h4><ul><li><strong>Interactive Courses</strong> — Structured lessons with embedded exercises and quizzes</li><li><strong>Gamification</strong> — Points, badges, accuracy tracking, and streaks</li><li><strong>Premium Content</strong> — Monetize courses with subscription gating</li><li><strong>Real-time Messaging</strong> — Direct communication between users</li><li><strong>Community Forum</strong> — Role-based discussion boards</li><li><strong>Parent Monitoring</strong> — Track child progress and mood</li><li><strong>Accessibility</strong> — Dyslexia mode, multi-language support (FR/EN)</li></ul></div>),
    },
    roles: {
      fr: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Contrôle d'accès par rôle</h3><p>Chaque utilisateur se voit attribuer un rôle à l'inscription qui détermine l'accès au tableau de bord.</p><ul><li><strong>Élève</strong> — Parcourir les cours, faire des exercices, gagner des badges</li><li><strong>Enseignant</strong> — Créer des cours, ajouter des leçons et exercices, voir les résultats</li><li><strong>Parent</strong> — Lier les comptes enfants, suivre la progression, communiquer avec les enseignants</li><li><strong>Admin</strong> — Contrôle total : gérer les utilisateurs, cours, analytique</li></ul></div>),
      en: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Role-Based Access Control</h3><p>Every user is assigned one role at signup determining dashboard access.</p><ul><li><strong>Student</strong> — Browse courses, complete exercises, earn badges</li><li><strong>Teacher</strong> — Create courses, add lessons & exercises, view results</li><li><strong>Parent</strong> — Link children, monitor progress, message teachers</li><li><strong>Admin</strong> — Full control: manage users, courses, analytics</li></ul></div>),
    },
    courses: {
      fr: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Gestion des cours</h3><h4>Pour les enseignants</h4><ol><li>Allez dans <strong>Tableau de bord → Créer un cours</strong></li><li>Remplissez le titre, la matière, le niveau et la description</li><li>Ajoutez des <strong>leçons</strong> avec du contenu et des vidéos YouTube</li><li>Ajoutez des <strong>exercices</strong> (QCM) avec des points</li><li><strong>Publiez</strong> le cours quand il est prêt</li></ol><h4>Pour les élèves</h4><ol><li>Parcourez les cours dans <strong>Tableau de bord → Cours</strong></li><li>Cliquez sur <strong>S'inscrire</strong> sur un cours gratuit</li><li>Ouvrez un cours → sélectionnez une leçon → complétez les exercices</li></ol></div>),
      en: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Course Management</h3><h4>For Teachers</h4><ol><li>Navigate to <strong>Dashboard → Create Course</strong></li><li>Enter title, subject, level, and description</li><li>Add <strong>lessons</strong> with content and YouTube videos</li><li>Add <strong>exercises</strong> (MCQ) with point values</li><li><strong>Publish</strong> when ready</li></ol><h4>For Students</h4><ol><li>Browse courses in <strong>Dashboard → Courses</strong></li><li>Click <strong>Enroll</strong> on a free course</li><li>Open a course → select a lesson → complete exercises</li></ol></div>),
    },
    admin: {
      fr: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Administration</h3><h4>Gestion des utilisateurs</h4><p><strong>Tableau de bord → Utilisateurs</strong> : voir, rechercher, filtrer et modifier les rôles.</p><h4>Gestion des cours</h4><p><strong>Tableau de bord → Gérer les cours</strong> : voir, publier/dépublier, modifier ou supprimer tout cours.</p><h4>Analytique</h4><p>Métriques globales : croissance, inscriptions, performances.</p></div>),
      en: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Administration</h3><h4>User Management</h4><p><strong>Dashboard → Users</strong>: view, search, filter and change roles.</p><h4>Course Management</h4><p><strong>Dashboard → Manage Courses</strong>: view, publish/unpublish, edit or delete any course.</p><h4>Analytics</h4><p>Platform-wide metrics: growth, enrollments, performance.</p></div>),
    },
    subscription: {
      fr: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Système d'abonnement</h3><p>Deux niveaux : <strong>Gratuit</strong> et <strong>Premium</strong>.</p><ul><li>Gratuit : cours publics, exercices limités, forum, suivi d'humeur</li><li>Premium : tout dans Gratuit + exercices illimités, analytique avancée, certificats</li></ul><h4>Flux de paiement</h4><ol><li>L'élève va sur la page <strong>Abonnement</strong></li><li>Clique sur <strong>Passer au Premium</strong></li><li>Redirigé vers le paiement Stripe</li><li>L'abonnement est activé immédiatement</li></ol></div>),
      en: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Subscription System</h3><p>Two tiers: <strong>Free</strong> and <strong>Premium</strong>.</p><ul><li>Free: public courses, limited exercises, forum, mood tracking</li><li>Premium: everything in Free + unlimited exercises, advanced analytics, certificates</li></ul><h4>Payment Flow</h4><ol><li>Student navigates to <strong>Subscription</strong> page</li><li>Clicks <strong>Upgrade to Premium</strong></li><li>Redirected to Stripe Checkout</li><li>Subscription activated immediately</li></ol></div>),
    },
    gamification: {
      fr: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Points & Badges</h3><h4>Points</h4><ul><li>Chaque exercice a une valeur en points (défaut : 10)</li><li>Points attribués pour les bonnes réponses</li><li>Les élèves peuvent reprendre les exercices</li></ul><h4>Badges</h4><ul><li>Créés par les admins avec un seuil de points</li><li>Obtenus automatiquement en atteignant le seuil</li><li>Affichés dans le profil et la page badges</li></ul></div>),
      en: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Points & Badges</h3><h4>Points</h4><ul><li>Each exercise has a configurable point value (default: 10)</li><li>Points awarded for correct answers</li><li>Students can retake exercises</li></ul><h4>Badges</h4><ul><li>Created by admins with a points threshold</li><li>Automatically earned when reaching the threshold</li><li>Displayed in profile and badges page</li></ul></div>),
    },
    forum: {
      fr: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Communication</h3><h4>Forum</h4><ul><li>Visibilité par rôle</li><li>Catégories pour organiser les discussions</li><li>Réponses en fil de discussion</li></ul><h4>Messagerie directe</h4><ul><li>Messages privés entre utilisateurs</li><li>Accusés de lecture</li></ul></div>),
      en: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Communication</h3><h4>Forum</h4><ul><li>Role-based visibility</li><li>Categories for organizing discussions</li><li>Threaded replies</li></ul><h4>Direct Messaging</h4><ul><li>Private messages between users</li><li>Read receipts</li></ul></div>),
    },
    accessibility: {
      fr: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Accessibilité</h3><ul><li><strong>Mode Dyslexie</strong> — Police OpenDyslexic avec espacement amélioré</li><li><strong>Multilingue</strong> — Support complet français et anglais</li><li><strong>Responsive</strong> — Mobile-first, fonctionne sur tous les appareils</li><li><strong>Suivi d'humeur</strong> — Les élèves enregistrent leur humeur quotidienne</li></ul><h4>Paramètres du profil</h4><p>Nom complet, avatar, langue, mode dyslexie.</p></div>),
      en: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Accessibility</h3><ul><li><strong>Dyslexia Mode</strong> — OpenDyslexic font with enhanced spacing</li><li><strong>Multi-language</strong> — Full French and English support</li><li><strong>Responsive</strong> — Mobile-first, works on all devices</li><li><strong>Mood Tracking</strong> — Students log daily moods</li></ul><h4>Profile Settings</h4><p>Full name, avatar, language, dyslexia mode.</p></div>),
    },
    mood: {
      fr: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Bien-être des élèves</h3><ul><li>Les élèves enregistrent leur humeur quotidienne (heureux, neutre, triste, frustré, excité)</li><li>Notes optionnelles</li><li>Les parents voient l'historique d'humeur</li><li>Aide à identifier les tendances</li></ul></div>),
      en: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Student Wellbeing</h3><ul><li>Students log daily mood (happy, neutral, sad, frustrated, excited)</li><li>Optional notes</li><li>Parents can view mood history</li><li>Helps identify patterns</li></ul></div>),
    },
  };

  return <>{content[sectionId]?.[lang] || content[sectionId]?.en || null}</>;
}
