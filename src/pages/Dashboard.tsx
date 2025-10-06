import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, TrendingUp, Users, DollarSign, Database } from "lucide-react";

export default function Dashboard() {
  const agentMetrics = [
    { label: "Total Leads Cleaned", value: "12,847", icon: Database, color: "text-primary" },
    { label: "Invalid Emails Removed", value: "2,341", icon: TrendingUp, color: "text-destructive" },
    { label: "Duplicates Found", value: "1,523", icon: Users, color: "text-warning" },
    { label: "Revenue Generated", value: "$45,280", icon: DollarSign, color: "text-accent" },
  ];

  const recentActivity = [
    { action: "Cleaned leads from contacts_batch_1.csv", count: 1425, time: "2 hours ago" },
    { action: "Removed duplicates from march_export.xlsx", count: 245, time: "4 hours ago" },
    { action: "Validated emails in new_contacts.csv", count: 892, time: "6 hours ago" },
    { action: "Sold Healthcare Professionals package", count: 5000, time: "1 day ago" },
    { action: "Enriched missing fields in tech_leads.csv", count: 123, time: "1 day ago" },
  ];

  const topCategories = [
    { name: "Healthcare", leads: 5200, revenue: "$13,000" },
    { name: "Technology", leads: 4100, revenue: "$12,300" },
    { name: "Real Estate", leads: 3800, revenue: "$9,500" },
    { name: "E-commerce", leads: 3200, revenue: "$8,000" },
    { name: "Finance", leads: 2100, revenue: "$6,300" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Track cleaning performance, sales metrics, and buyer behavior
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {agentMetrics.map((metric) => (
          <Card key={metric.label} className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>{metric.label}</CardDescription>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs for Different Views */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cleaning">Cleaning Stats</TabsTrigger>
          <TabsTrigger value="sales">Sales Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Chart Placeholder */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Leads Processed Over Time</CardTitle>
              <CardDescription>Daily cleaning and validation activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-[300px] items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/30">
                <div className="text-center">
                  <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Chart visualization would appear here</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest cleaning and sales operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((item, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                    <div>
                      <div className="font-medium">{item.action}</div>
                      <div className="text-sm text-muted-foreground">{item.time}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{item.count.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">records</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cleaning" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Cleaning Efficiency</CardTitle>
                <CardDescription>Success rates by operation type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Email Validation</span>
                      <span className="font-medium">98.5%</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary">
                      <div className="h-2 rounded-full bg-accent" style={{ width: "98.5%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Phone Standardization</span>
                      <span className="font-medium">96.2%</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary">
                      <div className="h-2 rounded-full bg-accent" style={{ width: "96.2%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Duplicate Detection</span>
                      <span className="font-medium">99.1%</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary">
                      <div className="h-2 rounded-full bg-accent" style={{ width: "99.1%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Field Enrichment</span>
                      <span className="font-medium">87.3%</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary">
                      <div className="h-2 rounded-full bg-accent" style={{ width: "87.3%" }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Quality Distribution</CardTitle>
                <CardDescription>Confidence scores of cleaned leads</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-accent/10 p-3">
                    <span className="font-medium">High (95-100%)</span>
                    <span className="text-xl font-bold">8,234</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-primary/10 p-3">
                    <span className="font-medium">Medium (85-94%)</span>
                    <span className="text-xl font-bold">3,456</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-warning/10 p-3">
                    <span className="font-medium">Low (75-84%)</span>
                    <span className="text-xl font-bold">1,157</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Top Performing Categories</CardTitle>
              <CardDescription>Most popular lead packages by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topCategories.map((category, index) => (
                  <div key={category.name} className="flex items-center gap-4 rounded-lg border border-border bg-secondary/30 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{category.name}</div>
                      <div className="text-sm text-muted-foreground">{category.leads.toLocaleString()} leads sold</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">{category.revenue}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
