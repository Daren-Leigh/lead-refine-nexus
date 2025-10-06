import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, AlertTriangle, Sparkles, Play } from "lucide-react";

export default function Cleanup() {
  const cleaningJobs = [
    {
      id: 1,
      filename: "contacts_batch_1.csv",
      status: "completed",
      progress: 100,
      totalRecords: 1500,
      cleaned: 1425,
      duplicates: 45,
      invalid: 30,
      confidence: 95,
    },
    {
      id: 2,
      filename: "leads_export_march.xlsx",
      status: "processing",
      progress: 67,
      totalRecords: 2800,
      cleaned: 1876,
      duplicates: 0,
      invalid: 0,
      confidence: 0,
    },
    {
      id: 3,
      filename: "new_contacts.csv",
      status: "queued",
      progress: 0,
      totalRecords: 950,
      cleaned: 0,
      duplicates: 0,
      invalid: 0,
      confidence: 0,
    },
  ];

  const cleaningActions = [
    { action: "Remove duplicate entries", count: 245 },
    { action: "Standardize phone numbers (E.164)", count: 892 },
    { action: "Validate email addresses", count: 1432 },
    { action: "Fix capitalization issues", count: 567 },
    { action: "Enrich missing fields", count: 123 },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-accent text-accent-foreground">Completed</Badge>;
      case "processing":
        return <Badge className="bg-primary text-primary-foreground">Processing</Badge>;
      case "queued":
        return <Badge variant="outline">Queued</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lead Cleanup Engine</h1>
        <p className="mt-2 text-muted-foreground">
          Monitor and manage data cleaning processes. Review confidence scores and flagged records.
        </p>
      </div>

      {/* Cleaning Jobs */}
      <div className="space-y-4">
        {cleaningJobs.map((job) => (
          <Card key={job.id} className="shadow-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{job.filename}</CardTitle>
                  <CardDescription className="mt-1">
                    {job.totalRecords.toLocaleString()} total records
                  </CardDescription>
                </div>
                {getStatusBadge(job.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              {job.status === "processing" && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cleaning progress</span>
                    <span className="font-medium">{job.progress}%</span>
                  </div>
                  <Progress value={job.progress} className="h-2" />
                </div>
              )}

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                    <span className="text-sm text-muted-foreground">Cleaned</span>
                  </div>
                  <div className="text-2xl font-bold">{job.cleaned.toLocaleString()}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-muted-foreground">Duplicates</span>
                  </div>
                  <div className="text-2xl font-bold">{job.duplicates}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="text-sm text-muted-foreground">Invalid</span>
                  </div>
                  <div className="text-2xl font-bold">{job.invalid}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Confidence</span>
                  </div>
                  <div className="text-2xl font-bold">{job.confidence}%</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {job.status === "completed" && (
                  <>
                    <Button variant="outline" size="sm">
                      View Report
                    </Button>
                    <Button size="sm">Export Cleaned Data</Button>
                  </>
                )}
                {job.status === "queued" && (
                  <Button size="sm">
                    <Play className="mr-2 h-4 w-4" />
                    Start Processing
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cleaning Actions Summary */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Recent Cleaning Actions</CardTitle>
          <CardDescription>Summary of data cleaning operations performed today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cleaningActions.map((item) => (
              <div key={item.action} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                <span className="text-sm font-medium">{item.action}</span>
                <Badge variant="secondary">{item.count} records</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
