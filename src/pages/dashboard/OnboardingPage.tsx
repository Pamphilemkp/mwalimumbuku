import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { 
  GraduationCap, Users, BookOpen, Shield, ChevronRight, ChevronLeft, 
  Play, CheckCircle2, Sparkles, Search, Trophy, MessageSquare, 
  Wrench, Gamepad2, BarChart3, Upload, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type RoleKey = 'student' | 'parent' | 'teacher' | 'admin';

interface Step {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  tips: string[];
}

const ROLE_GUIDES: Record<RoleKey, { label: string; icon: React.ElementType; color: string; steps: Step[] }> = {
  student: {
    label: 'Élève',
    icon: GraduationCap,
    color: 'from-blue-500 to-cyan-500',
    steps: [
      {
        title: 'Explorer les cours',
        description: 'Parcourez le catalogue de cours disponibles. Filtrez par matière (Mathématiques, Français, Sciences...) et par niveau. Inscrivez-vous aux cours gratuits en un clic !',
        icon: Search,
        color: 'bg-blue-500/10 text-blue-600',
        tips: ['Les cours gratuits sont accessibles immédiatement', 'Les cours Premium nécessitent un abonnement', 'Vous pouvez vous désinscrire à tout moment'],
      },
      {
        title: 'Suivre les leçons & exercices',
        description: 'Chaque cours contient des leçons avec du contenu, des vidéos et des exercices interactifs à choix multiples. Répondez aux questions pour gagner des points !',
        icon: BookOpen,
        color: 'bg-green-500/10 text-green-600',
        tips: ['Utilisez le lecteur vocal pour écouter les leçons', 'Vous pouvez reprendre un exercice pour améliorer votre score', 'Les vidéos YouTube sont intégrées directement dans les leçons'],
      },
      {
        title: 'Gagner des badges & suivre ta progression',
        description: 'Accumulez des points en répondant correctement aux exercices. Débloquez des badges en atteignant les seuils de points requis. Suivez votre progression globale.',
        icon: Trophy,
        color: 'bg-amber-500/10 text-amber-600',
        tips: ['Chaque bonne réponse rapporte des points', 'Consultez la page Badges pour voir ceux disponibles', 'Vos parents peuvent aussi voir votre progression'],
      },
      {
        title: 'Utiliser la boîte à outils',
        description: 'Accédez à la calculatrice vocale, au correcteur orthographique, à la dictée vocale, au lecteur de texte et à l\'enregistreur audio.',
        icon: Wrench,
        color: 'bg-purple-500/10 text-purple-600',
        tips: ['La calculatrice comprend les commandes en français', 'Le correcteur détecte les fautes courantes', 'La dictée vocale utilise le micro de votre appareil'],
      },
      {
        title: 'Jouer aux jeux éducatifs',
        description: 'Amusez-vous avec les jeux de mémoire, de mots, de mathématiques et d\'alphabet. C\'est une façon ludique de renforcer vos apprentissages !',
        icon: Gamepad2,
        color: 'bg-pink-500/10 text-pink-600',
        tips: ['4 types de jeux disponibles', 'Vos scores sont sauvegardés', 'Les jeux s\'adaptent à votre niveau'],
      },
    ],
  },
  parent: {
    label: 'Parent',
    icon: Users,
    color: 'from-emerald-500 to-teal-500',
    steps: [
      {
        title: 'Lier votre enfant',
        description: 'Allez dans "Mes enfants" et entrez l\'identifiant de votre enfant pour le lier à votre compte. Vous pourrez ensuite suivre sa progression.',
        icon: Users,
        color: 'bg-emerald-500/10 text-emerald-600',
        tips: ['Votre enfant doit d\'abord créer un compte "Élève"', 'Vous pouvez lier plusieurs enfants', 'Le lien est sécurisé et vérifiable'],
      },
      {
        title: 'Suivre la progression',
        description: 'Consultez les résultats, les points accumulés et les badges obtenus par votre enfant. Voyez quels cours il suit et ses performances.',
        icon: BarChart3,
        color: 'bg-blue-500/10 text-blue-600',
        tips: ['Les résultats sont mis à jour en temps réel', 'Vous voyez aussi l\'humeur quotidienne de votre enfant', 'Les statistiques détaillées sont disponibles'],
      },
      {
        title: 'Communiquer avec les enseignants',
        description: 'Utilisez la messagerie pour contacter directement les enseignants. Participez au forum réservé aux parents pour échanger avec d\'autres parents.',
        icon: MessageSquare,
        color: 'bg-purple-500/10 text-purple-600',
        tips: ['Le forum parents est séparé du forum élèves', 'La messagerie est directe et privée', 'Vous recevez des notifications'],
      },
    ],
  },
  teacher: {
    label: 'Enseignant',
    icon: BookOpen,
    color: 'from-orange-500 to-amber-500',
    steps: [
      {
        title: 'Créer un cours',
        description: 'Utilisez le formulaire en 2 étapes pour créer un cours : choisissez la matière, le niveau, puis ajoutez le contenu. Vous pouvez marquer un cours comme Premium.',
        icon: BookOpen,
        color: 'bg-orange-500/10 text-orange-600',
        tips: ['Un code d\'accès enseignant est requis à l\'inscription', 'Vous pouvez créer autant de cours que souhaité', 'Les cours en brouillon ne sont pas visibles par les élèves'],
      },
      {
        title: 'Ajouter des leçons, vidéos & exercices',
        description: 'Dans l\'éditeur de cours, ajoutez des leçons avec du contenu texte, des liens YouTube et des exercices à choix multiples avec un système de points.',
        icon: Upload,
        color: 'bg-blue-500/10 text-blue-600',
        tips: ['Collez un lien YouTube dans le champ vidéo', 'Ajoutez au moins 2 options par exercice', 'Définissez les points par exercice (par défaut : 10)'],
      },
      {
        title: 'Corriger les devoirs & voir les résultats',
        description: 'Consultez les devoirs soumis par les élèves, attribuez des notes et des commentaires. Suivez les résultats globaux de vos cours.',
        icon: Star,
        color: 'bg-green-500/10 text-green-600',
        tips: ['Les élèves peuvent téléverser des fichiers PDF/images', 'Vous pouvez noter et commenter chaque devoir', 'Les résultats sont accessibles par cours'],
      },
    ],
  },
  admin: {
    label: 'Administrateur',
    icon: Shield,
    color: 'from-red-500 to-rose-500',
    steps: [
      {
        title: 'Gérer les utilisateurs',
        description: 'Visualisez tous les utilisateurs de la plateforme, leurs rôles et statuts. Gérez les comptes et les permissions.',
        icon: Users,
        color: 'bg-red-500/10 text-red-600',
        tips: ['Filtrez par rôle (élève, parent, enseignant)', 'Accédez aux statistiques par utilisateur', 'Modérez les comptes si nécessaire'],
      },
      {
        title: 'Gérer les cours & contenus',
        description: 'Accédez à tous les cours, publiés ou en brouillon. Modérez le contenu, gérez les inscriptions et supervisez la qualité pédagogique.',
        icon: BookOpen,
        color: 'bg-blue-500/10 text-blue-600',
        tips: ['Vous pouvez modifier ou supprimer tout cours', 'Gérez les badges et récompenses', 'Modérez le forum et les messages'],
      },
      {
        title: 'Consulter les analytics',
        description: 'Accédez au tableau de bord analytique complet : utilisateurs actifs, inscriptions, revenus, performances par cours et par matière.',
        icon: BarChart3,
        color: 'bg-purple-500/10 text-purple-600',
        tips: ['Suivez la croissance de la plateforme', 'Identifiez les cours les plus populaires', 'Monitorez les abonnements Premium'],
      },
    ],
  },
};

export default function OnboardingPage() {
  const { role } = useAuth();
  const [selectedRole, setSelectedRole] = useState<RoleKey>((role as RoleKey) || 'student');
  const [currentStep, setCurrentStep] = useState(0);

  const guide = ROLE_GUIDES[selectedRole];
  const step = guide.steps[currentStep];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Play className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Guide d'utilisation</h1>
          <p className="text-muted-foreground">Apprenez à utiliser Mwalimu selon votre rôle</p>
        </div>
      </div>

      {/* Role selector */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(ROLE_GUIDES) as [RoleKey, typeof guide][]).map(([key, g]) => (
          <button
            key={key}
            onClick={() => { setSelectedRole(key); setCurrentStep(0); }}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
              selectedRole === key
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <g.icon className="h-4 w-4" />
            {g.label}
          </button>
        ))}
      </div>

      {/* Step navigation dots */}
      <div className="flex items-center gap-2">
        {guide.steps.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentStep(i)}
            className={cn(
              'h-2.5 rounded-full transition-all',
              currentStep === i ? 'w-8 bg-primary' : 'w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
            )}
          />
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          Étape {currentStep + 1} / {guide.steps.length}
        </span>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${selectedRole}-${currentStep}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          {/* Header */}
          <div className={cn('bg-gradient-to-r p-6 text-white', guide.color)}>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <step.icon className="h-6 w-6" />
              </div>
              <div>
                <Badge variant="secondary" className="mb-1 bg-white/20 text-white border-white/30 text-xs">
                  Étape {currentStep + 1}
                </Badge>
                <h2 className="font-display text-2xl font-bold">{step.title}</h2>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            <p className="text-foreground/90 leading-relaxed text-base">{step.description}</p>

            {/* Tips */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Conseils
              </h3>
              {step.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-lg bg-muted/50 p-3">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span className="text-sm text-foreground/80">{tip}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <Button
              variant="ghost"
              onClick={() => setCurrentStep((p) => p - 1)}
              disabled={currentStep === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Précédent
            </Button>
            <Button
              onClick={() => setCurrentStep((p) => p + 1)}
              disabled={currentStep === guide.steps.length - 1}
              className="gap-1"
            >
              Suivant <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
