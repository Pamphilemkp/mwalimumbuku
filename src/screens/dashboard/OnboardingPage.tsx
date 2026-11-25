"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/src/hooks/useAuth';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { 
  GraduationCap, Users, BookOpen, Shield, ChevronRight, ChevronLeft, 
  Play, CheckCircle2, Sparkles, Search, Trophy, MessageSquare, 
  Wrench, Gamepad2, BarChart3, Upload, Star
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { cn } from '@/src/lib/utils';

type RoleKey = 'student' | 'parent' | 'teacher' | 'admin';

interface Step {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  tips: string[];
}

function useRoleGuides() {
  const { t } = useLanguage();
  
  const guides: Record<RoleKey, { label: string; icon: React.ElementType; color: string; steps: Step[] }> = {
    student: {
      label: t.onboarding.roles.student,
      icon: GraduationCap,
      color: 'from-blue-500 to-cyan-500',
      steps: [
        { title: t.lang === 'fr' ? 'Explorer les cours' : 'Browse Courses', description: t.lang === 'fr' ? 'Parcourez le catalogue de cours disponibles. Filtrez par matière et par niveau. Inscrivez-vous aux cours gratuits en un clic !' : 'Browse the available course catalog. Filter by subject and level. Enroll in free courses with one click!', icon: Search, color: 'bg-blue-500/10 text-blue-600', tips: t.lang === 'fr' ? ['Les cours gratuits sont accessibles immédiatement', 'Les cours Premium nécessitent un abonnement', 'Vous pouvez vous désinscrire à tout moment'] : ['Free courses are instantly accessible', 'Premium courses require a subscription', 'You can unenroll at any time'] },
        { title: t.lang === 'fr' ? 'Suivre les leçons & exercices' : 'Follow Lessons & Exercises', description: t.lang === 'fr' ? 'Chaque cours contient des leçons avec du contenu, des vidéos et des exercices interactifs.' : 'Each course has lessons with content, videos and interactive exercises.', icon: BookOpen, color: 'bg-green-500/10 text-green-600', tips: t.lang === 'fr' ? ['Utilisez le lecteur vocal pour écouter les leçons', 'Vous pouvez reprendre un exercice', 'Les vidéos YouTube sont intégrées'] : ['Use the voice reader for lessons', 'You can retake exercises', 'YouTube videos are embedded'] },
        { title: t.lang === 'fr' ? 'Gagner des badges' : 'Earn Badges', description: t.lang === 'fr' ? 'Accumulez des points en répondant correctement. Débloquez des badges !' : 'Earn points by answering correctly. Unlock badges!', icon: Trophy, color: 'bg-amber-500/10 text-amber-600', tips: t.lang === 'fr' ? ['Chaque bonne réponse rapporte des points', 'Consultez la page Badges', 'Vos parents peuvent voir votre progression'] : ['Each correct answer earns points', 'Check the Badges page', 'Your parents can see your progress'] },
        { title: t.lang === 'fr' ? 'Boîte à outils' : 'Toolbox', description: t.lang === 'fr' ? 'Accédez à la calculatrice vocale, au correcteur, à la dictée vocale.' : 'Access the vocal calculator, spell checker, voice dictation.', icon: Wrench, color: 'bg-purple-500/10 text-purple-600', tips: t.lang === 'fr' ? ['La calculatrice comprend le français', 'Le correcteur détecte les fautes', 'La dictée utilise votre micro'] : ['Calculator understands French', 'Checker detects errors', 'Dictation uses your mic'] },
        { title: t.lang === 'fr' ? 'Jeux éducatifs' : 'Educational Games', description: t.lang === 'fr' ? 'Amusez-vous avec les jeux de mémoire, mots, maths et alphabet !' : 'Have fun with memory, word, math and alphabet games!', icon: Gamepad2, color: 'bg-pink-500/10 text-pink-600', tips: t.lang === 'fr' ? ['6 types de jeux', 'Choisissez votre niveau de difficulté', 'Les jeux renforcent vos apprentissages'] : ['6 game types', 'Choose your difficulty level', 'Games reinforce learning'] },
      ],
    },
    parent: {
      label: t.onboarding.roles.parent,
      icon: Users,
      color: 'from-emerald-500 to-teal-500',
      steps: [
        { title: t.lang === 'fr' ? 'Lier votre enfant' : 'Link Your Child', description: t.lang === 'fr' ? 'Allez dans "Mes enfants" et entrez l\'identifiant de votre enfant.' : 'Go to "My Children" and enter your child\'s ID.', icon: Users, color: 'bg-emerald-500/10 text-emerald-600', tips: t.lang === 'fr' ? ['Votre enfant doit d\'abord créer un compte', 'Vous pouvez lier plusieurs enfants'] : ['Your child must create an account first', 'You can link multiple children'] },
        { title: t.lang === 'fr' ? 'Suivre la progression' : 'Track Progress', description: t.lang === 'fr' ? 'Consultez les résultats et les badges de votre enfant.' : 'View your child\'s results and badges.', icon: BarChart3, color: 'bg-blue-500/10 text-blue-600', tips: t.lang === 'fr' ? ['Résultats en temps réel', 'Humeur quotidienne visible'] : ['Real-time results', 'Daily mood visible'] },
        { title: t.lang === 'fr' ? 'Communiquer' : 'Communicate', description: t.lang === 'fr' ? 'Utilisez la messagerie pour contacter les enseignants.' : 'Use messaging to contact teachers.', icon: MessageSquare, color: 'bg-purple-500/10 text-purple-600', tips: t.lang === 'fr' ? ['Messagerie directe et privée', 'Forum parents disponible'] : ['Direct private messaging', 'Parent forum available'] },
      ],
    },
    teacher: {
      label: t.onboarding.roles.teacher,
      icon: BookOpen,
      color: 'from-orange-500 to-amber-500',
      steps: [
        { title: t.lang === 'fr' ? 'Créer un cours' : 'Create a Course', description: t.lang === 'fr' ? 'Utilisez le formulaire pour créer un cours avec matière, niveau et contenu.' : 'Use the form to create a course with subject, level and content.', icon: BookOpen, color: 'bg-orange-500/10 text-orange-600', tips: t.lang === 'fr' ? ['Code d\'accès requis à l\'inscription', 'Cours en brouillon non visibles'] : ['Access code required at signup', 'Draft courses not visible'] },
        { title: t.lang === 'fr' ? 'Ajouter leçons & vidéos' : 'Add Lessons & Videos', description: t.lang === 'fr' ? 'Ajoutez des leçons avec texte, liens YouTube et exercices.' : 'Add lessons with text, YouTube links and exercises.', icon: Upload, color: 'bg-blue-500/10 text-blue-600', tips: t.lang === 'fr' ? ['Collez un lien YouTube', 'Au moins 2 options par exercice'] : ['Paste a YouTube link', 'At least 2 options per exercise'] },
        { title: t.lang === 'fr' ? 'Voir les résultats' : 'View Results', description: t.lang === 'fr' ? 'Consultez les résultats de vos élèves.' : 'View your students\' results.', icon: Star, color: 'bg-green-500/10 text-green-600', tips: t.lang === 'fr' ? ['Notes et commentaires par devoir', 'Résultats par cours'] : ['Grades and comments per assignment', 'Results per course'] },
      ],
    },
    admin: {
      label: t.onboarding.roles.admin,
      icon: Shield,
      color: 'from-red-500 to-rose-500',
      steps: [
        { title: t.lang === 'fr' ? 'Gérer les utilisateurs' : 'Manage Users', description: t.lang === 'fr' ? 'Visualisez tous les utilisateurs, rôles et statuts.' : 'View all users, roles and statuses.', icon: Users, color: 'bg-red-500/10 text-red-600', tips: t.lang === 'fr' ? ['Filtrez par rôle', 'Modérez les comptes'] : ['Filter by role', 'Moderate accounts'] },
        { title: t.lang === 'fr' ? 'Gérer les cours' : 'Manage Courses', description: t.lang === 'fr' ? 'Accédez à tous les cours, modérez le contenu.' : 'Access all courses, moderate content.', icon: BookOpen, color: 'bg-blue-500/10 text-blue-600', tips: t.lang === 'fr' ? ['Modifier ou supprimer tout cours', 'Gérer les badges'] : ['Edit or delete any course', 'Manage badges'] },
        { title: t.lang === 'fr' ? 'Consulter les analytics' : 'View Analytics', description: t.lang === 'fr' ? 'Tableau de bord analytique complet.' : 'Complete analytics dashboard.', icon: BarChart3, color: 'bg-purple-500/10 text-purple-600', tips: t.lang === 'fr' ? ['Croissance de la plateforme', 'Cours les plus populaires'] : ['Platform growth', 'Most popular courses'] },
      ],
    },
  };
  return guides;
}

export default function OnboardingPage() {
  const { role } = useAuth();
  const { t } = useLanguage();
  const guides = useRoleGuides();
  const [selectedRole, setSelectedRole] = useState<RoleKey>((role as RoleKey) || 'student');
  const [currentStep, setCurrentStep] = useState(0);

  const guide = guides[selectedRole];
  const step = guide.steps[currentStep];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Play className="h-5 w-5 text-primary" /></div>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">{t.onboarding.title}</h1>
          <p className="text-muted-foreground">{t.onboarding.subtitle}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.entries(guides) as [RoleKey, typeof guide][]).map(([key, g]) => (
          <button key={key} onClick={() => { setSelectedRole(key); setCurrentStep(0); }}
            className={cn('flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
              selectedRole === key ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
            <g.icon className="h-4 w-4" />{g.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {guide.steps.map((_, i) => (
          <button key={i} onClick={() => setCurrentStep(i)}
            className={cn('h-2.5 rounded-full transition-all', currentStep === i ? 'w-8 bg-primary' : 'w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50')} />
        ))}
        <span className="ml-2 text-sm text-muted-foreground">{t.onboarding.step} {currentStep + 1} / {guide.steps.length}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={`${selectedRole}-${currentStep}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
          className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className={cn('bg-gradient-to-r p-6 text-white', guide.color)}>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm"><step.icon className="h-6 w-6" /></div>
              <div>
                <Badge variant="secondary" className="mb-1 bg-white/20 text-white border-white/30 text-xs">{t.onboarding.step} {currentStep + 1}</Badge>
                <h2 className="font-display text-2xl font-bold">{step.title}</h2>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <p className="text-foreground/90 leading-relaxed text-base">{step.description}</p>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> {t.onboarding.tips}</h3>
              {step.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-lg bg-muted/50 p-3">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span className="text-sm text-foreground/80">{tip}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <Button variant="ghost" onClick={() => setCurrentStep((p) => p - 1)} disabled={currentStep === 0} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> {t.onboarding.previous}
            </Button>
            <Button onClick={() => setCurrentStep((p) => p + 1)} disabled={currentStep === guide.steps.length - 1} className="gap-1">
              {t.onboarding.next} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
