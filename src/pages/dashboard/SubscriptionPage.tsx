import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { Check, Crown, Zap, ExternalLink, RefreshCw, Smartphone, CreditCard, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const MOBILE_WALLETS = [
  { id: 'mpesa', name: 'M-Pesa', color: 'bg-green-500/10 text-green-700 border-green-500/30' },
  { id: 'orange', name: 'Orange Money', color: 'bg-orange-500/10 text-orange-700 border-orange-500/30' },
  { id: 'airtel', name: 'Airtel Money', color: 'bg-red-500/10 text-red-700 border-red-500/30' },
];

export default function SubscriptionPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const { t, lang } = useLanguage();
  const [currency, setCurrency] = useState<'usd' | 'cdf'>('usd');

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
      const { data, error } = await supabase.functions.invoke('create-checkout');
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

  const handleMobilePayment = (wallet: string) => {
    toast.info(
      lang === 'fr'
        ? `Le paiement par ${wallet} sera bientôt disponible. Nous sommes en phase de test.`
        : `${wallet} payment will be available soon. We are in testing phase.`
    );
  };

  const isPremium = stripeStatus?.subscribed || subscription?.tier === 'premium';
  const currentTier = isPremium ? 'premium' : 'free';

  const priceLabel = currency === 'usd' ? '$5/mois' : '25 000 CDF/mois';
  const freePriceLabel = lang === 'fr' ? 'Gratuit' : 'Free';

  const TIERS = [
    {
      id: 'free',
      name: t.subscription.free,
      price: freePriceLabel,
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
          {/* Currency toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            <button onClick={() => setCurrency('usd')}
              className={cn('px-3 py-1.5 font-medium transition-colors', currency === 'usd' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground')}>
              USD $
            </button>
            <button onClick={() => setCurrency('cdf')}
              className={cn('px-3 py-1.5 font-medium transition-colors', currency === 'cdf' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground')}>
              CDF
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
                      <TabsTrigger value="card" className="gap-1.5 text-xs"><CreditCard className="h-3.5 w-3.5" /> Carte</TabsTrigger>
                      <TabsTrigger value="mobile" className="gap-1.5 text-xs"><Smartphone className="h-3.5 w-3.5" /> Mobile Money</TabsTrigger>
                    </TabsList>
                    <TabsContent value="card" className="mt-3">
                      <Button className="w-full" disabled={checkout.isPending} onClick={() => checkout.mutate()}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {checkout.isPending ? t.subscription.openingCheckout : t.subscription.upgrade}
                      </Button>
                      <p className="mt-2 text-center text-[10px] text-muted-foreground">
                        {lang === 'fr' ? 'Paiement sécurisé via Stripe (Visa, Mastercard)' : 'Secure payment via Stripe (Visa, Mastercard)'}
                      </p>
                    </TabsContent>
                    <TabsContent value="mobile" className="mt-3 space-y-2">
                      {MOBILE_WALLETS.map(w => (
                        <Button key={w.id} variant="outline" className={cn('w-full justify-between', w.color)}
                          onClick={() => handleMobilePayment(w.name)}>
                          <span className="font-medium">{w.name}</span>
                          <Badge variant="outline" className="text-[9px] gap-1 border-amber-500/40 text-amber-600">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {lang === 'fr' ? 'Bientôt' : 'Soon'}
                          </Badge>
                        </Button>
                      ))}
                      <p className="text-center text-[10px] text-muted-foreground">
                        {lang === 'fr'
                          ? 'Les paiements par mobile money sont en phase de test et seront activés prochainement.'
                          : 'Mobile money payments are in testing phase and will be enabled soon.'}
                      </p>
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
    </div>
  );
}
