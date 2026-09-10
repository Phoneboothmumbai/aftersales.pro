import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Check,
  ArrowRight,
  Zap,
  Smartphone,
  Laptop,
  Building2,
  Globe,
  MessageSquare,
  FileText,
  Package,
  Users,
  BarChart3,
  Shield,
  IndianRupee,
  Star,
} from "lucide-react";

const featurePages = {
  "mobile-repair-software": {
    title: "Mobile Phone Repair Shop Software",
    subtitle: "Complete Solution for Mobile & Smartphone Repair Businesses",
    description: "Manage your mobile phone repair shop efficiently with AfterSales.pro. Track IMEI numbers, manage repairs, send WhatsApp updates, and grow your business.",
    icon: Smartphone,
    keywords: "mobile repair software, phone repair shop software, smartphone repair management, cell phone repair software, mobile service center software, iphone repair software, android repair management",
    benefits: [
      "IMEI & Serial Number Tracking",
      "WhatsApp Customer Updates",
      "Phone Condition Assessment",
      "Parts Inventory Management",
      "Customer Device History",
      "Warranty Tracking",
      "PDF Job Sheets",
      "Multi-Brand Support (Apple, Samsung, etc.)"
    ],
    useCases: [
      "Independent mobile repair shops",
      "Authorized service centers",
      "Multi-brand repair stores",
      "Mall kiosk repair businesses",
      "Mobile repair chains"
    ],
    stats: { shops: "500+", repairs: "50,000+", satisfaction: "98%" }
  },
  "laptop-repair-software": {
    title: "Laptop & Computer Repair Software",
    subtitle: "Professional Management for Laptop Service Centers",
    description: "Streamline your laptop and computer repair business with AfterSales.pro. Handle complex repairs, track parts, manage warranties, and keep customers informed.",
    icon: Laptop,
    keywords: "laptop repair software, computer repair management, pc repair shop software, laptop service center software, computer technician software, IT repair management",
    benefits: [
      "Detailed Diagnostic Tracking",
      "Component-Level Repair Records",
      "Data Backup Consent Management",
      "Warranty Period Tracking",
      "Parts Ordering Integration",
      "Customer Data Protection",
      "Repair Cost Estimation",
      "Hardware & Software Issue Tracking"
    ],
    useCases: [
      "Laptop service centers",
      "Computer repair shops",
      "IT support businesses",
      "Corporate IT departments",
      "University tech support"
    ],
    stats: { shops: "200+", repairs: "25,000+", satisfaction: "97%" }
  },
  "multi-branch-repair-software": {
    title: "Multi-Branch Repair Shop Software",
    subtitle: "Scale Your Repair Business Across Multiple Locations",
    description: "Manage multiple repair shop branches from a single dashboard. Track inventory, staff, and jobs across all locations with AfterSales.pro's multi-branch solution.",
    icon: Building2,
    keywords: "multi-branch repair software, repair chain management, multiple location repair shop, franchise repair software, repair business scaling, multi-store repair management",
    benefits: [
      "Centralized Dashboard",
      "Branch-Wise Reporting",
      "Inter-Branch Inventory Transfer",
      "Role-Based Access Control",
      "Branch Performance Comparison",
      "Unified Customer Database",
      "Staff Management per Branch",
      "Consolidated Billing"
    ],
    useCases: [
      "Repair shop chains",
      "Franchise operations",
      "Regional service networks",
      "Growing repair businesses",
      "Corporate service centers"
    ],
    stats: { chains: "50+", branches: "200+", efficiency: "40%" }
  },
  "repair-shop-india": {
    title: "Repair Shop Software for India",
    subtitle: "Made in India, Made for Indian Repair Businesses",
    description: "AfterSales.pro is built specifically for Indian repair shops. INR pricing, GST compliance, WhatsApp integration, Hindi support, and Razorpay payments.",
    icon: IndianRupee,
    keywords: "repair shop software india, mobile repair software india, laptop repair india, service center software india, repair management india, gst billing repair shop",
    benefits: [
      "INR Pricing - No Forex Charges",
      "GST Compliant Invoicing",
      "WhatsApp Integration",
      "Hindi Language Support",
      "Razorpay Payment Gateway",
      "UPI Payment Support",
      "Indian Customer Support",
      "Local Server for Fast Access"
    ],
    useCases: [
      "Mobile repair shops in India",
      "Laptop service centers",
      "Electronics repair businesses",
      "Authorized service partners",
      "Local repair technicians"
    ],
    stats: { cities: "100+", shops: "500+", growth: "200%" }
  },
  "repair-shop-usa": {
    title: "Repair Shop Software for USA",
    subtitle: "Affordable Alternative to Expensive US Repair Software",
    description: "Get premium repair shop management features at a fraction of the cost. AfterSales.pro offers everything US repair shops need without the premium price tag.",
    icon: Globe,
    keywords: "repair shop software usa, cell phone repair software usa, computer repair software america, affordable repair software, repairdesk alternative usa",
    benefits: [
      "Competitive USD Pricing",
      "All Premium Features Included",
      "SMS & Email Notifications",
      "Customer Portal",
      "Inventory Management",
      "Multi-Location Support",
      "Cloud-Based Access",
      "24/7 Support"
    ],
    useCases: [
      "Cell phone repair shops",
      "Computer repair stores",
      "Electronics repair businesses",
      "Franchise locations",
      "Independent technicians"
    ],
    stats: { savings: "60%", features: "100+", uptime: "99.9%" }
  },
  "repair-shop-uk": {
    title: "Repair Shop Software for UK",
    subtitle: "Modern Repair Management for British Repair Shops",
    description: "AfterSales.pro offers UK repair shops an affordable, feature-rich alternative to expensive European software. WhatsApp updates, cloud access, and great support.",
    icon: Globe,
    keywords: "repair shop software uk, mobile repair software uk, computer repair uk, repair management united kingdom, phone repair software britain",
    benefits: [
      "Affordable GBP Pricing",
      "WhatsApp Integration",
      "VAT Compliant Invoicing",
      "Customer Self-Tracking",
      "Multi-Branch Support",
      "Cloud-Based Platform",
      "GDPR Compliant",
      "Quick Setup"
    ],
    useCases: [
      "High street repair shops",
      "Mobile phone repair stores",
      "Computer repair businesses",
      "Electronics service centers",
      "Repair franchises"
    ],
    stats: { savings: "50%", setup: "30min", satisfaction: "98%" }
  },
  "repair-shop-uae": {
    title: "Repair Shop Software for UAE & Middle East",
    subtitle: "Repair Management Solution for Gulf Region",
    description: "Manage your repair business in UAE, Saudi Arabia, and the Middle East with AfterSales.pro. Multi-currency support, WhatsApp integration, and Arabic-friendly interface.",
    icon: Globe,
    keywords: "repair shop software uae, mobile repair dubai, repair management middle east, service center software gulf, phone repair software saudi arabia",
    benefits: [
      "Multi-Currency Support (AED, SAR)",
      "WhatsApp Business Integration",
      "Arabic-Friendly Interface",
      "VAT Compliant",
      "Cloud-Based Access",
      "Multi-Branch Support",
      "Customer Portal",
      "Fast Regional Support"
    ],
    useCases: [
      "Dubai repair shops",
      "Abu Dhabi service centers",
      "Saudi repair businesses",
      "Qatar electronics shops",
      "Regional repair chains"
    ],
    stats: { countries: "6+", shops: "100+", languages: "3" }
  },
  "whatsapp-repair-software": {
    title: "Repair Software with WhatsApp Integration",
    subtitle: "Keep Customers Updated via WhatsApp Automatically",
    description: "Send automated WhatsApp updates to customers at every stage of repair. Job received, diagnosis, approval needed, ready for pickup - all automated.",
    icon: MessageSquare,
    keywords: "whatsapp repair software, whatsapp job updates, automated customer notifications, repair shop whatsapp, service center whatsapp integration",
    benefits: [
      "Automated Status Updates",
      "One-Click WhatsApp Messages",
      "Custom Message Templates",
      "Delivery Notifications",
      "Payment Reminders",
      "Approval Request Links",
      "Customer Tracking Links",
      "Bulk Messaging for Promotions"
    ],
    useCases: [
      "High-volume repair shops",
      "Customer-focused businesses",
      "Service centers with many clients",
      "Shops wanting to reduce calls",
      "Businesses improving satisfaction"
    ],
    stats: { messages: "100K+", satisfaction: "+45%", calls: "-60%" }
  },
};

export default function FeaturePage() {
  const navigate = useNavigate();
  const { feature } = useParams();
  const data = featurePages[feature];

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Page not found</h1>
          <p className="text-gray-600 mb-6">Explore our feature pages:</p>
          <div className="flex flex-wrap gap-2 justify-center mb-8 max-w-2xl">
            {Object.keys(featurePages).map(key => (
              <Button 
                key={key} 
                variant="outline" 
                size="sm"
                onClick={() => navigate(`/features/${key}`)}
              >
                {featurePages[key].title}
              </Button>
            ))}
          </div>
          <Button onClick={() => navigate("/")} className="bg-blue-600 hover:bg-blue-700">Go Home</Button>
        </div>
      </div>
    );
  }

  const IconComponent = data.icon;

  return (
    <>
      <Helmet>
        <title>{data.title} | AfterSales.pro - Free Trial</title>
        <meta name="description" content={data.description} />
        <meta name="keywords" content={data.keywords} />
        <link rel="canonical" href={`https://aftersales.pro/features/${feature}`} />
        <meta property="og:title" content={`${data.title} | AfterSales.pro`} />
        <meta property="og:description" content={data.description} />
        <meta property="og:url" content={`https://aftersales.pro/features/${feature}`} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": `AfterSales.pro - ${data.title}`,
            "applicationCategory": "BusinessApplication",
            "description": data.description,
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "INR"
            }
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">AfterSales.pro</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/")} className="text-gray-600 hover:text-gray-900 hidden sm:inline-flex">
                Home
              </Button>
              <Button onClick={() => navigate("/signup")} className="bg-blue-600 hover:bg-blue-700">
                Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 mb-6">
              <IconComponent className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {data.title}
            </h1>
            <p className="text-xl text-gray-700 mb-4">{data.subtitle}</p>
            <p className="text-gray-600 max-w-3xl mx-auto mb-8">{data.description}</p>
            
            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 mb-8">
              {Object.entries(data.stats).map(([key, value]) => (
                <div key={key} className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{value}</p>
                  <p className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => navigate("/signup")} size="lg" className="bg-blue-600 hover:bg-blue-700">
                Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button onClick={() => navigate("/contact")} size="lg" variant="outline">
                Contact Sales
              </Button>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Key Features & Benefits</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.benefits.map((benefit, index) => (
                <Card key={index} className="bg-white border-gray-200 shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-800">{benefit}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">Perfect For</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.useCases.map((useCase, index) => (
                <Card key={index} className="bg-white border-gray-200 hover:border-blue-300 transition-colors shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-gray-800">{useCase}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* All Features Overview */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Complete Repair Management</h2>
            <p className="text-gray-600 text-center mb-12">Everything you need to run your repair business efficiently</p>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-6 text-center">
                  <FileText className="w-10 h-10 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Job Management</h3>
                  <p className="text-gray-600 text-sm">Track every repair from intake to delivery with detailed status updates</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-6 text-center">
                  <MessageSquare className="w-10 h-10 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">WhatsApp Updates</h3>
                  <p className="text-gray-600 text-sm">Automated customer notifications at every stage of repair</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-6 text-center">
                  <Package className="w-10 h-10 text-orange-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Inventory Control</h3>
                  <p className="text-gray-600 text-sm">Track parts, set reorder alerts, and manage stock efficiently</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-6 text-center">
                  <Users className="w-10 h-10 text-purple-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Customer CRM</h3>
                  <p className="text-gray-600 text-sm">Complete customer history, ledger, and credit management</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-6 text-center">
                  <BarChart3 className="w-10 h-10 text-cyan-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Reports & Analytics</h3>
                  <p className="text-gray-600 text-sm">Profit tracking, performance metrics, and business insights</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-6 text-center">
                  <Shield className="w-10 h-10 text-red-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure & Reliable</h3>
                  <p className="text-gray-600 text-sm">Your data is encrypted and backed up automatically</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="py-16 px-4 bg-blue-50">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center mb-4">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-6 h-6 text-yellow-500 fill-yellow-500" />)}
            </div>
            <blockquote className="text-xl text-gray-700 italic mb-4">
              "AfterSales.pro transformed how we run our repair shop. Customer satisfaction is up 40% thanks to WhatsApp updates, and we've saved hours on paperwork every week."
            </blockquote>
            <p className="text-gray-600">— Verified Customer</p>
          </div>
        </section>

        {/* Other Features */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Explore More Solutions</h2>
            <div className="flex flex-wrap gap-2 justify-center">
              {Object.keys(featurePages).filter(k => k !== feature).map(key => (
                <Button 
                  key={key} 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/features/${key}`)}
                >
                  {featurePages[key].title}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Repair Shop?</h2>
            <p className="text-blue-100 mb-8">
              Join 500+ repair shops using AfterSales.pro. Start your free trial today - no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => navigate("/signup")} size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button onClick={() => navigate("/")} size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                View All Features
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-4 border-t border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto text-center text-gray-600 text-sm">
            <p>© 2024 AfterSales.pro. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
