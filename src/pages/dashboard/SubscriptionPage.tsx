import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { Check, Crown, Zap, ExternalLink, RefreshCw, Smartphone, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SubscriptionPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const { t, lang } = useLanguage();
  const [currency, setCurrency] = useState<'usd' | 'cdf'>('cdf');
  const [mobileNumber, setMobileNumber] = useState('');
  const [mobileProvider, setMobileProvider] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success(t.subscription.welcomePremium);
      if (user) {
        supabase.from('subscriptions')
          .update({ tier: 'premium', is_active: true })
          .eq('user_id', searchParams.get('child_id') || user.id)
          .then(() => {
            qc.invalidateQueries({ queryKey: ['subscription'] });
            qc.invalidateQueries({ queryKey: ['stripe-subscription'] });
          });
      }
    }
    if (searchParams.get('canceled') === 'true') {
      toast.info(t.subscription.checkoutCanceled);
    }
  }, [searchParams, qc, t, user]);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: stripeStatus, refetch: refreshStripe } = useQuery({
    queryKey: ['stripe-subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      return data as { subscribed: boolean; product_id: string | null; subscription_end: string | null };
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const checkout = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { currency },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { url: string };
    },
    onSuccess: (data) => { if (data.url) window.open(data.url, '_blank'); },
    onError: (e: any) => toast.error(e.message),
  });

  const manageSubscription = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { url: string };
    },
    onSuccess: (data) => { if (data.url) window.open(data.url, '_blank'); },
    onError: (e: any) => toast.error(e.message),
  });

  const downgrade = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('update-subscription', { body: { tier: 'free' } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success(t.subscription.downgradedFree);
      qc.invalidateQueries({ queryKey: ['subscription'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleMobileMoney = (provider: string) => {
    setMobileProvider(provider);
    toast.info(lang === 'fr'
      ? `${provider} — Mode test activé. L'intégration sera disponible après configuration du compte marchand.`
      : `${provider} — Test mode active. Integration will be available after merchant account setup.`
    );
  };

  const submitMobileMoney = () => {
    if (!mobileNumber || mobileNumber.length < 9) {
      toast.error(lang === 'fr' ? 'Numéro invalide' : 'Invalid number');
      return;
    }
    toast.info(lang === 'fr'
      ? `Paiement ${mobileProvider} simulé avec succès (mode test). Numéro: ${mobileNumber}`
      : `${mobileProvider} payment simulated successfully (test mode). Number: ${mobileNumber}`
    );
    setMobileProvider(null);
    setMobileNumber('');
  };

  const isPremium = stripeStatus?.subscribed || subscription?.tier === 'premium';
  const currentTier = isPremium ? 'premium' : 'free';

  const priceLabel = currency === 'usd' ? '$5 USD/mo' : '5 000 CDF/mois';
  const freeLabel = currency === 'usd' ? '$0' : '0 CDF';

  const TIERS = [
    {
      id: 'free',
      name: t.subscription.free,
      price: freeLabel,
      icon: Zap,
      features: t.subscription.freeFeatures,
    },
    {
      id: 'premium',
      name: t.subscription.premium,
      price: priceLabel,
      icon: Crown,
      features: t.subscription.premiumFeatures,
      popular: true,
    },
  ];

  const MOBILE_PROVIDERS = [
    { id: 'mpesa', name: 'M-Pesa', color: 'bg-green-600', desc: 'Vodacom' },
    { id: 'orange', name: 'Orange Money', color: 'bg-orange-500', desc: 'Orange' },
    { id: 'airtel', name: 'Airtel Money', color: 'bg-red-500', desc: 'Airtel' },
  ];

  if (isLoading) return <Skeleton className="h-60" />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">{t.subscription.title}</h1>
          <p className="mt-1 text-muted-foreground">
            {t.subscription.currentPlan}{' '}
            <Badge variant={isPremium ? 'default' : 'secondary'}>{currentTier === 'premium' ? t.subscription.premium : t.subscription.free}</Badge>
            {stripeStatus?.subscription_end && (
              <span className="ml-2 text-xs">({t.subscription.renews} {new Date(stripeStatus.subscription_end).toLocaleDateString()})</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            <button onClick={() => setCurrency('cdf')} className={cn('px-3 py-1.5 font-medium transition-colors', currency === 'cdf' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}>
              CDF
            </button>
            <button onClick={() => setCurrency('usd')} className={cn('px-3 py-1.5 font-medium transition-colors', currency === 'usd' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}>
              USD
            </button>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refreshStripe()} title={t.subscription.refreshStatus}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
        {TIERS.map((tier) => {
          const isCurrent = currentTier === tier.id;
          return (
            <div key={tier.id} className={cn(
              'relative rounded-2xl border p-6 transition-all',
              tier.popular ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' : 'border-border bg-card',
              isCurrent && 'ring-2 ring-primary'
            )}>
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                  {t.subscription.yourPlan}
                </span>
              )}
              <div className="flex items-center gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tier.popular ? 'bg-primary/10' : 'bg-muted')}>
                  <tier.icon className={cn('h-5 w-5', tier.popular ? 'text-primary' : 'text-muted-foreground')} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">{tier.name}</h3>
                  <p className="text-sm text-muted-foreground">{tier.price}</p>
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {tier.features.map((f: string) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              {tier.id === 'premium' && !isPremium ? (
                <div className="mt-6 space-y-3">
                  <Tabs defaultValue="card" className="w-full">
                    <TabsList className="w-full grid grid-cols-2">
                      <TabsTrigger value="card" className="gap-1 text-xs"><CreditCard className="h-3.5 w-3.5" /> Carte</TabsTrigger>
                      <TabsTrigger value="mobile" className="gap-1 text-xs"><Smartphone className="h-3.5 w-3.5" /> Mobile Money</TabsTrigger>
                    </TabsList>
                    <TabsContent value="card" className="mt-3">
                      <Button className="w-full" disabled={checkout.isPending} onClick={() => checkout.mutate()}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {checkout.isPending ? t.subscription.openingCheckout : t.subscription.upgrade}
                      </Button>
                      <p className="mt-1 text-center text-[10px] text-muted-foreground">Stripe · {currency === 'cdf' ? 'Franc Congolais' : 'US Dollar'}</p>
                    </TabsContent>
                    <TabsContent value="mobile" className="mt-3 space-y-2">
                      {!mobileProvider ? (
                        MOBILE_PROVIDERS.map((p) => (
                          <button key={p.id} onClick={() => handleMobileMoney(p.name)}
                            className="flex w-full items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                            <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white', p.color)}>
                              {p.name[0]}
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium text-foreground">{p.name}</p>
                              <p className="text-[10px] text-muted-foreground">{p.desc}</p>
                            </div>
                            <Badge variant="outline" className="ml-auto text-[9px]">Test</Badge>
                          </button>
                        ))
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-foreground">{mobileProvider}</p>
                          <div className="space-y-1">
                            <Label className="text-xs">{lang === 'fr' ? 'Numéro de téléphone' : 'Phone number'}</Label>
                            <Input placeholder="+243 ..." value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} />
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => { setMobileProvider(null); setMobileNumber(''); }}>
                              {lang === 'fr' ? 'Retour' : 'Back'}
                            </Button>
                            <Button size="sm" className="flex-1" onClick={submitMobileMoney}>
                              {lang === 'fr' ? 'Payer (test)' : 'Pay (test)'}
                            </Button>
                          </div>
                          <p className="text-center text-[10px] text-muted-foreground">
                            {lang === 'fr' ? '⚠️ Mode test — aucun débit réel' : '⚠️ Test mode — no real charge'}
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              ) : tier.id === 'premium' && isPremium ? (
                <div className="mt-6 space-y-2">
                  <Button variant="outline" className="w-full" disabled>{t.subscription.currentPlanBtn}</Button>
                  <Button variant="ghost" className="w-full text-xs" onClick={() => manageSubscription.mutate()} disabled={manageSubscription.isPending}>
                    {t.subscription.manage}
                  </Button>
                </div>
              ) : tier.id === 'free' && isPremium ? (
                <Button className="mt-6 w-full" variant="secondary" disabled={downgrade.isPending} onClick={() => downgrade.mutate()}>
                  {t.subscription.downgrade}
                </Button>
              ) : (
                <Button className="mt-6 w-full" variant="outline" disabled>{t.subscription.currentPlanBtn}</Button>
              )}
            </div>
          );
        })}
      </div>

      <PaymentHistorySection />
    </div>
  );
}

function PaymentHistorySection() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { data: payments } = useQuery({
    queryKey: ['payment-history', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('payment_history').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!user,
  });
  const { data: renewals } = useQuery({
    queryKey: ['renewal-history', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('renewal_history').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <div className="grid gap-6 md:grid-cols-2 max-w-5xl">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-display text-lg font-bold text-foreground mb-3">
          {lang === 'fr' ? 'Historique des paiements' : 'Payment history'}
        </h3>
        {!payments?.length ? (
          <p className="text-sm text-muted-foreground">{lang === 'fr' ? 'Aucun paiement enregistré.' : 'No payments yet.'}</p>
        ) : (
          <ul className="space-y-2">
            {payments.map((p: any) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg border border-border/60 p-2.5 text-sm">
                <div>
                  <p className="font-medium text-foreground">{p.amount} {p.currency}</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()} · {p.provider || '—'}</p>
                </div>
                <Badge variant={p.status === 'succeeded' ? 'default' : p.status === 'failed' ? 'destructive' : 'secondary'} className="text-[10px]">{p.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-display text-lg font-bold text-foreground mb-3">
          {lang === 'fr' ? 'Historique des renouvellements' : 'Renewal history'}
        </h3>
        {!renewals?.length ? (
          <p className="text-sm text-muted-foreground">{lang === 'fr' ? 'Aucun renouvellement.' : 'No renewals yet.'}</p>
        ) : (
          <ul className="space-y-2">
            {renewals.map((r: any) => (
              <li key={r.id} className="rounded-lg border border-border/60 p-2.5 text-sm">
                <p className="font-medium text-foreground capitalize">{r.tier}</p>
                <p className="text-xs text-muted-foreground">
                  {lang === 'fr' ? 'Actif jusqu’au' : 'Active until'} {new Date(r.new_expires_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
