"use client";

import { useState, type ReactNode } from 'react';
import { Link, useNavigate, Navigate } from '@/src/lib/next-router';
import { motion } from 'framer-motion';
import { signUp, AppRole } from '@/src/lib/auth';
import { useAuth } from '@/src/hooks/useAuth';
import { supabase } from '@/src/integrations/supabase/client';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Mail, Lock, User, Phone, MapPin, GraduationCap, Briefcase, Users, type LucideIcon } from 'lucide-react';
import { toast } from '@/src/components/ui/sonner';
import { useLanguage } from '@/src/i18n/LanguageContext';
import LanguageSwitcher from '@/src/components/LanguageSwitcher';
import PasswordStrength from '@/src/components/PasswordStrength';
import AvatarUpload from '@/src/components/AvatarUpload';
const logo = "/logo.png";

function SignupSection({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-card/50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export default function Signup() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Account
  const [role, setRole] = useState<AppRole>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Common profile
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('RDC');
  const [city, setCity] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('fr');

  // Student
  const [schoolName, setSchoolName] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [learningLanguage, setLearningLanguage] = useState('fr');
  const [subjectsInterest, setSubjectsInterest] = useState('');
  const [weakSubjects, setWeakSubjects] = useState('');
  const [academicGoals, setAcademicGoals] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');

  // Parent
  const [occupation, setOccupation] = useState('');
  const [relationship, setRelationship] = useState('parent');
  const [numChildren, setNumChildren] = useState(1);

  // Teacher (self-signup blocked by trigger, but kept for reference)
  // Removed: teachers are manually created by admins

  if (!authLoading && user) return <Navigate to="/dashboard" replace />;

  const computeAge = (d: string) => {
    if (!d) return null;
    const date = new Date(d);
    return Math.floor((Date.now() - date.getTime()) / (365.25 * 864e5));
  };

  const validate = (): string | null => {
    if (!fullName.trim()) return 'Nom complet requis';
    if (!email.trim()) return 'Email requis';
    if (password.length < 8) return t.auth.passwordTooShort;
    if (!phone.trim()) return 'Téléphone requis';
    if (!city.trim()) return 'Ville requise';
    if (role === 'student' && !schoolName.trim()) return 'Nom de l\'école requis';
    if (role === 'student' && !classLevel.trim()) return 'Classe / niveau requis';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { toast.error(err); return; }

    setLoading(true);

    // 1) Create account
    const { data, error } = await signUp(email, password, fullName, role);
    if (error) {
      setLoading(false);
      const msg = error.message?.toLowerCase() ?? '';
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists') || msg.includes('user already')) {
        toast.error('Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email.');
      } else {
        toast.error(error.message);
      }
      return;
    }

    // If email confirmation required, profile rows are created by trigger,
    // but we cannot write to them without an active session. Show success state.
    if (!data?.session) {
      setLoading(false);
      setSuccess(true);
      return;
    }

    const userId = data.user!.id;

    try {
      // 2) Update profile with all collected info + mark onboarding complete
      const { error: pErr } = await supabase.from('profiles').update({
        full_name: fullName,
        avatar_url: avatarUrl || null,
        gender: gender || null,
        date_of_birth: dob || null,
        phone,
        address: address || null,
        country,
        city,
        preferred_language: preferredLanguage,
        onboarding_completed: true,
        onboarding_step: 99,
      }).eq('user_id', userId);
      if (pErr) throw pErr;

      // 3) Role-specific profile
      if (role === 'student') {
        await supabase.from('student_profiles').upsert({
          user_id: userId,
          school_name: schoolName,
          class_level: classLevel,
          learning_language: learningLanguage,
          academic_goals: academicGoals,
          subjects_of_interest: subjectsInterest.split(',').map(s => s.trim()).filter(Boolean),
          weak_subjects: weakSubjects.split(',').map(s => s.trim()).filter(Boolean),
          guardian_info: { name: guardianName, phone: guardianPhone, email: guardianEmail },
        });
      } else if (role === 'parent') {
        await supabase.from('parent_profiles').upsert({
          user_id: userId,
          occupation,
          relationship_to_child: relationship,
          number_of_children: numChildren,
          communication_language: preferredLanguage,
        });
      }
    } catch (err: any) {
      console.error('Profile update error:', err);
      // Non-blocking; user can still complete in dashboard
    }

    setLoading(false);
    toast.success('Compte créé avec succès !');
    navigate('/dashboard');
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold">{t.auth.checkEmail}</h2>
          <p className="text-muted-foreground">{t.auth.confirmSent} <strong>{email}</strong>. {t.auth.clickActivate}</p>
          <Link to="/login"><Button variant="outline" className="mt-4">{t.auth.backToLogin}</Button></Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-2/5 items-center justify-center p-12 sticky top-0 h-screen" style={{ background: 'var(--gradient-hero)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center">
          <img src={logo} alt="Mwalimu Mbuku" className="mx-auto mb-6 h-24 w-24 object-contain" />
          <h1 className="mb-4 font-display text-4xl font-bold text-primary-foreground">{t.auth.joinUs}</h1>
          <p className="text-lg text-primary-foreground/80">{t.auth.startJourney}</p>
        </motion.div>
      </div>

      <div className="flex w-full lg:w-3/5 items-start justify-center p-6 sm:p-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-2xl space-y-6">
          <div className="flex justify-end"><LanguageSwitcher variant="outline" /></div>
          <div className="lg:hidden text-center">
            <img src={logo} alt="Mwalimu Mbuku" className="mx-auto mb-3 h-14 w-14 object-contain" />
            <h1 className="font-display text-2xl font-bold">{t.appName}</h1>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold">{t.auth.createAccount}</h2>
            <p className="mt-2 text-muted-foreground">Remplissez tout en une seule étape — pas d'onboarding supplémentaire.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <SignupSection icon={User} title="Type de compte">
              <div className="space-y-2">
                <Label>{t.auth.iAmA}</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">{t.auth.student}</SelectItem>
                    <SelectItem value="parent">{t.auth.parent}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Les comptes Enseignant sont créés par un administrateur.</p>
              </div>
            </SignupSection>

            <SignupSection icon={Lock} title="Identifiants de connexion">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email">{t.auth.email} *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="password">{t.auth.password} *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                  </div>
                  <PasswordStrength password={password} />
                </div>
              </div>
            </SignupSection>

            <SignupSection icon={User} title="Identité">
              <AvatarUpload value={avatarUrl} onChange={setAvatarUrl} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-2">
                  <Label>{t.auth.fullName} *</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jean Dupont" required />
                </div>
                {role === 'student' && (
                  <>
                    <div className="space-y-2">
                      <Label>Genre</Label>
                      <Select value={gender} onValueChange={setGender}>
                        <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Masculin</SelectItem>
                          <SelectItem value="female">Féminin</SelectItem>
                          <SelectItem value="other">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date de naissance</Label>
                      <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                      {dob && <p className="text-xs text-muted-foreground">Âge : {computeAge(dob)} ans</p>}
                    </div>
                  </>
                )}
              </div>
            </SignupSection>

            <SignupSection icon={MapPin} title="Coordonnées">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Téléphone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+243…" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Pays</Label>
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Ville *</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Langue préférée</Label>
                  <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="sw">Swahili</SelectItem>
                      <SelectItem value="ln">Lingala</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Adresse</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              </div>
            </SignupSection>

            {role === 'student' && (
              <>
                <SignupSection icon={GraduationCap} title="Scolarité">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Nom de l'école *</Label>
                      <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Classe / Niveau *</Label>
                      <Input value={classLevel} onChange={(e) => setClassLevel(e.target.value)} placeholder="ex. 5ème" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Langue d'apprentissage</Label>
                      <Select value={learningLanguage} onValueChange={setLearningLanguage}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fr">Français</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="sw">Swahili</SelectItem>
                          <SelectItem value="ln">Lingala</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Matières d'intérêt (séparées par virgules)</Label>
                      <Input value={subjectsInterest} onChange={(e) => setSubjectsInterest(e.target.value)} placeholder="Maths, Sciences" />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Matières à renforcer</Label>
                      <Input value={weakSubjects} onChange={(e) => setWeakSubjects(e.target.value)} placeholder="Français, Anglais" />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Objectifs académiques</Label>
                      <Textarea rows={2} value={academicGoals} onChange={(e) => setAcademicGoals(e.target.value)} />
                    </div>
                  </div>
                </SignupSection>

                <SignupSection icon={Users} title="Parent / Tuteur">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Nom du tuteur</Label>
                      <Input value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Téléphone tuteur</Label>
                      <Input value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email tuteur</Label>
                      <Input type="email" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} />
                    </div>
                  </div>
                </SignupSection>
              </>
            )}

            {role === 'parent' && (
              <SignupSection icon={Briefcase} title="Informations parent">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Profession</Label>
                    <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Lien avec l'enfant</Label>
                    <Select value={relationship} onValueChange={setRelationship}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="mother">Mère</SelectItem>
                        <SelectItem value="father">Père</SelectItem>
                        <SelectItem value="guardian">Tuteur</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre d'enfants</Label>
                    <Input type="number" min={1} value={numChildren} onChange={(e) => setNumChildren(parseInt(e.target.value) || 1)} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Vous pourrez ajouter les détails de chaque enfant depuis votre tableau de bord.</p>
              </SignupSection>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? t.auth.creatingAccount : t.auth.createAccount}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t.auth.alreadyAccount}{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">{t.auth.signIn}</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
