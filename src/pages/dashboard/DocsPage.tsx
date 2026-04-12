import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, Users, GraduationCap, Shield, CreditCard, MessageCircle, Award, Smile, Settings, ChevronRight, Gamepad2, Wrench } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { AppRole } from '@/lib/auth';

// Define which sections each role can see
const roleSections: Record<string, string[]> = {
  student: ['overview', 'courses', 'gamification', 'forum', 'games', 'toolbox', 'mood', 'accessibility'],
  parent: ['overview', 'parenting', 'forum', 'mood', 'accessibility'],
  teacher: ['overview', 'courses', 'teacherGuide', 'forum', 'gamification', 'accessibility'],
  admin: ['overview', 'roles', 'courses', 'admin', 'teacherGuide', 'parenting', 'subscription', 'gamification', 'forum', 'games', 'toolbox', 'mood', 'accessibility'],
};

const sectionIcons: Record<string, any> = {
  overview: BookOpen,
  roles: Users,
  courses: GraduationCap,
  admin: Shield,
  subscription: CreditCard,
  gamification: Award,
  forum: MessageCircle,
  accessibility: Settings,
  mood: Smile,
  teacherGuide: GraduationCap,
  parenting: Users,
  games: Gamepad2,
  toolbox: Wrench,
};

export default function DocsPage() {
  const { t } = useLanguage();
  const { role } = useAuth();
  const userRole = role || 'student';
  const visibleSections = roleSections[userRole] || roleSections.student;
  const [activeSection, setActiveSection] = useState(visibleSections[0]);

  const sectionTitle = (id: string) => {
    const titles: Record<string, Record<string, string>> = {
      overview: { fr: 'Vue d\'ensemble', en: 'Overview' },
      roles: { fr: 'Rôles', en: 'Roles' },
      courses: { fr: 'Cours', en: 'Courses' },
      admin: { fr: 'Administration', en: 'Administration' },
      subscription: { fr: 'Abonnement', en: 'Subscription' },
      gamification: { fr: 'Points & Badges', en: 'Points & Badges' },
      forum: { fr: 'Forum & Messages', en: 'Forum & Messages' },
      accessibility: { fr: 'Accessibilité', en: 'Accessibility' },
      mood: { fr: 'Bien-être', en: 'Wellbeing' },
      teacherGuide: { fr: 'Guide Enseignant', en: 'Teacher Guide' },
      parenting: { fr: 'Suivi Parental', en: 'Parental Monitoring' },
      games: { fr: 'Jeux Éducatifs', en: 'Educational Games' },
      toolbox: { fr: 'Boîte à Outils', en: 'Toolbox' },
    };
    const lang = t === (t as any) ? 'fr' : 'en';
    return titles[id]?.[lang] || titles[id]?.fr || id;
  };

  const { lang } = useLanguage();
  const getSectionTitle = (id: string) => {
    const titles: Record<string, Record<string, string>> = {
      overview: { fr: 'Vue d\'ensemble', en: 'Overview' },
      roles: { fr: 'Rôles', en: 'Roles' },
      courses: { fr: 'Cours', en: 'Courses' },
      admin: { fr: 'Administration', en: 'Administration' },
      subscription: { fr: 'Abonnement', en: 'Subscription' },
      gamification: { fr: 'Points & Badges', en: 'Points & Badges' },
      forum: { fr: 'Forum & Messages', en: 'Forum & Messages' },
      accessibility: { fr: 'Accessibilité', en: 'Accessibility' },
      mood: { fr: 'Bien-être', en: 'Wellbeing' },
      teacherGuide: { fr: 'Guide Enseignant', en: 'Teacher Guide' },
      parenting: { fr: 'Suivi Parental', en: 'Parental Monitoring' },
      games: { fr: 'Jeux Éducatifs', en: 'Educational Games' },
      toolbox: { fr: 'Boîte à Outils', en: 'Toolbox' },
    };
    return titles[id]?.[lang] || titles[id]?.fr || id;
  };

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
          {visibleSections.map((sId) => {
            const Icon = sectionIcons[sId] || BookOpen;
            return (
              <button key={sId} onClick={() => setActiveSection(sId)}
                className={cn('flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all',
                  activeSection === sId ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                <Icon className="h-4 w-4 shrink-0" />{getSectionTitle(sId)}
              </button>
            );
          })}
        </nav>
        <AnimatePresence mode="wait">
          <motion.div key={activeSection} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <DocContent sectionId={activeSection} userRole={userRole} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function DocContent({ sectionId, userRole }: { sectionId: string; userRole: string }) {
  const { lang } = useLanguage();

  const content: Record<string, Record<string, React.ReactNode>> = {
    overview: {
      fr: userRole === 'student' ? (
        <div className="prose prose-sm max-w-none text-foreground/90">
          <h3 className="font-display text-lg font-semibold text-foreground">Bienvenue sur Mwalimu Mbuku 🎓</h3>
          <p>Tu es sur ta plateforme d'apprentissage ! Voici ce que tu peux faire :</p>
          <ul>
            <li><strong>📚 Parcourir les cours</strong> — Inscris-toi à des cours et apprends à ton rythme</li>
            <li><strong>✏️ Faire des exercices</strong> — Réponds aux questions et gagne des points</li>
            <li><strong>🏆 Gagner des badges</strong> — Accumule des points pour débloquer des récompenses</li>
            <li><strong>🎮 Jouer à des jeux éducatifs</strong> — Apprends en t'amusant avec des jeux chronométrés</li>
            <li><strong>🧰 Boîte à outils</strong> — Calculatrice vocale, correcteur, synthèse vocale</li>
            <li><strong>💬 Forum</strong> — Échange avec les autres élèves et enseignants</li>
            <li><strong>😊 Humeur du jour</strong> — Enregistre comment tu te sens chaque jour</li>
          </ul>
        </div>
      ) : userRole === 'parent' ? (
        <div className="prose prose-sm max-w-none text-foreground/90">
          <h3 className="font-display text-lg font-semibold text-foreground">Bienvenue sur Mwalimu Mbuku 👨‍👩‍👧</h3>
          <p>En tant que parent, vous pouvez suivre la scolarité de votre enfant :</p>
          <ul>
            <li><strong>👶 Lier votre enfant</strong> — Associez le compte de votre enfant au vôtre</li>
            <li><strong>📊 Suivre sa progression</strong> — Voyez ses résultats, points et badges</li>
            <li><strong>😊 Voir son humeur</strong> — Consultez l'historique d'humeur quotidienne</li>
            <li><strong>💬 Communiquer</strong> — Envoyez des messages aux enseignants</li>
            <li><strong>📋 Forum</strong> — Participez aux discussions de la communauté</li>
          </ul>
        </div>
      ) : userRole === 'teacher' ? (
        <div className="prose prose-sm max-w-none text-foreground/90">
          <h3 className="font-display text-lg font-semibold text-foreground">Bienvenue sur Mwalimu Mbuku 👨‍🏫</h3>
          <p>En tant qu'enseignant, vous disposez d'outils puissants :</p>
          <ul>
            <li><strong>📚 Créer des cours</strong> — Concevez des cours avec leçons et exercices</li>
            <li><strong>📝 Gérer les devoirs</strong> — Créez des devoirs et corrigez les soumissions</li>
            <li><strong>📊 Voir les résultats</strong> — Suivez les performances de vos élèves</li>
            <li><strong>💬 Communiquer</strong> — Forum et messagerie avec élèves et parents</li>
          </ul>
        </div>
      ) : (
        <div className="prose prose-sm max-w-none text-foreground/90">
          <h3 className="font-display text-lg font-semibold text-foreground">Administration - Mwalimu Mbuku 🛡️</h3>
          <p>En tant qu'administrateur, vous avez le <strong>contrôle total</strong> de la plateforme :</p>
          <ul>
            <li><strong>👥 Gestion des utilisateurs</strong> — Voir, modifier les rôles, ajouter des enseignants</li>
            <li><strong>📚 Gestion des cours</strong> — Créer, modifier, supprimer tout cours</li>
            <li><strong>📊 Analytique</strong> — Statistiques complètes de la plateforme</li>
            <li><strong>👨‍👩‍👧 Association parent-élève</strong> — Lier les comptes parents et élèves</li>
            <li><strong>🏆 Badges</strong> — Créer et gérer les badges de récompense</li>
            <li><strong>💳 Abonnements</strong> — Gérer les abonnements des utilisateurs</li>
            <li><strong>💬 Modération</strong> — Modérer le forum et les messages</li>
            <li><strong>🔒 Sécurité</strong> — Contrôle complet des accès et permissions</li>
          </ul>
        </div>
      ),
      en: userRole === 'student' ? (
        <div className="prose prose-sm max-w-none text-foreground/90">
          <h3 className="font-display text-lg font-semibold text-foreground">Welcome to Mwalimu Mbuku 🎓</h3>
          <p>This is your learning platform! Here's what you can do:</p>
          <ul>
            <li><strong>📚 Browse courses</strong> — Enroll in courses and learn at your pace</li>
            <li><strong>✏️ Do exercises</strong> — Answer questions and earn points</li>
            <li><strong>🏆 Earn badges</strong> — Accumulate points to unlock rewards</li>
            <li><strong>🎮 Play educational games</strong> — Learn while having fun with timed games</li>
            <li><strong>🧰 Toolbox</strong> — Voice calculator, spell checker, text-to-speech</li>
            <li><strong>💬 Forum</strong> — Chat with other students and teachers</li>
            <li><strong>😊 Daily mood</strong> — Log how you feel each day</li>
          </ul>
        </div>
      ) : userRole === 'parent' ? (
        <div className="prose prose-sm max-w-none text-foreground/90">
          <h3 className="font-display text-lg font-semibold text-foreground">Welcome to Mwalimu Mbuku 👨‍👩‍👧</h3>
          <p>As a parent, you can track your child's education:</p>
          <ul>
            <li><strong>👶 Link your child</strong> — Connect your child's account to yours</li>
            <li><strong>📊 Track progress</strong> — View results, points and badges</li>
            <li><strong>😊 View mood</strong> — Check daily mood history</li>
            <li><strong>💬 Communicate</strong> — Message teachers directly</li>
            <li><strong>📋 Forum</strong> — Join community discussions</li>
          </ul>
        </div>
      ) : userRole === 'teacher' ? (
        <div className="prose prose-sm max-w-none text-foreground/90">
          <h3 className="font-display text-lg font-semibold text-foreground">Welcome to Mwalimu Mbuku 👨‍🏫</h3>
          <p>As a teacher, you have powerful tools:</p>
          <ul>
            <li><strong>📚 Create courses</strong> — Design courses with lessons and exercises</li>
            <li><strong>📝 Manage assignments</strong> — Create assignments and grade submissions</li>
            <li><strong>📊 View results</strong> — Track student performance</li>
            <li><strong>💬 Communicate</strong> — Forum and messaging with students and parents</li>
          </ul>
        </div>
      ) : (
        <div className="prose prose-sm max-w-none text-foreground/90">
          <h3 className="font-display text-lg font-semibold text-foreground">Administration - Mwalimu Mbuku 🛡️</h3>
          <p>As an administrator, you have <strong>full control</strong> over the platform:</p>
          <ul>
            <li><strong>👥 User management</strong> — View, change roles, add teachers</li>
            <li><strong>📚 Course management</strong> — Create, edit, delete any course</li>
            <li><strong>📊 Analytics</strong> — Full platform statistics</li>
            <li><strong>👨‍👩‍👧 Parent-student linking</strong> — Associate parent and student accounts</li>
            <li><strong>🏆 Badges</strong> — Create and manage reward badges</li>
            <li><strong>💳 Subscriptions</strong> — Manage user subscriptions</li>
            <li><strong>💬 Moderation</strong> — Moderate forum and messages</li>
            <li><strong>🔒 Security</strong> — Full access and permission control</li>
          </ul>
        </div>
      ),
    },
    courses: {
      fr: userRole === 'teacher' || userRole === 'admin' ? (
        <div className="prose prose-sm max-w-none text-foreground/90">
          <h3 className="font-display text-lg font-semibold text-foreground">Gestion des cours</h3>
          <h4>Créer un cours</h4>
          <ol>
            <li>Allez dans <strong>Créer un cours</strong></li>
            <li>Remplissez le titre, la matière, le niveau et la description</li>
            <li>Ajoutez des <strong>leçons</strong> avec du contenu et des vidéos</li>
            <li>Ajoutez des <strong>exercices</strong> (QCM) avec des points</li>
            <li><strong>Publiez</strong> quand le cours est prêt</li>
          </ol>
          <h4>Suivi des élèves</h4>
          <ul>
            <li>Voyez qui est inscrit à vos cours</li>
            <li>Consultez les résultats et performances</li>
            <li>Corrigez les devoirs soumis</li>
          </ul>
        </div>
      ) : (
        <div className="prose prose-sm max-w-none text-foreground/90">
          <h3 className="font-display text-lg font-semibold text-foreground">Cours</h3>
          <h4>Comment s'inscrire</h4>
          <ol>
            <li>Va dans <strong>Cours</strong> depuis le menu</li>
            <li>Parcours les cours disponibles</li>
            <li>Clique sur <strong>S'inscrire</strong> sur un cours qui t'intéresse</li>
            <li>Ouvre le cours → sélectionne une leçon → fais les exercices</li>
          </ol>
          <h4>Gagner des points</h4>
          <ul>
            <li>Chaque exercice vaut des points</li>
            <li>Réponds correctement pour gagner des points</li>
            <li>Les points servent à débloquer des badges</li>
          </ul>
        </div>
      ),
      en: userRole === 'teacher' || userRole === 'admin' ? (
        <div className="prose prose-sm max-w-none text-foreground/90">
          <h3 className="font-display text-lg font-semibold text-foreground">Course Management</h3>
          <h4>Create a course</h4>
          <ol>
            <li>Go to <strong>Create Course</strong></li>
            <li>Enter title, subject, level and description</li>
            <li>Add <strong>lessons</strong> with content and videos</li>
            <li>Add <strong>exercises</strong> (MCQ) with point values</li>
            <li><strong>Publish</strong> when the course is ready</li>
          </ol>
          <h4>Student tracking</h4>
          <ul>
            <li>See who is enrolled in your courses</li>
            <li>View results and performance</li>
            <li>Grade submitted assignments</li>
          </ul>
        </div>
      ) : (
        <div className="prose prose-sm max-w-none text-foreground/90">
          <h3 className="font-display text-lg font-semibold text-foreground">Courses</h3>
          <h4>How to enroll</h4>
          <ol>
            <li>Go to <strong>Courses</strong> from the menu</li>
            <li>Browse available courses</li>
            <li>Click <strong>Enroll</strong> on a course you like</li>
            <li>Open the course → select a lesson → do exercises</li>
          </ol>
          <h4>Earning points</h4>
          <ul>
            <li>Each exercise is worth points</li>
            <li>Answer correctly to earn points</li>
            <li>Points unlock badges</li>
          </ul>
        </div>
      ),
    },
    gamification: {
      fr: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Points & Badges 🏆</h3><h4>Comment gagner des points</h4><ul><li>Chaque exercice a une valeur en points (défaut : 10)</li><li>Les points sont attribués pour les bonnes réponses</li><li>Les jeux éducatifs rapportent aussi des points selon ta performance</li></ul><h4>Badges</h4><ul><li>Les badges sont débloqués automatiquement en atteignant un seuil de points</li><li>Ils sont affichés sur ton profil</li><li>Continue à apprendre pour tous les collecter !</li></ul></div>),
      en: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Points & Badges 🏆</h3><h4>How to earn points</h4><ul><li>Each exercise has a point value (default: 10)</li><li>Points awarded for correct answers</li><li>Educational games also award points based on performance</li></ul><h4>Badges</h4><ul><li>Badges are automatically unlocked when reaching a points threshold</li><li>They are displayed on your profile</li><li>Keep learning to collect them all!</li></ul></div>),
    },
    forum: {
      fr: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Forum & Messagerie 💬</h3><h4>Forum</h4><ul><li>Poste des questions ou partage des idées</li><li>Les discussions sont visibles selon ton rôle</li><li>Réponds aux fils de discussion</li></ul><h4>Messagerie</h4><ul><li>Envoie des messages privés aux autres utilisateurs</li><li>Vois quand tes messages sont lus</li></ul></div>),
      en: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Forum & Messaging 💬</h3><h4>Forum</h4><ul><li>Post questions or share ideas</li><li>Discussions are visible based on your role</li><li>Reply to threads</li></ul><h4>Messaging</h4><ul><li>Send private messages to other users</li><li>See when your messages are read</li></ul></div>),
    },
    games: {
      fr: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Jeux Éducatifs 🎮</h3><p>Apprends en t'amusant avec nos jeux chronométrés !</p><h4>Jeux disponibles</h4><ul><li><strong>Jeu de Mémoire</strong> — Trouve les paires de cartes</li><li><strong>Calcul Mental</strong> — Résous des opérations mathématiques</li><li><strong>Mots Mélangés</strong> — Remets les lettres dans l'ordre</li><li><strong>Alphabet</strong> — Complète les séquences de lettres</li><li><strong>Couleurs</strong> — Associe les couleurs correctement</li><li><strong>Dactylographie</strong> — Améliore ta vitesse de frappe</li></ul><h4>Niveaux de difficulté</h4><ul><li><strong>Facile</strong> — 2 minutes, parfait pour débuter</li><li><strong>Moyen</strong> — 1 minute 30, un défi équilibré</li><li><strong>Difficile</strong> — 1 minute, pour les experts !</li></ul></div>),
      en: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Educational Games 🎮</h3><p>Learn while having fun with our timed games!</p><h4>Available games</h4><ul><li><strong>Memory Game</strong> — Find matching card pairs</li><li><strong>Mental Math</strong> — Solve math operations</li><li><strong>Word Scramble</strong> — Unscramble letters</li><li><strong>Alphabet</strong> — Complete letter sequences</li><li><strong>Colors</strong> — Match colors correctly</li><li><strong>Typing</strong> — Improve your typing speed</li></ul><h4>Difficulty levels</h4><ul><li><strong>Easy</strong> — 2 minutes, perfect for beginners</li><li><strong>Medium</strong> — 1 minute 30, balanced challenge</li><li><strong>Hard</strong> — 1 minute, for experts!</li></ul></div>),
    },
    toolbox: {
      fr: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Boîte à Outils 🧰</h3><p>Des outils pratiques pour t'aider dans ton apprentissage :</p><ul><li><strong>🔊 Synthèse vocale</strong> — Écoute n'importe quel texte lu à haute voix</li><li><strong>🎤 Reconnaissance vocale</strong> — Dicte du texte avec ta voix</li><li><strong>🧮 Calculatrice vocale</strong> — Fais des calculs en parlant</li><li><strong>📝 Correcteur orthographique</strong> — Vérifie l'orthographe de tes textes</li></ul></div>),
      en: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Toolbox 🧰</h3><p>Practical tools to help you learn:</p><ul><li><strong>🔊 Text-to-Speech</strong> — Listen to any text read aloud</li><li><strong>🎤 Speech Recognition</strong> — Dictate text with your voice</li><li><strong>🧮 Voice Calculator</strong> — Do math calculations by speaking</li><li><strong>📝 Spell Checker</strong> — Check the spelling of your texts</li></ul></div>),
    },
    mood: {
      fr: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Bien-être 😊</h3><ul><li>Enregistre ton humeur chaque jour (heureux, neutre, triste, frustré, excité)</li><li>Ajoute une note optionnelle pour expliquer</li><li>Suis l'évolution de ton humeur au fil du temps</li>{userRole === 'parent' && <li>En tant que parent, vous pouvez voir l'historique d'humeur de votre enfant</li>}</ul></div>),
      en: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Wellbeing 😊</h3><ul><li>Log your mood every day (happy, neutral, sad, frustrated, excited)</li><li>Add an optional note to explain</li><li>Track how your mood evolves over time</li>{userRole === 'parent' && <li>As a parent, you can view your child's mood history</li>}</ul></div>),
    },
    accessibility: {
      fr: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Accessibilité ♿</h3><ul><li><strong>Mode Dyslexie</strong> — Police spéciale avec espacement amélioré</li><li><strong>Multilingue</strong> — Français et Anglais disponibles</li><li><strong>Responsive</strong> — Fonctionne parfaitement sur téléphone, tablette et ordinateur</li></ul><h4>Comment changer les paramètres</h4><ol><li>Va dans <strong>Profil</strong> depuis le menu</li><li>Active/désactive le <strong>Mode Dyslexie</strong></li><li>Change la <strong>Langue</strong> avec le bouton en haut</li></ol></div>),
      en: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Accessibility ♿</h3><ul><li><strong>Dyslexia Mode</strong> — Special font with enhanced spacing</li><li><strong>Multi-language</strong> — French and English available</li><li><strong>Responsive</strong> — Works perfectly on phone, tablet and desktop</li></ul><h4>How to change settings</h4><ol><li>Go to <strong>Profile</strong> from the menu</li><li>Toggle <strong>Dyslexia Mode</strong></li><li>Change <strong>Language</strong> with the button at the top</li></ol></div>),
    },
    roles: {
      fr: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Contrôle d'accès par rôle</h3><p>Chaque utilisateur a un rôle qui détermine ses accès :</p><ul><li><strong>Élève</strong> — Parcourir les cours, exercices, jeux, badges</li><li><strong>Parent</strong> — Suivre la progression de ses enfants</li><li><strong>Enseignant</strong> — Créer des cours, gérer les devoirs (ajouté par l'admin uniquement)</li><li><strong>Admin</strong> — Contrôle total de toute la plateforme</li></ul></div>),
      en: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Role-Based Access Control</h3><p>Each user has a role that determines their access:</p><ul><li><strong>Student</strong> — Browse courses, exercises, games, badges</li><li><strong>Parent</strong> — Track children's progress</li><li><strong>Teacher</strong> — Create courses, manage assignments (added by admin only)</li><li><strong>Admin</strong> — Full control of the entire platform</li></ul></div>),
    },
    admin: {
      fr: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Guide d'Administration 🛡️</h3><h4>Gestion des utilisateurs</h4><ul><li>Voir tous les utilisateurs inscrits</li><li>Modifier le rôle de n'importe quel utilisateur</li><li>Ajouter des enseignants (seul l'admin peut le faire)</li></ul><h4>Gestion des cours</h4><ul><li>Créer, modifier, supprimer tout cours</li><li>Publier/dépublier des cours</li><li>Voir les inscriptions</li></ul><h4>Analytique</h4><ul><li>Statistiques globales de la plateforme</li><li>Nombre d'utilisateurs par rôle</li><li>Inscriptions et performances</li></ul><h4>Modération</h4><ul><li>Supprimer des posts et réponses du forum</li><li>Gérer les abonnements</li></ul></div>),
      en: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Administration Guide 🛡️</h3><h4>User Management</h4><ul><li>View all registered users</li><li>Change any user's role</li><li>Add teachers (only admin can do this)</li></ul><h4>Course Management</h4><ul><li>Create, edit, delete any course</li><li>Publish/unpublish courses</li><li>View enrollments</li></ul><h4>Analytics</h4><ul><li>Platform-wide statistics</li><li>User count by role</li><li>Enrollments and performance</li></ul><h4>Moderation</h4><ul><li>Delete forum posts and replies</li><li>Manage subscriptions</li></ul></div>),
    },
    teacherGuide: {
      fr: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Guide Enseignant 👨‍🏫</h3><h4>Créer un cours</h4><ol><li>Cliquez sur <strong>Créer un cours</strong></li><li>Remplissez titre, matière, niveau, description</li><li>Ajoutez des leçons avec du contenu texte et/ou vidéo</li><li>Ajoutez des exercices QCM avec les bonnes réponses</li><li>Publiez quand tout est prêt</li></ol><h4>Gérer les devoirs</h4><ol><li>Créez des devoirs avec dates limites</li><li>Les élèves soumettent leurs fichiers</li><li>Corrigez et notez les soumissions</li></ol><h4>Résultats</h4><ul><li>Consultez les résultats de vos élèves par exercice</li><li>Identifiez les difficultés</li></ul></div>),
      en: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Teacher Guide 👨‍🏫</h3><h4>Create a course</h4><ol><li>Click <strong>Create Course</strong></li><li>Fill in title, subject, level, description</li><li>Add lessons with text content and/or video</li><li>Add MCQ exercises with correct answers</li><li>Publish when ready</li></ol><h4>Manage assignments</h4><ol><li>Create assignments with due dates</li><li>Students submit their files</li><li>Grade and comment on submissions</li></ol><h4>Results</h4><ul><li>View student results by exercise</li><li>Identify areas of difficulty</li></ul></div>),
    },
    parenting: {
      fr: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Guide Parental 👨‍👩‍👧</h3><h4>Lier votre enfant</h4><ol><li>Allez dans <strong>Mes enfants</strong></li><li>Entrez l'identifiant de votre enfant</li><li>Cliquez sur <strong>Lier</strong></li></ol><h4>Suivre la progression</h4><ul><li>Voyez les cours auxquels votre enfant est inscrit</li><li>Consultez ses résultats et points gagnés</li><li>Voyez ses badges obtenus</li></ul><h4>Humeur</h4><ul><li>Consultez l'humeur quotidienne de votre enfant</li><li>Identifiez les tendances positives ou négatives</li></ul></div>),
      en: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Parenting Guide 👨‍👩‍👧</h3><h4>Link your child</h4><ol><li>Go to <strong>My Children</strong></li><li>Enter your child's ID</li><li>Click <strong>Link</strong></li></ol><h4>Track progress</h4><ul><li>See courses your child is enrolled in</li><li>View results and earned points</li><li>See earned badges</li></ul><h4>Mood</h4><ul><li>Check your child's daily mood</li><li>Identify positive or negative trends</li></ul></div>),
    },
    subscription: {
      fr: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Abonnements 💳</h3><p>Deux niveaux : <strong>Gratuit</strong> et <strong>Premium</strong>.</p><ul><li>Gratuit : cours publics, exercices, forum, suivi d'humeur</li><li>Premium : tout dans Gratuit + cours premium, analytique avancée</li></ul><h4>Gestion (Admin)</h4><ul><li>Voir les abonnements de tous les utilisateurs</li><li>Modifier le niveau d'abonnement</li></ul></div>),
      en: (<div className="prose prose-sm max-w-none text-foreground/90"><h3 className="font-display text-lg font-semibold text-foreground">Subscriptions 💳</h3><p>Two tiers: <strong>Free</strong> and <strong>Premium</strong>.</p><ul><li>Free: public courses, exercises, forum, mood tracking</li><li>Premium: everything in Free + premium courses, advanced analytics</li></ul><h4>Management (Admin)</h4><ul><li>View all user subscriptions</li><li>Change subscription tier</li></ul></div>),
    },
  };

  return <>{content[sectionId]?.[lang] || content[sectionId]?.fr || null}</>;
}
