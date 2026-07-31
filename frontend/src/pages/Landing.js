import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import LanguageSelector from "../components/LanguageSelector";
import {
  Wrench,
  ClipboardList,
  MessageSquare,
  BarChart3,
  Shield,
  Clock,
  ArrowRight,
  Check,
  Menu,
  X,
  Loader2,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await axios.get(`${API}/public/plans`);
        // Plans are already filtered by show_on_pricing in the API
        // Sort by sort_order first, then by price
        const displayPlans = response.data
          .sort((a, b) => {
            if (a.sort_order !== b.sort_order) return (a.sort_order || 99) - (b.sort_order || 99);
            return (a.price || 0) - (b.price || 0);
          })
          .slice(0, 4); // Show max 4 plans
        
        if (displayPlans.length > 0) {
          setPlans(displayPlans);
        } else {
          // Use fallback if no plans returned
          setPlans(getDefaultPlans());
        }
      } catch (error) {
        console.error("Failed to fetch plans:", error);
        setPlans(getDefaultPlans());
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  const getDefaultPlans = () => [
    {
      id: "free",
      name: "Free",
      price: 0,
      billing_cycle: "month",
      max_jobs_per_month: 50,
      max_branches: 1,
      max_users: 2,
      features: { whatsapp_messages: true, pdf_job_sheet: true, job_management: true }
    },
    {
      id: "starter",
      name: "Starter",
      price: 499,
      billing_cycle: "month",
      max_jobs_per_month: 200,
      max_branches: 2,
      max_users: 5,
      features: { whatsapp_messages: true, pdf_job_sheet: true, job_management: true, photo_upload: true }
    },
    {
      id: "pro",
      name: "Pro",
      price: 999,
      billing_cycle: "month",
      max_jobs_per_month: -1,
      max_branches: 5,
      max_users: 15,
      features: { whatsapp_messages: true, pdf_job_sheet: true, inventory_management: true, advanced_analytics: true, priority_support: true }
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: -1,
      billing_cycle: "month",
      max_jobs_per_month: -1,
      max_branches: -1,
      max_users: -1,
      features: { api_access: true, dedicated_account_manager: true, custom_branding: true }
    }
  ];

  const formatPrice = (plan) => {
    if (plan.price === 0) return "Free";
    if (plan.price === -1 || plan.price === null) return "Custom";
    return `₹${plan.price}`;
  };

  const formatPeriod = (plan) => {
    if (plan.price === 0) return "forever";
    if (plan.price === -1 || plan.price === null) return "contact us";
    return `/${plan.billing_cycle || "month"}`;
  };

  const getPlanFeatures = (plan) => {
    // For Free plan
    if (plan.price === 0) {
      return [
        "2 Team members",
        "1 Branch",
        "30 Jobs/month",
        "50 Customers",
        "WhatsApp notifications",
        "PDF Job sheets",
        "QR Code tracking",
        "Basic reports",
      ];
    } else {
      // For Pro plan - highlight the value
      return [
        "Unlimited Team members",
        "Unlimited Branches",
        "Unlimited Jobs",
        "Unlimited Customers",
        "Inventory management",
        "Advanced analytics",
        "Profit & revenue reports",
        "Custom roles & permissions",
        "Multi-branch support",
        "Data export (CSV/Excel)",
        "Priority WhatsApp support",
      ];
    }
  };

  const getCta = (plan) => {
    if (plan.price === 0) return "Start Free";
    if (plan.price === -1 || plan.price === null) return "Contact Sales";
    return "Get Started";
  };

  const isPopular = (plan, index) => {
    // Mark the second plan (index 1) or "Pro" plan as popular
    return index === 1 || plan.name?.toLowerCase().includes("pro");
  };

  const features = [
    {
      icon: ClipboardList,
      title: t("landing.features.job_management.title"),
      description: t("landing.features.job_management.description"),
    },
    {
      icon: MessageSquare,
      title: t("landing.features.whatsapp.title"),
      description: t("landing.features.whatsapp.description"),
    },
    {
      icon: BarChart3,
      title: t("landing.features.analytics.title"),
      description: t("landing.features.analytics.description"),
    },
    {
      icon: Shield,
      title: t("landing.features.dispute_prevention.title"),
      description: t("landing.features.dispute_prevention.description"),
    },
    {
      icon: Clock,
      title: t("landing.features.status_timeline.title"),
      description: t("landing.features.status_timeline.description"),
    },
    {
      icon: Wrench,
      title: t("landing.features.multi_branch.title"),
      description: t("landing.features.multi_branch.description"),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                aftersales<span className="text-primary">.pro</span>
              </span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                {t("landing.footer.features")}
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                {t("landing.footer.pricing")}
              </a>
              <LanguageSelector variant="ghost" />
              <Button variant="ghost" onClick={() => navigate("/login")} data-testid="nav-login-btn">
                {t("auth.login.submit")}
              </Button>
              <Button onClick={() => navigate("/signup")} data-testid="nav-signup-btn">
                {t("landing.cta.button")}
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-border">
              <div className="flex flex-col gap-4">
                <a href="#features" className="text-muted-foreground hover:text-foreground">
                  {t("landing.footer.features")}
                </a>
                <a href="#pricing" className="text-muted-foreground hover:text-foreground">
                  {t("landing.footer.pricing")}
                </a>
                <div className="flex items-center gap-2">
                  <LanguageSelector showLabel />
                </div>
                <Button variant="ghost" onClick={() => navigate("/login")} className="justify-start">
                  {t("auth.login.submit")}
                </Button>
                <Button onClick={() => navigate("/signup")}>{t("landing.cta.button")}</Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="hero-gradient absolute inset-0" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                {t("landing.hero_badge")}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
                {t("landing.hero.title").split(",")[0]},{" "}
                <span className="text-primary">{t("landing.hero.title").split(",")[1] || "simplified"}</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                {t("landing.hero.subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="btn-hover"
                  onClick={() => navigate("/signup")}
                  data-testid="hero-start-trial-btn"
                >
                  {t("landing.hero.cta")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/login")}
                  data-testid="hero-login-btn"
                >
                  {t("landing.hero.cta_login")}
                </Button>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {t("landing.no_credit_card")}
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  {t("landing.setup_time")}
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1676630444903-163fe485c5d1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljcyUyMHJlcGFpciUyMHRlY2huaWNpYW4lMjB3b3JraW5nfGVufDB8fHx8MTc2ODQxNDc1N3ww&ixlib=rb-4.1.0&q=85"
                  alt="Technician working on electronics"
                  className="w-full aspect-[4/3] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("landing.active_jobs")}</p>
                        <p className="text-2xl font-bold">24</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t("landing.completed_today")}</p>
                        <p className="text-2xl font-bold text-green-600">8</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t("landing.pending_delivery")}</p>
                        <p className="text-2xl font-bold text-orange-500">5</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t("landing.features.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("landing.features.subtitle")}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="card-interactive animate-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t("landing.how_it_works.title")}</h2>
            <p className="text-lg text-muted-foreground">{t("landing.how_it_works.subtitle")}</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: t("landing.how_it_works.step1_title"), desc: t("landing.how_it_works.step1_desc") },
              { step: "2", title: t("landing.how_it_works.step2_title"), desc: t("landing.how_it_works.step2_desc") },
              { step: "3", title: t("landing.how_it_works.step3_title"), desc: t("landing.how_it_works.step3_desc") },
              { step: "4", title: t("landing.how_it_works.step4_title"), desc: t("landing.how_it_works.step4_desc") },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t("landing.pricing.title")}</h2>
            <p className="text-lg text-muted-foreground">{t("landing.pricing.subtitle")}</p>
          </div>
          {loadingPlans ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex justify-center">
              <div className={`grid gap-8 ${plans.length === 2 ? 'md:grid-cols-2 max-w-3xl' : plans.length > 2 ? 'md:grid-cols-3 max-w-6xl' : 'max-w-md'} mx-auto`}>
              {plans.map((plan, index) => (
                <Card
                  key={plan.id || index}
                  className={`relative ${plan.is_featured || plan.badge || plan.price > 0 ? 'border-primary border-2 shadow-xl' : 'border-border shadow-md'}`}
                >
                  {(plan.badge || plan.is_featured || plan.price > 0) && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <span className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                        {plan.badge || "Most Popular"}
                      </span>
                    </div>
                  )}
                  <CardContent className="p-8 pt-10">
                    <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                    <p className="text-muted-foreground text-sm mb-4">{plan.description || (plan.price === 0 ? "Perfect for getting started" : "Everything unlimited")}</p>
                    <div className="mb-6">
                      {plan.original_price && plan.original_price > plan.price && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg text-muted-foreground line-through">₹{plan.original_price}</span>
                          <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded">
                            SAVE {Math.round((1 - plan.price / plan.original_price) * 100)}%
                          </span>
                        </div>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">{plan.price === 0 ? 'Free' : `₹${plan.price}`}</span>
                        <span className="text-muted-foreground">
                          {plan.price === 0 ? 'forever' : plan.billing_cycle === 'yearly' ? '/year' : plan.billing_cycle === 'monthly' ? '/month' : `/${plan.billing_cycle}`}
                        </span>
                      </div>
                      {plan.price > 0 && plan.billing_cycle === 'yearly' && (
                        <p className="text-xs text-muted-foreground mt-1">+ 18% GST • Just ₹{Math.round(plan.price/12)}/month</p>
                      )}
                      {plan.price > 0 && plan.billing_cycle === 'monthly' && (
                        <p className="text-xs text-muted-foreground mt-1">+ 18% GST</p>
                      )}
                    </div>
                    <ul className="space-y-3 mb-6">
                      {getPlanFeatures(plan).map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={plan.price > 0 ? "default" : "outline"}
                      size="lg"
                      onClick={() => navigate("/signup")}
                      data-testid={`pricing-${plan.name?.toLowerCase().replace(/\s+/g, '-')}-btn`}
                    >
                      {plan.price === 0 ? 'Start Free' : 'Get Pro'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t("landing.cta.title")}
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t("landing.cta.subtitle")}
          </p>
          <Button size="lg" onClick={() => navigate("/signup")} data-testid="cta-start-btn">
            {t("landing.cta.button")}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold">
                  aftersales<span className="text-primary">.pro</span>
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <a href="/contact" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                  {t("landing.footer.contact")}
                </a>
                <a href="/legal/privacy_policy" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t("landing.footer.privacy")}
                </a>
                <a href="/legal/terms_of_service" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t("landing.footer.terms")}
                </a>
                <a href="/legal/refund_policy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Refund Policy
                </a>
                <a href="/legal/disclaimer" className="text-muted-foreground hover:text-foreground transition-colors">
                  Disclaimer
                </a>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {t("landing.footer.copyright")}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
