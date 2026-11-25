export const publicCopy = {
  fr: {
    navLabel: "Pages publiques",
    menu: "Menu",
    about: "À propos",
    how: "Comment ça marche",
    students: "Élèves",
    parents: "Parents",
    schools: "Écoles",
    contact: "Contact",
    login: "Connexion",
    signup: "Créer un compte",
    skip: "Aller au contenu",
    footer: "Plateforme d'apprentissage pour les élèves, les parents et les écoles.",
    aboutPage: {
      title: "À propos",
      lede: "Mwalimu Mbuku est une plateforme d'apprentissage pour les élèves, les parents, les enseignants et les écoles.",
      sections: [
        {
          heading: "Pour qui",
          body: "Un élève suit des cours, des devoirs et des exercices. Un parent suit les enfants qu'il a liés. Un enseignant travaille avec les classes qui lui sont confiées. Un administrateur d'école organise l'année, les classes et les affectations de son école.",
        },
        {
          heading: "Où",
          body: "Le service est pensé pour des téléphones Android et pour des connexions limitées, en particulier en République démocratique du Congo. Les pages publiques restent courtes et les tableaux de bord n'affichent que les données autorisées du compte.",
        },
        {
          heading: "Ce que ce site ne prétend pas",
          body: "Aucune école partenaire, aucun témoignage, aucun effectif et aucun agrément officiel ne sont affichés ici. Un programme scolaire n'est pas présenté comme certifié.",
        },
      ],
    },
    howPage: {
      title: "Comment ça marche",
      lede: "Le compte public est réservé aux élèves et aux parents. Les enseignants et les administrateurs sont ajoutés par une personne déjà autorisée.",
      sections: [
        {
          heading: "1. Créer un compte élève ou parent",
          body: "Choisissez le type de compte, puis indiquez votre nom, votre e-mail et un mot de passe. La confirmation part vers l'adresse indiquée. Le formulaire ne dit pas si cette adresse existe déjà.",
        },
        {
          heading: "2. Confirmer, puis se connecter",
          body: "Le lien de confirmation ouvre ce site. Ensuite, la connexion se fait avec l'e-mail et le mot de passe. Un mot de passe oublié se réinitialise depuis la page prévue, sans indiquer si le compte existe.",
        },
        {
          heading: "3. L'école attribue la place",
          body: "Un compte sans école peut utiliser le catalogue commun. Une classe, un devoir de classe ou une présence n'apparaissent que lorsqu'une école a créé cette structure et y a inscrit la personne.",
        },
      ],
    },
    studentsPage: {
      title: "Élèves",
      lede: "L'inscription élève crée un compte élève. Elle ne crée pas une place dans une classe.",
      sections: [
        {
          heading: "Ce que vous pouvez ouvrir",
          body: "Après connexion, l'espace élève mène aux cours, à la progression, aux exercices, aux devoirs, aux jeux et aux réussites enregistrés pour ce compte.",
        },
        {
          heading: "Sans école assignée",
          body: "Si aucune école n'a encore inscrit ce compte, les cours du catalogue commun restent disponibles. Les listes de classe restent vides tant qu'une inscription de classe n'existe pas.",
        },
      ],
    },
    parentsPage: {
      title: "Parents",
      lede: "L'inscription parent crée un compte parent. Le lien avec un enfant se fait ensuite avec le code élève, pas avec un identifiant d'école choisi dans le formulaire.",
      sections: [
        {
          heading: "Enfants liés",
          body: "Le tableau de bord parent montre les enfants réellement liés, leur aperçu, leurs devoirs, leurs notes et leur présence lorsque ces enregistrements existent.",
        },
        {
          heading: "Ce qui n'est pas affiché",
          body: "Un enfant non lié n'apparaît pas. Une note ou une présence absente de la base n'est pas remplacée par un exemple.",
        },
      ],
    },
    schoolsPage: {
      title: "Enseignants et écoles",
      lede: "Une école est créée par un administrateur de la plateforme. Les enseignants et les administrateurs d'école ne s'inscrivent pas depuis ces pages.",
      sections: [
        {
          heading: "Structure",
          body: "Une école a ses années, ses périodes, ses niveaux, ses classes, ses matières et ses affectations d'enseignants. Un élève rejoint une classe par une inscription décidée par l'école.",
        },
        {
          heading: "Séparation",
          body: "Une personne autorisée dans une école ne reçoit pas les données d'une autre école. L'identifiant envoyé par le navigateur ne suffit pas : le serveur vérifie l'appartenance.",
        },
      ],
    },
    signupChooser: {
      title: "Créer un compte",
      lede: "Choisissez un compte élève ou un compte parent. Un compte enseignant ou administrateur est ouvert par une personne déjà autorisée.",
      student: "Je suis élève",
      studentLede: "Cours, devoirs et progression de votre compte.",
      parent: "Je suis parent",
      parentLede: "Suivi des enfants que vous lierez ensuite.",
      haveAccount: "J'ai déjà un compte",
    },
    register: {
      studentTitle: "Inscription élève",
      parentTitle: "Inscription parent",
      lede: "Le serveur vérifie ces champs. Le rôle est fixé par cette page.",
      name: "Nom complet",
      email: "E-mail",
      password: "Mot de passe",
      passwordHint: "8 caractères au minimum.",
      submit: "Créer le compte",
      working: "Envoi…",
      accepted: "Si cette adresse peut être enregistrée, un message de confirmation est en route.",
      invalid: "Vérifiez le nom, l'e-mail et le mot de passe.",
      limited: "Trop de tentatives. Attendez quelques minutes.",
      unavailable: "L'inscription est indisponible pour le moment.",
    },
    contactPage: {
      title: "Contact",
      lede: "Écrivez un message à l'équipe de la plateforme. Ce formulaire n'inscrit pas une école et ne crée pas de compte.",
      name: "Nom",
      email: "E-mail",
      topic: "Sujet",
      topics: [
        ["student", "Élève"],
        ["parent", "Parent"],
        ["school", "École ou enseignant"],
        ["other", "Autre"],
      ] as const,
      message: "Message",
      submit: "Envoyer",
      working: "Envoi…",
      saved: "Le message est enregistré. Il n'est visible que par un administrateur de la plateforme.",
      invalid: "Vérifiez le nom, l'e-mail et le message.",
      unavailable: "Le formulaire est indisponible pour le moment. Réessayez dans quelques minutes.",
    },
  },
  en: {
    navLabel: "Public pages",
    menu: "Menu",
    about: "About",
    how: "How it works",
    students: "Students",
    parents: "Parents",
    schools: "Schools",
    contact: "Contact",
    login: "Log in",
    signup: "Create an account",
    skip: "Skip to content",
    footer: "A learning platform for students, parents, and schools.",
    aboutPage: {
      title: "About",
      lede: "Mwalimu Mbuku is a learning platform for students, parents, teachers, and schools.",
      sections: [
        {
          heading: "Who it is for",
          body: "A student follows courses, homework, and exercises. A parent follows children they have linked. A teacher works with the classes assigned to them. A school administrator organises the year, classes, and assignments of that school.",
        },
        {
          heading: "Where",
          body: "The service is meant for Android phones and limited connections, particularly in the Democratic Republic of the Congo. Public pages stay short, and dashboards show only the data that account is allowed to see.",
        },
        {
          heading: "What this site does not claim",
          body: "No partner schools, testimonials, user counts, or official endorsements are shown here. A curriculum is not presented as certified.",
        },
      ],
    },
    howPage: {
      title: "How it works",
      lede: "Public registration is for students and parents. Teachers and administrators are added by someone who is already authorized.",
      sections: [
        {
          heading: "1. Create a student or parent account",
          body: "Choose the account type, then enter your name, email, and a password. Confirmation is sent to that address. The form does not say whether the address is already registered.",
        },
        {
          heading: "2. Confirm, then sign in",
          body: "The confirmation link opens this site. Sign-in then uses the email and password. A forgotten password is reset from its own page, without saying whether the account exists.",
        },
        {
          heading: "3. The school assigns the place",
          body: "An account without a school can use the shared catalog. A class, class homework, or attendance row appears only after a school has created that structure and enrolled the person.",
        },
      ],
    },
    studentsPage: {
      title: "Students",
      lede: "Student registration creates a student account. It does not place that account in a class.",
      sections: [
        {
          heading: "What you can open",
          body: "After sign-in, the student space leads to the courses, progress, exercises, homework, games, and achievements stored for that account.",
        },
        {
          heading: "Without an assigned school",
          body: "If no school has enrolled this account yet, shared catalog courses remain available. Class lists stay empty until a class enrollment exists.",
        },
      ],
    },
    parentsPage: {
      title: "Parents",
      lede: "Parent registration creates a parent account. A child is linked later with the student code, not with a school id typed into this form.",
      sections: [
        {
          heading: "Linked children",
          body: "The parent dashboard shows children who are actually linked, plus their overview, homework, grades, and attendance when those records exist.",
        },
        {
          heading: "What is left out",
          body: "An unlinked child is not shown. A grade or attendance mark that is not in the database is not replaced with a sample.",
        },
      ],
    },
    schoolsPage: {
      title: "Teachers and schools",
      lede: "A school is created by a platform administrator. Teachers and school administrators do not register from these pages.",
      sections: [
        {
          heading: "Structure",
          body: "A school has its years, terms, grade levels, classes, subjects, and teacher assignments. A student joins a class through an enrollment decided by the school.",
        },
        {
          heading: "Separation",
          body: "A person authorized in one school does not receive another school's data. An identifier sent by the browser is not enough: the server checks membership.",
        },
      ],
    },
    signupChooser: {
      title: "Create an account",
      lede: "Choose a student account or a parent account. A teacher or administrator account is opened by someone who is already authorized.",
      student: "I am a student",
      studentLede: "Courses, homework, and progress for your account.",
      parent: "I am a parent",
      parentLede: "Follow the children you will link afterwards.",
      haveAccount: "I already have an account",
    },
    register: {
      studentTitle: "Student registration",
      parentTitle: "Parent registration",
      lede: "The server checks these fields. This page fixes the role.",
      name: "Full name",
      email: "Email",
      password: "Password",
      passwordHint: "At least 8 characters.",
      submit: "Create account",
      working: "Sending…",
      accepted: "If this address can be registered, a confirmation message is on its way.",
      invalid: "Check the name, email, and password.",
      limited: "Too many attempts. Wait a few minutes.",
      unavailable: "Registration is unavailable right now.",
    },
    contactPage: {
      title: "Contact",
      lede: "Write to the platform team. This form does not register a school and does not create an account.",
      name: "Name",
      email: "Email",
      topic: "Topic",
      topics: [
        ["student", "Student"],
        ["parent", "Parent"],
        ["school", "School or teacher"],
        ["other", "Other"],
      ] as const,
      message: "Message",
      submit: "Send",
      working: "Sending…",
      saved: "The message is saved. Only a platform administrator can read it.",
      invalid: "Check the name, email, and message.",
      unavailable: "The form is unavailable right now. Try again in a few minutes.",
    },
  },
} as const;

export type PublicLang = keyof typeof publicCopy;
