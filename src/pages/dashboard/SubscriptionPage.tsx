import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { Check, Crown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: 'KES 0',
    icon: Zap,
    features: [
      'Access to published courses',
      'Basic progress tracking',
      'Community forum access',
      'Daily mood tracker',
      '5 exercises per day',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 'KES 500/mo',
    icon: Crown,
    features: [
      'Everything in Free',
      'Unlimited exercises',
      'Priority parent-teacher messaging',
      'Advanced analytics',
      'Downloadable certificates',
      'Offline access (coming soon)',
      'AI-powered tutoring (coming soon)',
    ],
    popular: true,
  },
];

export default function SubscriptionPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateTier = useMutation({
    mutationFn: async (tier: string) => {
      if (subscription) {
        const { error } = await supabase
          .from('subscriptions')
          .update({ tier, updated_at: new Date().toISOString() })
          .eq('user_id', user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('subscriptions')
          .insert({ user_id: user!.id, tier });
        if (error) throw error;
      }
    },
    onSuccess: (_, tier) => {
      toast.success(tier === 'premium' ? '🎉 Welcome to Premium!' : 'Plan updated.');
      qc.invalidateQueries({ queryKey: ['subscription'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const currentTier = subscription?.tier || 'free';

  if (isLoading) return <Skeleton className="h-60" />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Subscription</h1>
        <p className="mt-1 text-muted-foreground">
          Your current plan: <Badge variant={currentTier === 'premium' ? 'default' : 'secondary'}>{currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}</Badge>
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
        {TIERS.map((tier) => {
          const isCurrent = currentTier === tier.id;
          return (
            <div
              key={tier.id}
              className={cn(
                'relative rounded-2xl border p-6 transition-all',
                tier.popular
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-border bg-card',
                isCurrent && 'ring-2 ring-primary'
              )}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                  Popular
                </span>
              )}
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  tier.popular ? 'bg-primary/10' : 'bg-muted'
                )}>
                  <tier.icon className={cn('h-5 w-5', tier.popular ? 'text-primary' : 'text-muted-foreground')} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">{tier.name}</h3>
                  <p className="text-sm text-muted-foreground">{tier.price}</p>
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="mt-6 w-full"
                variant={isCurrent ? 'outline' : tier.popular ? 'default' : 'secondary'}
                disabled={isCurrent || updateTier.isPending}
                onClick={() => updateTier.mutate(tier.id)}
              >
                {isCurrent ? 'Current Plan' : tier.id === 'premium' ? 'Upgrade to Premium' : 'Downgrade'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
