import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { Check, Crown, Zap, ExternalLink, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';

export default function SubscriptionPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success(t.subscription.welcomePremium);
      // Update local subscription to premium
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

  const isPremium = stripeStatus?.subscribed || subscription?.tier === 'premium';
  const currentTier = isPremium ? 'premium' : 'free';

  const TIERS = [
    {
      id: 'free',
      name: t.subscription.free,
      price: t.subscription.freePriceLabel,
      icon: Zap,
      features: t.subscription.freeFeatures,
    },
    {
      id: 'premium',
      name: t.subscription.premium,
      price: t.subscription.premiumPriceLabel,
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
        <Button variant="ghost" size="icon" onClick={() => refreshStripe()} title={t.subscription.refreshStatus}>
          <RefreshCw className="h-4 w-4" />
        </Button>
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
                <Button className="mt-6 w-full" disabled={checkout.isPending} onClick={() => checkout.mutate()}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {checkout.isPending ? t.subscription.openingCheckout : t.subscription.upgrade}
                </Button>
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
