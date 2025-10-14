import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Sparkles, ShoppingBag, BarChart3, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export default function Home() {
  const stats = [
    { label: "Total Leads Processed", value: "0", change: "+0%" },
    { label: "Cleaned This Week", value: "0", change: "+0%" },
    { label: "Leads Sold", value: "0", change: "+0%" },
    { label: "Active Buyers", value: "0", change: "+0%" },
  ];

  const features = [
    {
      icon: Upload,
      title: "Easy Upload",
      description: "Import leads via CSV, Excel, or API integration with automatic field mapping.",
    },
    {
      icon: Sparkles,
      title: "Smart Cleaning",
      description: "Remove duplicates, validate emails, standardize formats, and enrich data automatically.",
    },
    {
      icon: ShoppingBag,
      title: "Lead Marketplace",
      description: "Package and sell cleaned leads to verified buyers with secure transactions.",
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Track cleaning performance, sales metrics, and buyer behavior in real-time.",
    },
    {
      icon: Shield,
      title: "GDPR Compliant",
      description: "Full compliance with GDPR, POPIA, and CCPA with audit trails and consent tracking.",
    },
    {
      icon: Zap,
      title: "Fast Processing",
      description: "Process thousands of leads in minutes with confidence scoring and error flagging.",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="rounded-2xl bg-gradient-hero p-8 text-primary-foreground shadow-elevated md:p-12">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Clean, Enrich, and Sell Quality Leads
          </h1>
          <p className="mt-4 text-lg opacity-90">
            Transform raw contact data into valuable, verified leads with our enterprise-grade cleaning engine.
            Perfect for contact centers looking to maximize lead quality and revenue.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button asChild size="lg" variant="secondary">
              <Link to="/upload">Upload Leads</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/marketplace">Browse Marketplace</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>{stat.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm font-medium text-accent">{stat.change}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Features */}
      <div>
        <h2 className="text-2xl font-bold">Platform Features</h2>
        <p className="mt-2 text-muted-foreground">
          Everything you need to manage, clean, and monetize your lead data
        </p>
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="shadow-card transition-shadow hover:shadow-elevated">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription className="mt-2">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with common tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload New Leads
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/cleanup">
              <Sparkles className="mr-2 h-4 w-4" />
              View Cleaning Queue
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/marketplace">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Browse Leads
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">
              <BarChart3 className="mr-2 h-4 w-4" />
              View Analytics
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
