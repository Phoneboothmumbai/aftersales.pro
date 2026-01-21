import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await axios.get(`${API}/public/plans`);
        // Filter and sort plans for display
        const displayPlans = response.data
          .filter(p => p.is_active !== false && !p.is_deleted)
          .sort((a, b) => (a.price || 0) - (b.price || 0))
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
    const features = [];
    if (plan.max_jobs_per_month === -1) {
      features.push("Unlimited jobs");
    } else {
      features.push(`Up to ${plan.max_jobs_per_month} jobs/month`);
    }
    if (plan.max_branches === -1) {
      features.push("Unlimited Branches");
    } else {
      features.push(`${plan.max_branches} Branch${plan.max_branches > 1 ? 'es' : ''}`);
    }
    if (plan.max_users === -1) {
      features.push("Unlimited Team members");
    } else {
      features.push(`${plan.max_users} Team member${plan.max_users > 1 ? 's' : ''}`);
    }
    if (plan.features?.whatsapp_messages) features.push("WhatsApp messaging");
    if (plan.features?.pdf_job_sheet) features.push("PDF job sheets");
    if (plan.features?.photo_upload) features.push("Photo uploads");
    if (plan.features?.inventory_management) features.push("Inventory management");
    if (plan.features?.advanced_analytics) features.push("Advanced analytics");
    if (plan.features?.priority_support) features.push("Priority support");
    if (plan.features?.api_access) features.push("API access");
    if (plan.features?.dedicated_account_manager) features.push("Dedicated support");
    return features.slice(0, 6); // Max 6 features displayed
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
      title: "Digital Job Sheets",
      description:
        "Create professional job sheets with customer info, device details, and accessories checklist. Never lose track of a device again.",
    },
    {
      icon: MessageSquare,
      title: "WhatsApp Updates",
      description:
        "Send instant status updates to customers via WhatsApp. One click, professional communication.",
    },
    {
      icon: BarChart3,
      title: "Real-time Dashboard",
      description:
        "Track all jobs at a glance. Know what's pending, what's ready, and what needs attention.",
    },
    {
      icon: Shield,
      title: "Dispute Prevention",
      description:
        "Accessories checklist, device condition notes, and full audit trail. Protect your business.",
    },
    {
      icon: Clock,
      title: "Status Timeline",
      description:
        "Every status change is timestamped and logged. Complete transparency for you and your customers.",
    },
    {
      icon: Wrench,
      title: "Multi-Branch Ready",
      description:
        "Manage multiple shop locations from a single dashboard. Perfect for growing businesses.",
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
                Features
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <Button variant="ghost" onClick={() => navigate("/login")} data-testid="nav-login-btn">
                Login
              </Button>
              <Button onClick={() => navigate("/signup")} data-testid="nav-signup-btn">
                Start Free Trial
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
                  Features
                </a>
                <a href="#pricing" className="text-muted-foreground hover:text-foreground">
                  Pricing
                </a>
                <Button variant="ghost" onClick={() => navigate("/login")} className="justify-start">
                  Login
                </Button>
                <Button onClick={() => navigate("/signup")}>Start Free Trial</Button>
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
                Now with 14-day free trial
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
                Repair shop management,{" "}
                <span className="text-primary">simplified</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                Stop losing devices, stop disputes, stop chaos. AfterSales.pro brings control, traceability, and
                professional customer communication to your repair business.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="btn-hover"
                  onClick={() => navigate("/signup")}
                  data-testid="hero-start-trial-btn"
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/login")}
                  data-testid="hero-login-btn"
                >
                  Login to Dashboard
                </Button>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Setup in 2 minutes
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
                        <p className="text-sm text-muted-foreground">Active Jobs</p>
                        <p className="text-2xl font-bold">24</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Completed Today</p>
                        <p className="text-2xl font-bold text-green-600">8</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pending Delivery</p>
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
              Everything you need to run a modern repair shop
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From job creation to delivery, we&apos;ve got every step covered.
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
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-lg text-muted-foreground">Simple workflow, powerful results</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Create Job", desc: "Customer walks in, fill the form" },
              { step: "2", title: "Diagnose", desc: "Add diagnosis and cost estimate" },
              { step: "3", title: "Repair", desc: "Complete work and update status" },
              { step: "4", title: "Deliver", desc: "Close job and collect payment" },
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
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-muted-foreground">Start free, scale as you grow</p>
          </div>
          {loadingPlans ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className={`grid gap-8 max-w-6xl mx-auto ${plans.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
              {plans.map((plan, index) => (
                <Card
                  key={plan.id || index}
                  className={`relative ${isPopular(plan, index) ? "border-primary shadow-lg scale-105" : ""}`}
                >
                  {isPopular(plan, index) && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-sm px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                    <div className="mb-6">
                      <span className="text-4xl font-bold">{formatPrice(plan)}</span>
                      <span className="text-muted-foreground text-sm ml-1">{formatPeriod(plan)}</span>
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
                      variant={isPopular(plan, index) ? "default" : "outline"}
                      onClick={() => navigate("/signup")}
                      data-testid={`pricing-${plan.name?.toLowerCase().replace(/\s+/g, '-')}-btn`}
                    >
                      {getCta(plan)}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to transform your repair business?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join hundreds of repair shops already using AfterSales.pro
          </p>
          <Button size="lg" onClick={() => navigate("/signup")} data-testid="cta-start-btn">
            Start Your Free Trial
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
                <a href="/legal/privacy_policy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </a>
                <a href="/legal/terms_of_service" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
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
                © {new Date().getFullYear()} AfterSales.pro. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
