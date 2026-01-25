import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Wrench, Eye, EyeOff, AlertCircle, Check, X, Loader2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    company_name: "",
    subdomain: "",
    phone: "",
    address: "",
    admin_name: "",
    admin_email: "",
    admin_password: "",
    confirm_password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [subdomainStatus, setSubdomainStatus] = useState({ checking: false, available: null });

  useEffect(() => {
    const checkSubdomain = async () => {
      if (formData.subdomain.length < 3) {
        setSubdomainStatus({ checking: false, available: null });
        return;
      }

      setSubdomainStatus({ checking: true, available: null });
      try {
        const response = await axios.get(`${API}/tenants/check-subdomain/${formData.subdomain}`);
        setSubdomainStatus({ checking: false, available: response.data.available });
      } catch {
        setSubdomainStatus({ checking: false, available: null });
      }
    };

    const debounce = setTimeout(checkSubdomain, 500);
    return () => clearTimeout(debounce);
  }, [formData.subdomain]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "subdomain") {
      // Only allow lowercase letters, numbers, and hyphens
      const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
      setFormData({ ...formData, [name]: sanitized });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const validateStep1 = () => {
    if (!formData.company_name.trim()) {
      setError("Company name is required");
      return false;
    }
    if (formData.subdomain.length < 3) {
      setError("Subdomain must be at least 3 characters");
      return false;
    }
    if (!subdomainStatus.available) {
      setError("Subdomain is not available");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.admin_name.trim()) {
      setError("Your name is required");
      return false;
    }
    if (!formData.admin_email.trim()) {
      setError("Email is required");
      return false;
    }
    if (formData.admin_password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (formData.admin_password !== formData.confirm_password) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    setError("");
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateStep2()) return;

    setLoading(true);
    try {
      await signup({
        company_name: formData.company_name,
        subdomain: formData.subdomain,
        phone: formData.phone,
        address: formData.address,
        admin_name: formData.admin_name,
        admin_email: formData.admin_email,
        admin_password: formData.admin_password,
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Wrench className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold tracking-tight">
            aftersales<span className="text-primary">.pro</span>
          </span>
        </div>

        <Card className="card-shadow">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Start your free trial</CardTitle>
            <CardDescription>14 days free, no credit card required</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  1
                </div>
                <span className="text-sm hidden sm:inline">Shop Info</span>
              </div>
              <div className={`w-12 h-0.5 ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
              <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  2
                </div>
                <span className="text-sm hidden sm:inline">Account</span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm mb-4">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Shop / Company Name</Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    type="text"
                    placeholder="NeoStore Repairs"
                    value={formData.company_name}
                    onChange={handleChange}
                    required
                    data-testid="signup-company-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subdomain">Choose your subdomain</Label>
                  <div className="flex">
                    <Input
                      id="subdomain"
                      name="subdomain"
                      type="text"
                      placeholder="neostore"
                      value={formData.subdomain}
                      onChange={handleChange}
                      className="rounded-r-none"
                      required
                      data-testid="signup-subdomain-input"
                    />
                    <div className="flex items-center px-3 bg-muted border border-l-0 border-input rounded-r-lg text-sm text-muted-foreground">
                      .aftersales.pro
                    </div>
                  </div>
                  {formData.subdomain.length >= 3 && (
                    <div className="flex items-center gap-2 text-sm">
                      {subdomainStatus.checking ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          <span className="text-muted-foreground">Checking availability...</span>
                        </>
                      ) : subdomainStatus.available === true ? (
                        <>
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-green-500">Available!</span>
                        </>
                      ) : subdomainStatus.available === false ? (
                        <>
                          <X className="w-4 h-4 text-destructive" />
                          <span className="text-destructive">Already taken</span>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={handleChange}
                    data-testid="signup-phone-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Shop Address</Label>
                  <Input
                    id="address"
                    name="address"
                    type="text"
                    placeholder="123, Main Street, City"
                    value={formData.address}
                    onChange={handleChange}
                    data-testid="signup-address-input"
                  />
                </div>

                <Button
                  type="button"
                  className="w-full"
                  onClick={handleNextStep}
                  disabled={!subdomainStatus.available}
                  data-testid="signup-next-btn"
                >
                  Next Step
                </Button>
              </div>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin_name">Your Name</Label>
                  <Input
                    id="admin_name"
                    name="admin_name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.admin_name}
                    onChange={handleChange}
                    required
                    data-testid="signup-name-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin_email">Email Address</Label>
                  <Input
                    id="admin_email"
                    name="admin_email"
                    type="email"
                    placeholder="john@neostore.com"
                    value={formData.admin_email}
                    onChange={handleChange}
                    required
                    data-testid="signup-email-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin_password">Password</Label>
                  <div className="relative">
                    <Input
                      id="admin_password"
                      name="admin_password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.admin_password}
                      onChange={handleChange}
                      required
                      data-testid="signup-password-input"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm Password</Label>
                  <Input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    required
                    data-testid="signup-confirm-password-input"
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading} data-testid="signup-submit-btn">
                    {loading ? (
                      <>
                        <span className="spinner mr-2" />
                        Creating...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link to="/login" className="text-primary hover:underline" data-testid="signup-login-link">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
