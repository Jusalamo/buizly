import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type SubscriptionPlan = "free" | "pro" | "business";
export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "trialing" | "expired";

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageTracking {
  id: string;
  user_id: string;
  month_year: string;
  connections_count: number;
}

export interface PlanFeatures {
  name: string;
  price: number;
  priceLabel: string;
  features: string[];
  connectionLimit: number | "unlimited";
  hasAnalytics: boolean;
  hasCustomBranding: boolean;
  hasTeamWorkspaces: boolean;
  teamMemberLimit: number;
}

export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeatures> = {
  free: {
    name: "Free",
    price: 0,
    priceLabel: "Free",
    features: [
      "Basic digital business card",
      "QR code sharing",
      "5 connections per month",
      "Email support",
    ],
    connectionLimit: 5,
    hasAnalytics: false,
    hasCustomBranding: false,
    hasTeamWorkspaces: false,
    teamMemberLimit: 0,
  },
  pro: {
    name: "Pro",
    price: 9.99,
    priceLabel: "$9.99/month",
    features: [
      "Unlimited connections",
      "Custom QR code colors & branding",
      "Profile view analytics",
      "Multiple card templates",
      "Priority email support",
      "Remove Buizly branding",
      "Custom profile URL",
    ],
    connectionLimit: "unlimited",
    hasAnalytics: true,
    hasCustomBranding: true,
    hasTeamWorkspaces: false,
    teamMemberLimit: 0,
  },
  business: {
    name: "Business",
    price: 24.99,
    priceLabel: "$24.99/month",
    features: [
      "Everything in Pro",
      "Team workspaces (up to 5 members)",
      "Lead capture forms",
      "CRM export (CSV, HubSpot, Salesforce)",
      "Advanced analytics dashboard",
      "Custom domain support",
      "Dedicated support channel",
    ],
    connectionLimit: "unlimited",
    hasAnalytics: true,
    hasCustomBranding: true,
    hasTeamWorkspaces: true,
    teamMemberLimit: 5,
  },
};

export function useSubscription() {
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageTracking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription();
    fetchUsage();
  }, []);

  const fetchSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSubscription(data as unknown as Subscription);
      } else {
        // Create default free subscription
        const { data: newSub, error: insertError } = await supabase
          .from("subscriptions")
          .insert({
            user_id: user.id,
            plan: "free",
            status: "active",
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setSubscription(newSub as unknown as Subscription);
      }
    } catch (error: any) {
      console.error("Error fetching subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

      const { data, error } = await supabase
        .from("usage_tracking")
        .select("*")
        .eq("user_id", user.id)
        .eq("month_year", currentMonth)
        .maybeSingle();

      if (error) throw error;
      setUsage(data as unknown as UsageTracking);
    } catch (error: any) {
      console.error("Error fetching usage:", error);
    }
  };

  const canAddConnection = (): boolean => {
    if (!subscription) return true; // Default to allowing if no subscription
    
    const plan = subscription.plan;
    if (plan === "pro" || plan === "business") return true;
    
    const currentConnections = usage?.connections_count ?? 0;
    return currentConnections < 5;
  };

  const getConnectionsRemaining = (): number | "unlimited" => {
    if (!subscription) return 5;
    
    const plan = subscription.plan;
    if (plan === "pro" || plan === "business") return "unlimited";
    
    const currentConnections = usage?.connections_count ?? 0;
    return Math.max(0, 5 - currentConnections);
  };

  const incrementConnectionCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc("increment_connection_count", {
        p_user_id: user.id,
      });

      if (error) throw error;
      
      // Refresh usage after incrementing
      await fetchUsage();
    } catch (error: any) {
      console.error("Error incrementing connection count:", error);
    }
  };

  const upgradePlan = async (newPlan: SubscriptionPlan) => {
    // This is a placeholder for Stripe integration
    // In production, this would redirect to Stripe checkout
    toast({
      title: "Upgrade Coming Soon",
      description: "Stripe integration will be added to handle payments.",
    });
  };

  const cancelSubscription = async () => {
    // Placeholder for cancellation logic
    toast({
      title: "Cancel Coming Soon",
      description: "Stripe integration will be added to handle cancellations.",
    });
  };

  const getCurrentPlan = (): SubscriptionPlan => {
    return subscription?.plan ?? "free";
  };

  const getPlanFeatures = (): PlanFeatures => {
    return PLAN_FEATURES[getCurrentPlan()];
  };

  const hasFeature = (feature: keyof PlanFeatures): boolean => {
    const features = getPlanFeatures();
    return Boolean(features[feature]);
  };

  return {
    subscription,
    usage,
    loading,
    canAddConnection,
    getConnectionsRemaining,
    incrementConnectionCount,
    upgradePlan,
    cancelSubscription,
    getCurrentPlan,
    getPlanFeatures,
    hasFeature,
    refreshSubscription: fetchSubscription,
    refreshUsage: fetchUsage,
  };
}
