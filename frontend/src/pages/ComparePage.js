import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Check,
  X,
  ArrowRight,
  Zap,
  Globe,
  Star,
} from "lucide-react";

const competitors = {
  // Indian Competitors
  repairdesk: {
    name: "RepairDesk",
    tagline: "Looking for a RepairDesk Alternative?",
    description: "RepairDesk is a popular repair shop software, but many users find it expensive and complex. AfterSales.pro offers a simpler, more affordable solution built for the Indian market.",
    pricing: "$49-$99/month (₹4,000-8,000)",
    ourPricing: "₹499-2,999/month",
    location: "USA-based",
    cons: ["Expensive for Indian market", "Complex setup", "USD pricing", "No WhatsApp integration", "Limited India support"],
    keywords: "repairdesk alternative, repairdesk vs, repairdesk india, repairdesk pricing, repairdesk competitor, best repairdesk alternative 2024",
  },
  repairshopr: {
    name: "RepairShopr",
    tagline: "Why Shops Switch from RepairShopr to AfterSales.pro",
    description: "RepairShopr (now Syncro) is designed for the US market. If you're in India or need WhatsApp integration, AfterSales.pro is built specifically for you.",
    pricing: "$59-$219/month (₹4,900-18,000)",
    ourPricing: "₹499-2,999/month",
    location: "USA-based",
    cons: ["Very expensive", "No WhatsApp", "US-focused features", "Overkill for repair shops", "No INR billing"],
    keywords: "repairshopr alternative, repairshopr india, syncro alternative, repairshopr pricing, repairshopr vs",
  },
  mhelpdesk: {
    name: "mHelpDesk",
    tagline: "mHelpDesk Alternative for Repair Shops",
    description: "mHelpDesk is a field service management tool, not specifically designed for repair shops. AfterSales.pro is purpose-built for mobile and laptop repair businesses.",
    pricing: "$169+/month (₹14,000+)",
    ourPricing: "₹499-2,999/month",
    location: "USA-based",
    cons: ["Not repair-focused", "Very expensive", "No IMEI tracking", "No repair workflow", "No WhatsApp"],
    keywords: "mhelpdesk alternative, mhelpdesk pricing, field service software alternative, mhelpdesk vs",
  },
  bytephase: {
    name: "BytePhase",
    tagline: "AfterSales.pro vs BytePhase - Which is Better?",
    description: "BytePhase is another Indian repair shop software. See how AfterSales.pro compares with better WhatsApp integration, modern UI, and transparent pricing.",
    pricing: "₹999-4,999/month",
    ourPricing: "₹499-2,999/month",
    location: "India-based",
    cons: ["Limited WhatsApp features", "Dated interface", "Limited inventory", "No customer ledger", "Basic reporting"],
    keywords: "bytephase alternative, bytephase vs, repair software india, bytephase pricing, bytephase competitor",
  },
  servicecircle: {
    name: "ServiceCircle",
    tagline: "ServiceCircle Alternative - Modern Repair Shop Software",
    description: "ServiceCircle offers repair management for India. Compare it with AfterSales.pro's modern interface, better WhatsApp automation, and multi-branch support at competitive pricing.",
    pricing: "₹799-2,499/month",
    ourPricing: "₹499-2,999/month",
    location: "India-based",
    cons: ["Limited automation", "Basic WhatsApp", "No used device trading", "Limited customer ledger", "Older UI design"],
    keywords: "servicecircle alternative, servicecircle vs, servicecircle pricing, service circle repair software, servicecircle competitor",
  },
  // Global Competitors
  fixably: {
    name: "Fixably",
    tagline: "Fixably Alternative for Growing Repair Shops",
    description: "Fixably is a European repair management platform. For shops in India or those needing WhatsApp integration and INR pricing, AfterSales.pro is the better choice.",
    pricing: "€79-299/month (₹7,000-26,000)",
    ourPricing: "₹499-2,999/month",
    location: "Finland-based",
    cons: ["Expensive Euro pricing", "No WhatsApp", "European focus", "No INR billing", "Complex for small shops"],
    keywords: "fixably alternative, fixably pricing, fixably vs, repair shop software europe, fixably competitor",
  },
  cellsmartpos: {
    name: "CellSmart POS",
    tagline: "CellSmart POS Alternative with Better Value",
    description: "CellSmart POS is a US-based repair point of sale system. AfterSales.pro offers similar features at a fraction of the cost, with India-specific features.",
    pricing: "$79-199/month (₹6,500-16,500)",
    ourPricing: "₹499-2,999/month",
    location: "USA-based",
    cons: ["Expensive USD pricing", "POS-focused not repair-focused", "No WhatsApp", "No INR support", "US market only"],
    keywords: "cellsmart pos alternative, cellsmart pricing, cell phone repair pos, cellsmart vs, repair pos system",
  },
  repairq: {
    name: "RepairQ",
    tagline: "RepairQ Alternative - Simpler & More Affordable",
    description: "RepairQ offers repair ticketing but at premium US pricing. AfterSales.pro delivers the same workflow management with WhatsApp integration at Indian pricing.",
    pricing: "$75-200/month (₹6,200-16,500)",
    ourPricing: "₹499-2,999/month",
    location: "USA-based",
    cons: ["High US pricing", "Complex interface", "No WhatsApp integration", "No INR billing", "Limited India presence"],
    keywords: "repairq alternative, repairq pricing, repairq vs, repair ticketing software, repairq competitor",
  },
  repaircms: {
    name: "RepairCMS",
    tagline: "RepairCMS Alternative with Modern Features",
    description: "RepairCMS is a basic repair management tool. AfterSales.pro offers a more modern, feature-rich experience with WhatsApp automation and multi-branch support.",
    pricing: "$29-99/month (₹2,400-8,200)",
    ourPricing: "₹499-2,999/month",
    location: "Global",
    cons: ["Basic features", "No WhatsApp", "Limited inventory", "No customer ledger", "Basic reporting"],
    keywords: "repaircms alternative, repaircms vs, repair cms software, repaircms pricing, repaircms competitor",
  },
  repairtrax: {
    name: "RepairTrax",
    tagline: "RepairTrax Alternative for Indian Repair Shops",
    description: "RepairTrax provides repair tracking but lacks Indian market features. AfterSales.pro is built for India with WhatsApp, INR pricing, and GST support.",
    pricing: "$49-149/month (₹4,000-12,300)",
    ourPricing: "₹499-2,999/month",
    location: "USA-based",
    cons: ["No WhatsApp integration", "USD only pricing", "No GST support", "Limited India features", "No Hindi support"],
    keywords: "repairtrax alternative, repairtrax vs, repair tracking software, repairtrax pricing",
  },
  orderry: {
    name: "Orderry",
    tagline: "Orderry Alternative - Better for Indian Market",
    description: "Orderry is a Ukrainian repair shop software with global reach. AfterSales.pro offers similar features with better WhatsApp integration and India-specific pricing.",
    pricing: "$39-199/month (₹3,200-16,500)",
    ourPricing: "₹499-2,999/month",
    location: "Ukraine-based",
    cons: ["No WhatsApp automation", "Limited India support", "Complex setup", "No INR billing option", "European focus"],
    keywords: "orderry alternative, orderry pricing, orderry vs, orderry competitor, repair shop software",
  },
  hellotracks: {
    name: "HelloTracks",
    tagline: "HelloTracks vs AfterSales.pro for Repair Businesses",
    description: "HelloTracks is primarily a field tracking solution. For dedicated repair shop management with job tracking, invoicing, and WhatsApp updates, choose AfterSales.pro.",
    pricing: "$10-25/user/month",
    ourPricing: "₹499-2,999/month (unlimited users)",
    location: "Global",
    cons: ["Not repair-focused", "Per-user pricing", "No repair workflows", "No inventory", "No job sheets"],
    keywords: "hellotracks alternative, repair shop tracking software, service business software, hellotracks vs",
  },
  servicem8: {
    name: "ServiceM8",
    tagline: "ServiceM8 Alternative for Repair Shops",
    description: "ServiceM8 is an Australian field service app. For dedicated repair shop management with Indian market features, AfterSales.pro is the smarter choice.",
    pricing: "A$29-349/month (₹1,600-19,000)",
    ourPricing: "₹499-2,999/month",
    location: "Australia-based",
    cons: ["Field service focus", "No repair workflows", "No WhatsApp", "AUD pricing", "Not repair-specific"],
    keywords: "servicem8 alternative, servicem8 vs, servicem8 pricing, field service software alternative",
  },
  housecallpro: {
    name: "Housecall Pro",
    tagline: "Housecall Pro Alternative for Repair Businesses",
    description: "Housecall Pro is designed for home services, not repair shops. AfterSales.pro offers purpose-built repair management features at better pricing.",
    pricing: "$59-199/month (₹4,900-16,500)",
    ourPricing: "₹499-2,999/month",
    location: "USA-based",
    cons: ["Home service focus", "No IMEI tracking", "No repair workflow", "Expensive", "Not repair-specific"],
    keywords: "housecall pro alternative, housecall pro vs, home service software alternative",
  },
};

const features = [
  { name: "Job Tracking & Management", us: true, them: true },
  { name: "WhatsApp Integration", us: true, them: false },
  { name: "Multi-Branch Support", us: true, them: "partial" },
  { name: "Customer Ledger & Credit", us: true, them: false },
  { name: "IMEI/Serial Tracking", us: true, them: "partial" },
  { name: "PDF Job Sheets", us: true, them: true },
  { name: "Inventory Management", us: true, them: true },
  { name: "Indian Payment Gateway", us: true, them: false },
  { name: "INR Pricing", us: true, them: false },
  { name: "Free Plan Available", us: true, them: false },
  { name: "Hindi Support", us: true, them: false },
  { name: "Buy/Sell Used Devices", us: true, them: false },
  { name: "GST Compliant Invoicing", us: true, them: false },
  { name: "Customer Self-Tracking", us: true, them: "partial" },
];

export default function ComparePage() {
  const navigate = useNavigate();
  const { competitor } = useParams();
  const data = competitors[competitor];

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Comparison not found</h1>
          <p className="text-slate-400 mb-6">Looking for a specific comparison? Check our alternatives:</p>
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {Object.keys(competitors).map(key => (
              <Button 
                key={key} 
                variant="outline" 
                size="sm"
                onClick={() => navigate(`/compare/${key}`)}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                vs {competitors[key].name}
              </Button>
            ))}
          </div>
          <Button onClick={() => navigate("/")} className="bg-blue-600 hover:bg-blue-700">Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>AfterSales.pro vs {data.name} - Best Alternative in 2024 | Compare Features & Pricing</title>
        <meta name="description" content={`Compare AfterSales.pro vs ${data.name}. See why 500+ repair shops chose AfterSales.pro as their ${data.name} alternative. Better pricing, WhatsApp integration, made for India & Global.`} />
        <meta name="keywords" content={data.keywords} />
        <link rel="canonical" href={`https://aftersales.pro/compare/${competitor}`} />
        <meta property="og:title" content={`AfterSales.pro vs ${data.name} - Feature Comparison 2024`} />
        <meta property="og:description" content={`Looking for a ${data.name} alternative? Compare features, pricing, and see why AfterSales.pro is the better choice for repair shops.`} />
        <meta property="og:url" content={`https://aftersales.pro/compare/${competitor}`} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": `AfterSales.pro vs ${data.name} - Complete Comparison`,
            "description": data.description,
            "author": { "@type": "Organization", "name": "AfterSales.pro" }
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">AfterSales.pro</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/")} className="text-slate-300 hover:text-white">
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
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-2 mb-6">
              <Globe className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 text-sm font-medium">Comparison Guide 2024</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              AfterSales.pro vs {data.name}
            </h1>
            <p className="text-xl text-slate-300 mb-4">{data.tagline}</p>
            <p className="text-slate-400 max-w-3xl mx-auto mb-8">{data.description}</p>
            
            {/* Pricing Comparison */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Card className="bg-slate-800/50 border-slate-700 px-6 py-4">
                <p className="text-slate-400 text-sm">{data.name} Pricing</p>
                <p className="text-xl font-bold text-red-400">{data.pricing}</p>
                <p className="text-xs text-slate-500">{data.location}</p>
              </Card>
              <Card className="bg-green-500/10 border-green-500/30 px-6 py-4">
                <p className="text-green-400 text-sm">AfterSales.pro Pricing</p>
                <p className="text-xl font-bold text-green-400">{data.ourPricing}</p>
                <p className="text-xs text-green-500">India-based, Global Support</p>
              </Card>
            </div>

            <Button onClick={() => navigate("/signup")} size="lg" className="bg-blue-600 hover:bg-blue-700">
              Try AfterSales.pro Free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="py-16 px-4 bg-slate-800/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-8">Feature Comparison</h2>
            <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-4 text-slate-300 font-medium">Feature</th>
                      <th className="text-center p-4 text-green-400 font-medium">AfterSales.pro</th>
                      <th className="text-center p-4 text-slate-400 font-medium">{data.name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {features.map((feature, index) => (
                      <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="p-4 text-white">{feature.name}</td>
                        <td className="p-4 text-center">
                          {feature.us ? (
                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-red-500 mx-auto" />
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {feature.them === true ? (
                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                          ) : feature.them === "partial" ? (
                            <span className="text-yellow-500 text-sm">Partial</span>
                          ) : (
                            <X className="w-5 h-5 text-red-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </section>

        {/* Why Switch */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-8">Why Switch to AfterSales.pro?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">{data.name} Limitations</h3>
                  <ul className="space-y-3">
                    {data.cons.map((con, index) => (
                      <li key={index} className="flex items-center gap-2 text-slate-300">
                        <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                        {con}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="bg-green-500/5 border-green-500/30">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">AfterSales.pro Benefits</h3>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2 text-slate-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Built for repair shops worldwide
                    </li>
                    <li className="flex items-center gap-2 text-slate-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      WhatsApp integration included
                    </li>
                    <li className="flex items-center gap-2 text-slate-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Affordable INR & global pricing
                    </li>
                    <li className="flex items-center gap-2 text-slate-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Free plan to get started
                    </li>
                    <li className="flex items-center gap-2 text-slate-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Customer ledger & credit management
                    </li>
                    <li className="flex items-center gap-2 text-slate-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Multi-currency support
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="py-16 px-4 bg-slate-800/30">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center mb-4">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-6 h-6 text-yellow-500 fill-yellow-500" />)}
            </div>
            <blockquote className="text-xl text-slate-300 italic mb-4">
              "We switched from {data.name} to AfterSales.pro and saved 60% on monthly costs. The WhatsApp integration alone has improved our customer satisfaction significantly."
            </blockquote>
            <p className="text-slate-400">— Repair Shop Owner, Mumbai</p>
          </div>
        </section>

        {/* Other Comparisons */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-8">Compare with Other Alternatives</h2>
            <div className="flex flex-wrap gap-2 justify-center">
              {Object.keys(competitors).filter(k => k !== competitor).slice(0, 8).map(key => (
                <Button 
                  key={key} 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/compare/${key}`)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  vs {competitors[key].name}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Make the Switch?</h2>
            <p className="text-slate-300 mb-8">
              Join 500+ repair shops who made the switch to AfterSales.pro. Start your free trial today - no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => navigate("/signup")} size="lg" className="bg-blue-600 hover:bg-blue-700">
                Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button onClick={() => navigate("/")} size="lg" variant="outline" className="border-slate-600 text-white hover:bg-slate-800">
                Learn More
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-4 border-t border-slate-700">
          <div className="max-w-7xl mx-auto text-center text-slate-400 text-sm">
            <p>© 2024 AfterSales.pro. All rights reserved.</p>
            <p className="mt-2">
              {data.name} is a trademark of its respective owner. This page is for comparison purposes only.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
