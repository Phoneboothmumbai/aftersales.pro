import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Building2,
  Globe,
  MessageCircle,
  Clock,
} from "lucide-react";

export default function Contact() {
  const contactInfo = {
    name: "aftersales.pro",
    legalName: "The Good Men Enterprise",
    phone: "9769444455",
    email: "support@thegoodmen.in",
    address: "7, Lok Kedar, JSd Road, Mulund West, Mumbai - 400080",
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent("Hi, I have a query about aftersales.pro");
    window.open(`https://wa.me/91${contactInfo.phone}?text=${message}`, "_blank");
  };

  const handleCall = () => {
    window.open(`tel:+91${contactInfo.phone}`, "_self");
  };

  const handleEmail = () => {
    window.open(`mailto:${contactInfo.email}`, "_self");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">AS</span>
            </div>
            <span className="font-bold text-xl">aftersales.pro</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
            <p className="text-lg text-muted-foreground">
              Have questions? We'd love to hear from you. Reach out to us through any of the channels below.
            </p>
          </div>

          {/* Contact Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Phone Card */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleCall}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Call Us</h3>
                    <p className="text-2xl font-bold text-primary">+91 {contactInfo.phone}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Mon - Sat, 10:00 AM - 7:00 PM
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp Card */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleWhatsApp}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">WhatsApp</h3>
                    <p className="text-2xl font-bold text-green-600">+91 {contactInfo.phone}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Quick response within 2 hours
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Card */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleEmail}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Email Us</h3>
                    <p className="text-xl font-bold text-primary">{contactInfo.email}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      We'll respond within 24 hours
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Office Address</h3>
                    <p className="text-muted-foreground">{contactInfo.address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Business Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="font-bold text-xl">{contactInfo.name}</span>
                    </div>
                    <p className="text-muted-foreground">
                      A product by <span className="font-semibold">{contactInfo.legalName}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleWhatsApp} className="bg-green-600 hover:bg-green-700">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp Us
                  </Button>
                  <Button variant="outline" onClick={handleEmail}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FAQ Teaser */}
          <div className="mt-12 text-center">
            <p className="text-muted-foreground">
              Looking for help getting started?{" "}
              <Link to="/signup" className="text-primary font-semibold hover:underline">
                Sign up for free
              </Link>{" "}
              or{" "}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                login to your account
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-8 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {contactInfo.legalName}. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <Link to="/legal/privacy-policy" className="hover:text-primary">Privacy Policy</Link>
            <span>•</span>
            <Link to="/legal/terms-of-service" className="hover:text-primary">Terms of Service</Link>
            <span>•</span>
            <Link to="/legal/refund-policy" className="hover:text-primary">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
