import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import LanguageSelector from "../components/LanguageSelector";
import { Wrench, Mail, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: "",
    subdomain: localStorage.getItem("subdomain") || "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await axios.post(`${API}/auth/forgot-password`, {
        email: formData.email,
        subdomain: formData.subdomain,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send reset link. Please try again.");
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
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Forgot Password?</CardTitle>
            <CardDescription>
              {success 
                ? "Check your email for the reset link" 
                : "Enter your email and we'll send you a reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3 p-4 bg-green-500/10 text-green-600 rounded-lg">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Reset link sent!</p>
                    <p className="text-sm opacity-90">
                      If an account exists for {formData.email}, you&apos;ll receive an email with instructions.
                    </p>
                  </div>
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  <p>Didn&apos;t receive the email?</p>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto" 
                    onClick={() => setSuccess(false)}
                  >
                    Try again
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="subdomain">Shop Subdomain</Label>
                  <div className="flex">
                    <Input
                      id="subdomain"
                      name="subdomain"
                      type="text"
                      placeholder="yourshop"
                      value={formData.subdomain}
                      onChange={handleChange}
                      className="rounded-r-none"
                      required
                      data-testid="forgot-subdomain-input"
                    />
                    <div className="flex items-center px-3 bg-muted border border-l-0 border-input rounded-r-lg text-sm text-muted-foreground">
                      .aftersales.pro
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    data-testid="forgot-email-input"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading} 
                  data-testid="forgot-submit-btn"
                >
                  {loading ? (
                    <>
                      <span className="spinner mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Reset Link
                    </>
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link 
                to="/login" 
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
                data-testid="back-to-login-link"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
