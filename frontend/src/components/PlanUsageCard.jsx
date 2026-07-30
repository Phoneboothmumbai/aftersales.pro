import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Briefcase,
  Users,
  Building2,
  Package,
  Crown,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PlanUsageCard({ compact = false }) {
  const navigate = useNavigate();
  const { token, isAdmin } = useAuth();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const response = await axios.get(`${API}/tenants/plan-usage`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsage(response.data);
      } catch (error) {
        console.error("Failed to fetch plan usage:", error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchUsage();
    }
  }, [token]);

  if (loading) {
    return (
      <Card className="card-shadow">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-2 bg-muted rounded"></div>
            <div className="h-2 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usage) return null;

  const usageItems = [
    {
      label: "Jobs This Month",
      icon: Briefcase,
      used: usage.usage?.jobs_this_month?.current || 0,
      limit: usage.usage?.jobs_this_month?.limit,
      unlimited: usage.usage?.jobs_this_month?.unlimited,
      color: "text-blue-500",
      bgColor: "bg-blue-500",
    },
    {
      label: "Team Members",
      icon: Users,
      used: usage.usage?.users?.current || 0,
      limit: usage.usage?.users?.limit,
      unlimited: usage.usage?.users?.unlimited,
      color: "text-green-500",
      bgColor: "bg-green-500",
    },
    {
      label: "Branches",
      icon: Building2,
      used: usage.usage?.branches?.current || 0,
      limit: usage.usage?.branches?.limit,
      unlimited: usage.usage?.branches?.unlimited,
      color: "text-purple-500",
      bgColor: "bg-purple-500",
    },
    {
      label: "Inventory Items",
      icon: Package,
      used: usage.usage?.inventory_items?.current || 0,
      limit: usage.usage?.inventory_items?.limit,
      unlimited: usage.usage?.inventory_items?.unlimited,
      color: "text-orange-500",
      bgColor: "bg-orange-500",
    },
  ];

  // Check if any usage is near limit
  const hasWarning = usageItems.some((item) => {
    if (!item.limit || item.limit === -1 || item.limit >= 999999 || item.unlimited) return false;
    return (item.used / item.limit) >= 0.8;
  });

  const isFreePlan = usage.plan?.name?.toLowerCase() === "free";

  return (
    <Card className={`card-shadow ${hasWarning ? "border-orange-500/50" : ""}`} data-testid="plan-usage-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Crown className={`w-5 h-5 ${isFreePlan ? "text-muted-foreground" : "text-primary"}`} />
            {usage.plan?.name || "Free"} Plan
          </CardTitle>
          {hasWarning && (
            <Badge variant="outline" className="border-orange-500 text-orange-500">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Near Limits
            </Badge>
          )}
        </div>
        {usage.plan?.description && (
          <p className="text-sm text-muted-foreground">{usage.plan.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Usage Items */}
        <div className={compact ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
          {usageItems.map((item) => (
            <UsageItem key={item.label} {...item} compact={compact} />
          ))}
        </div>

        {/* Upgrade CTA for Admin on Free Plan */}
        {isAdmin && isFreePlan && (
          <div className="pt-2 border-t">
            <Button
              onClick={() => navigate("/billing")}
              className="w-full"
              size={compact ? "sm" : "default"}
              data-testid="upgrade-plan-btn"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UsageItem({ label, icon: Icon, used, limit, unlimited, color, bgColor, compact }) {
  const isUnlimited = unlimited || !limit || limit === -1 || limit >= 999999;
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  // Static class maps for Tailwind JIT compatibility
  const bgColorMap = {
    "bg-blue-500": "bg-blue-500/10",
    "bg-green-500": "bg-green-500/10",
    "bg-purple-500": "bg-purple-500/10",
    "bg-orange-500": "bg-orange-500/10",
  };
  const progressColorMap = {
    "bg-blue-500": "[&>div]:bg-blue-500",
    "bg-green-500": "[&>div]:bg-green-500",
    "bg-purple-500": "[&>div]:bg-purple-500",
    "bg-orange-500": "[&>div]:bg-orange-500",
  };

  const iconBgClass = bgColorMap[bgColor] || "bg-muted";
  const progressClass = isAtLimit 
    ? "[&>div]:bg-destructive" 
    : isNearLimit 
      ? "[&>div]:bg-orange-500" 
      : progressColorMap[bgColor] || "";

  return (
    <div className={`${compact ? "" : "p-3 bg-muted/30 rounded-lg"}`} data-testid={`usage-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 ${iconBgClass} rounded flex items-center justify-center`}>
            <Icon className={`w-3.5 h-3.5 ${color}`} />
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className={`text-sm font-mono ${isAtLimit ? "text-destructive font-bold" : isNearLimit ? "text-orange-500 font-semibold" : "text-muted-foreground"}`}>
          {used.toLocaleString()} / {isUnlimited ? "∞" : limit.toLocaleString()}
        </span>
      </div>
      {!isUnlimited && (
        <Progress
          value={percentage}
          className={`h-2 ${progressClass}`}
        />
      )}
      {isUnlimited && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full ${bgColor} opacity-30`} style={{ width: "100%" }}></div>
        </div>
      )}
    </div>
  );
}
