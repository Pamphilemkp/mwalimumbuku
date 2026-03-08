import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { signIn } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, Mail, Lock } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) toast.error(error.message);
    else navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12" style={{ background: 'var(--gradient-hero)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-md text-center">
          <BookOpen className="mx-auto mb-6 h-16 w-16 text-primary-foreground" />
          <h1 className="mb-4 font-display text-4xl font-bold text-primary-foreground">{t.appName}</h1>
          <p className="text-lg text-primary-foreground/80">{t.auth.empowering}</p>
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
            <h2 className="font-display text-3xl font-bold text-foreground">{t.auth.welcomeBack}</h2>
            <p className="mt-2 text-muted-foreground">{t.auth.signInContinue}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.email}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t.auth.password}</Label>
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">{t.auth.forgotPassword}</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? t.auth.signingIn : t.auth.signIn}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            {t.auth.noAccount}{' '}
            <Link to="/signup" className="font-medium text-primary hover:underline">{t.auth.signUp}</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
