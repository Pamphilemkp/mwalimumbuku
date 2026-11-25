"use client";

import { useState } from 'react';
import { Link } from '@/src/lib/next-router';
import { resetPassword } from '@/src/lib/auth';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Mail, ArrowLeft } from 'lucide-react';
import { toast } from '@/src/components/ui/sonner';
import { useLanguage } from '@/src/i18n/LanguageContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) toast.error(error.message);
    else setSent(true);
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="max-w-md text-center space-y-4">
          <Mail className="mx-auto h-12 w-12 text-primary" />
          <h2 className="font-display text-2xl font-bold">{t.auth.checkEmail}</h2>
          <p className="text-muted-foreground">{t.auth.resetSent} <strong>{email}</strong></p>
          <Link to="/login"><Button variant="outline">{t.auth.backToLogin}</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-md space-y-6">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t.auth.backToLogin}
        </Link>
        <div>
          <h2 className="font-display text-3xl font-bold">{t.auth.resetPassword}</h2>
          <p className="mt-2 text-muted-foreground">{t.auth.resetDesc}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t.auth.email}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t.auth.sending : t.auth.sendResetLink}
          </Button>
        </form>
      </div>
    </div>
  );
}
