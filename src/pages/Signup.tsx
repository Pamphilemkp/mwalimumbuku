import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { signUp, AppRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Mail, Lock, User, Key } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const TEACHER_ACCESS_CODE = 'MWALIMU2026';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AppRole>('student');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'teacher' && accessCode !== TEACHER_ACCESS_CODE) {
      toast.error(t.auth.invalidTeacherCode);
      return;
    }
    if (password.length < 8) {
      toast.error(t.auth.passwordTooShort);
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, fullName, role);
    setLoading(false);
    if (error) toast.error(error.message);
    else setSuccess(true);
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">{t.auth.checkEmail}</h2>
          <p className="text-muted-foreground">{t.auth.confirmSent} <strong>{email}</strong>. {t.auth.clickActivate}</p>
          <Link to="/login"><Button variant="outline" className="mt-4">{t.auth.backToLogin}</Button></Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12" style={{ background: 'var(--gradient-hero)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-md text-center">
          <BookOpen className="mx-auto mb-6 h-16 w-16 text-primary-foreground" />
          <h1 className="mb-4 font-display text-4xl font-bold text-primary-foreground">{t.auth.joinUs}</h1>
          <p className="text-lg text-primary-foreground/80">{t.auth.startJourney}</p>
        </motion.div>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="w-full max-w-md space-y-8">
          <div className="flex justify-end"><LanguageSwitcher variant="outline" /></div>
          <div className="lg:hidden mb-8 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-primary" />
            <h1 className="font-display text-2xl font-bold text-foreground">{t.appName}</h1>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold text-foreground">{t.auth.createAccount}</h2>
            <p className="mt-2 text-muted-foreground">{t.auth.fillDetails}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t.auth.fullName}</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="fullName" placeholder="Jean Dupont" className="pl-10" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.email}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="vous@exemple.com" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t.auth.password}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder={t.auth.passwordMin} className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              </div>
              <p className="text-xs text-muted-foreground">{t.auth.passwordMin}</p>
            </div>
            <div className="space-y-2">
              <Label>{t.auth.iAmA}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">{t.auth.student}</SelectItem>
                  <SelectItem value="parent">{t.auth.parent}</SelectItem>
                  <SelectItem value="teacher">{t.auth.teacher}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role === 'teacher' && (
              <div className="space-y-2">
                <Label htmlFor="accessCode">{t.auth.teacherAccessCode}</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="accessCode" placeholder={t.auth.teacherAccessCode} className="pl-10" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} required />
                </div>
                <p className="text-xs text-muted-foreground">{t.auth.accessCodeHint}</p>
              </div>
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
