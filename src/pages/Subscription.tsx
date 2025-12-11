import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSubscription, PLAN_FEATURES, SubscriptionPlan } from "@/hooks/useSubscription";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Check, Crown, Zap, Building2, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";

export default function Subscription() {
  const navigate = useNavigate();
  const {
    subscription,
    usage,
    loading,
    getCurrentPlan,
    getConnectionsRemaining,
    upgradePlan,
    cancelSubscription,
  } = useSubscription();

  const [upgrading, setUpgrading] = useState<SubscriptionPlan | null>(null);

  const currentPlan = getCurrentPlan();
  const connectionsRemaining = getConnectionsRemaining();

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    setUpgrading(plan);
    await upgradePlan(plan);
    setUpgrading(null);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="md" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 pb-24 space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/settings")}
          className="text-foreground hover:text-primary -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Settings
        </Button>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Subscription</h1>
          <p className="text-muted-foreground">
            Manage your plan and billing
          </p>
        </div>

        {/* Current Plan Card */}
        <Card className="bg-card border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                {PLAN_FEATURES[currentPlan].name}
                {currentPlan !== "free" && (
                  <Crown className="h-5 w-5 text-primary" />
                )}
              </h2>
            </div>
            <Badge
              variant={subscription?.status === "active" ? "default" : "secondary"}
              className="bg-primary text-primary-foreground"
            >
              {subscription?.status || "active"}
            </Badge>
          </div>

          {/* Usage for Free Plan */}
          {currentPlan === "free" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Connections this month</span>
                <span className="text-foreground font-medium">
                  {usage?.connections_count ?? 0} / 5
                </span>
              </div>
              <Progress 
                value={((usage?.connections_count ?? 0) / 5) * 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                {connectionsRemaining === 0 
                  ? "You've reached your limit. Upgrade for unlimited connections!"
                  : `${connectionsRemaining} connections remaining this month`
                }
              </p>
            </div>
          )}

          {/* Pro/Business users */}
          {currentPlan !== "free" && subscription?.current_period_end && (
            <p className="text-sm text-muted-foreground">
              Next billing date:{" "}
              {new Date(subscription.current_period_end).toLocaleDateString()}
            </p>
          )}
        </Card>

        {/* Plan Options */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Available Plans</h3>
          
          {(["free", "pro", "business"] as SubscriptionPlan[]).map((plan) => {
            const features = PLAN_FEATURES[plan];
            const isCurrentPlan = plan === currentPlan;
            const isUpgrade = 
              (plan === "pro" && currentPlan === "free") ||
              (plan === "business" && (currentPlan === "free" || currentPlan === "pro"));

            return (
              <Card 
                key={plan}
                className={`bg-card border-border p-6 relative ${
                  isCurrentPlan ? "ring-2 ring-primary" : ""
                }`}
              >
                {isCurrentPlan && (
                  <Badge className="absolute -top-2 right-4 bg-primary text-primary-foreground">
                    Current Plan
                  </Badge>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {plan === "free" && <Zap className="h-6 w-6 text-muted-foreground" />}
                    {plan === "pro" && <Crown className="h-6 w-6 text-primary" />}
                    {plan === "business" && <Building2 className="h-6 w-6 text-primary" />}
                    <div>
                      <h4 className="text-xl font-bold text-foreground">{features.name}</h4>
                      <p className="text-2xl font-bold text-primary">{features.priceLabel}</p>
                    </div>
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {features.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isUpgrade && (
                  <Button
                    onClick={() => handleUpgrade(plan)}
                    disabled={upgrading === plan}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {upgrading === plan ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2" />
                    )}
                    Upgrade to {features.name}
                  </Button>
                )}

                {isCurrentPlan && plan !== "free" && (
                  <Button
                    onClick={cancelSubscription}
                    variant="outline"
                    className="w-full border-destructive text-destructive hover:bg-destructive/10"
                  >
                    Cancel Subscription
                  </Button>
                )}
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <Card className="bg-card border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Billing FAQ</h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-foreground">When will I be charged?</p>
              <p className="text-muted-foreground">
                You'll be charged immediately upon upgrading, then monthly on the same date.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">Can I cancel anytime?</p>
              <p className="text-muted-foreground">
                Yes! Cancel anytime and you'll retain access until the end of your billing period.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">What payment methods do you accept?</p>
              <p className="text-muted-foreground">
                We accept all major credit cards, debit cards, and local payment methods.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
