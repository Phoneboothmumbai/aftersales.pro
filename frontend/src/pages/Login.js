import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import LanguageSelector from "../components/LanguageSelector";
import { Wrench, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    subdomain: localStorage.getItem("subdomain") || "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(formData.email, formData.password, formData.subdomain);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Language Selector */}
        <div className="flex justify-end mb-4">
          <LanguageSelector variant="ghost" showLabel />
        </div>

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
            <CardTitle className="text-2xl">{t("auth.login.title")}</CardTitle>
            <CardDescription>{t("auth.login.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="subdomain">{t("auth.login.subdomain")}</Label>
                <div className="flex">
                  <Input
                    id="subdomain"
                    name="subdomain"
                    type="text"
                    placeholder={t("auth.login.subdomain_placeholder")}
                    value={formData.subdomain}
                    onChange={handleChange}
                    className="rounded-r-none"
                    required
                    data-testid="login-subdomain-input"
                  />
                  <div className="flex items-center px-3 bg-muted border border-l-0 border-input rounded-r-lg text-sm text-muted-foreground">
                    .aftersales.pro
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.login.email")}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t("auth.login.email_placeholder")}
                  value={formData.email}
                  onChange={handleChange}
                  required
                  data-testid="login-email-input"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t("auth.login.password")}</Label>
                  <Link 
                    to="/forgot-password" 
                    className="text-xs text-primary hover:underline"
                    data-testid="forgot-password-link"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("auth.login.password_placeholder")}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    data-testid="login-password-input"
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

              <Button type="submit" className="w-full" disabled={loading} data-testid="login-submit-btn">
                {loading ? (
                  <>
                    <span className="spinner mr-2" />
                    {t("common.loading")}
                  </>
                ) : (
                  t("auth.login.submit")
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">{t("auth.login.no_account")} </span>
              <Link to="/signup" className="text-primary hover:underline" data-testid="login-signup-link">
                {t("auth.login.signup_link")}
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← {t("common.back")} to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
