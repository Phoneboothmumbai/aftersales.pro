import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { Smartphone, Monitor, Lock, Loader2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ModuleSettings() {
  const { token, isAdmin } = useAuth();
  const [modules, setModules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/tenants/modules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setModules(response.data);
    } catch (error) {
      console.error("Failed to fetch modules:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (moduleKey, currentValue) => {
    if (!isAdmin) {
      toast.error("Only admins can change module settings");
      return;
    }

    const moduleInfo = modules.available_modules[moduleKey];
    if (!moduleInfo.available_in_plan) {
      toast.error("This module is not available in your current plan. Upgrade to Pro to enable.");
      return;
    }

    setSaving(true);
    try {
      const newModules = {
        ...modules.enabled_modules,
        [moduleKey]: !currentValue,
      };
      
      await axios.put(`${API}/tenants/modules`, newModules, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setModules({
        ...modules,
        enabled_modules: newModules,
        available_modules: {
          ...modules.available_modules,
          [moduleKey]: {
            ...moduleInfo,
            enabled: !currentValue,
          },
        },
      });
      
      toast.success(`${moduleInfo.name} ${!currentValue ? "enabled" : "disabled"}`);
      
      // Refresh page to update sidebar
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update module settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="card-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!modules) return null;

  const moduleConfig = [
    {
      key: "mobile_phone_trading",
      icon: Smartphone,
      color: "text-blue-500",
    },
    {
      key: "it_equipment_trading",
      icon: Monitor,
      color: "text-purple-500",
    },
  ];

  return (
    <Card className="card-shadow" data-testid="module-settings">
      <CardHeader>
        <CardTitle>Trading Modules</CardTitle>
        <CardDescription>
          Enable or disable trading modules for your shop. Disabled modules will not appear in the sidebar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {moduleConfig.map(({ key, icon: Icon, color }) => {
          const moduleInfo = modules.available_modules[key];
          if (!moduleInfo) return null;
          
          const isEnabled = modules.enabled_modules[key] !== false;
          const isAvailable = moduleInfo.available_in_plan;

          return (
            <div
              key={key}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                !isAvailable ? "opacity-60 bg-muted/30" : "bg-muted/10"
              }`}
              data-testid={`module-${key}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isEnabled && isAvailable ? "bg-primary/10" : "bg-muted"
                }`}>
                  <Icon className={`w-5 h-5 ${isEnabled && isAvailable ? color : "text-muted-foreground"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{moduleInfo.name}</p>
                    {!isAvailable && (
                      <Badge variant="outline" className="text-xs">
                        <Lock className="w-3 h-3 mr-1" />
                        Pro Plan
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{moduleInfo.description}</p>
                  {moduleInfo.categories && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Categories: {moduleInfo.categories.join(", ")}
                    </p>
                  )}
                </div>
              </div>
              
              <Switch
                checked={isEnabled && isAvailable}
                onCheckedChange={() => handleToggle(key, isEnabled)}
                disabled={!isAvailable || saving || !isAdmin}
                data-testid={`toggle-${key}`}
              />
            </div>
          );
        })}

        {!isAdmin && (
          <p className="text-sm text-muted-foreground text-center">
            Only shop admins can change module settings.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
