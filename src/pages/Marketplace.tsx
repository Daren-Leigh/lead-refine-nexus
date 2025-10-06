import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Download, Eye, ShoppingCart, Star } from "lucide-react";

export default function Marketplace() {
  const leadPackages = [
    {
      id: 1,
      title: "Healthcare Professionals - USA",
      category: "Healthcare",
      region: "North America",
      quality: "Premium",
      records: 5000,
      price: 2500,
      confidence: 98,
      rating: 4.8,
      sales: 127,
    },
    {
      id: 2,
      title: "Tech Startups - Europe",
      category: "Technology",
      region: "Europe",
      quality: "Premium",
      records: 3200,
      price: 1920,
      confidence: 96,
      rating: 4.9,
      sales: 89,
    },
    {
      id: 3,
      title: "Real Estate Agents - California",
      category: "Real Estate",
      region: "North America",
      quality: "Standard",
      records: 2500,
      price: 1000,
      confidence: 94,
      rating: 4.6,
      sales: 156,
    },
    {
      id: 4,
      title: "E-commerce Retailers - Global",
      category: "E-commerce",
      region: "Global",
      quality: "Premium",
      records: 8000,
      price: 4800,
      confidence: 97,
      rating: 4.7,
      sales: 203,
    },
    {
      id: 5,
      title: "Financial Services - Asia Pacific",
      category: "Finance",
      region: "Asia Pacific",
      quality: "Standard",
      records: 4200,
      price: 1890,
      confidence: 93,
      rating: 4.5,
      sales: 94,
    },
    {
      id: 6,
      title: "Legal Professionals - UK",
      category: "Legal",
      region: "Europe",
      quality: "Premium",
      records: 1800,
      price: 1440,
      confidence: 99,
      rating: 4.9,
      sales: 67,
    },
  ];

  const getQualityColor = (quality: string) => {
    return quality === "Premium" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lead Marketplace</h1>
        <p className="mt-2 text-muted-foreground">
          Browse and purchase verified, cleaned lead packages. Preview samples before buying.
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by category, region, or industry..." className="pl-10" />
            </div>
            <Button variant="outline">Filter</Button>
          </div>
        </CardContent>
      </Card>

      {/* Lead Packages Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {leadPackages.map((pkg) => (
          <Card key={pkg.id} className="shadow-card transition-shadow hover:shadow-elevated">
            <CardHeader>
              <div className="mb-2 flex items-start justify-between">
                <Badge className={getQualityColor(pkg.quality)}>{pkg.quality}</Badge>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{pkg.rating}</span>
                </div>
              </div>
              <CardTitle className="text-lg">{pkg.title}</CardTitle>
              <CardDescription className="mt-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Category:</span>
                    <span className="font-medium text-foreground">{pkg.category}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Region:</span>
                    <span className="font-medium text-foreground">{pkg.region}</span>
                  </div>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Records</span>
                  <span className="font-semibold">{pkg.records.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-semibold text-accent">{pkg.confidence}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Sales</span>
                  <span className="font-semibold">{pkg.sales}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="mb-3 flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Price</span>
                  <div>
                    <span className="text-2xl font-bold">${pkg.price}</span>
                    <span className="ml-1 text-sm text-muted-foreground">
                      (${(pkg.price / pkg.records).toFixed(2)}/lead)
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                  <Button size="sm" className="flex-1">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Purchase
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Secure Downloads
          </CardTitle>
          <CardDescription>
            All purchases include encrypted download links, compliance documentation, and 30-day support.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
