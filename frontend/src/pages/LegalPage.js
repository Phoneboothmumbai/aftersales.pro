import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ArrowLeft, Loader2, FileText, Shield, Scale, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PAGE_CONFIG = {
  privacy_policy: {
    title: "Privacy Policy",
    icon: Shield,
    description: "How we collect, use, and protect your data"
  },
  terms_of_service: {
    title: "Terms of Service",
    icon: Scale,
    description: "Terms and conditions for using our platform"
  },
  refund_policy: {
    title: "Refund & Cancellation Policy",
    icon: FileText,
    description: "Our refund and cancellation terms"
  },
  disclaimer: {
    title: "Disclaimer",
    icon: AlertTriangle,
    description: "Important disclaimers and limitations"
  }
};

export default function LegalPage() {
  const { pageType } = useParams();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyName, setCompanyName] = useState("");

  // Get subdomain from URL or localStorage
  const getSubdomain = () => {
    const hostname = window.location.hostname;
    const parts = hostname.split(".");
    if (parts.length > 2 && parts[0] !== "www") {
      return parts[0];
    }
    // Try from localStorage (for preview environments)
    const tenant = JSON.parse(localStorage.getItem("tenant") || "{}");
    return tenant.subdomain || null;
  };

  useEffect(() => {
    const fetchLegalPage = async () => {
      setLoading(true);
      setError(null);
      try {
        const subdomain = getSubdomain();
        const url = subdomain 
          ? `${API}/legal/${pageType}?subdomain=${subdomain}`
          : `${API}/legal/${pageType}`;
        
        const response = await axios.get(url);
        setContent(response.data.content);
        setCompanyName(response.data.company_name || "");
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load page");
      } finally {
        setLoading(false);
      }
    };

    if (pageType && PAGE_CONFIG[pageType]) {
      fetchLegalPage();
    } else {
      setError("Page not found");
      setLoading(false);
    }
  }, [pageType]);

  const config = PAGE_CONFIG[pageType] || {
    title: "Legal",
    icon: FileText,
    description: ""
  };
  const Icon = config.icon;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800 border-slate-700 max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Page Not Found</h2>
            <p className="text-slate-400 mb-4">{error}</p>
            <Link to="/">
              <Button className="bg-red-600 hover:bg-red-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link to="/" className="inline-flex items-center text-slate-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center">
              <Icon className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{config.title}</h1>
              {companyName && (
                <p className="text-slate-400">{companyName}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6 md:p-8">
            <div className="prose prose-invert prose-slate max-w-none
              prose-headings:text-white prose-headings:font-bold
              prose-h1:text-2xl prose-h1:mb-6 prose-h1:pb-4 prose-h1:border-b prose-h1:border-slate-700
              prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
              prose-p:text-slate-300 prose-p:leading-relaxed
              prose-li:text-slate-300
              prose-strong:text-white
              prose-ul:list-disc prose-ul:pl-6
              prose-ol:list-decimal prose-ol:pl-6
            ">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
          {Object.entries(PAGE_CONFIG).map(([key, cfg]) => (
            <Link
              key={key}
              to={`/legal/${key}`}
              className={`text-slate-400 hover:text-white transition-colors ${
                key === pageType ? "text-red-500" : ""
              }`}
            >
              {cfg.title}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
