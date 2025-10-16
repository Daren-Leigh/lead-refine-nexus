import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, AlertTriangle, Sparkles, Play, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Cleanup() {
  const [cleaningJobs, setCleaningJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCleaningJobs();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('cleaning_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cleaning_jobs'
        },
        () => {
          fetchCleaningJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCleaningJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('cleaning_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCleaningJobs(data || []);
    } catch (error: any) {
      console.error('Error fetching cleaning jobs:', error);
      toast({
        title: "Error",
        description: "Failed to load cleaning jobs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadCleanedData = async (jobId: string) => {
    try {
      const { data, error } = await supabase
        .from('clean_leads')
        .select('*')
        .eq('job_id', jobId);

      if (error) throw error;

      // Convert to CSV
      const headers = ['Name', 'Email', 'Phone', 'Company', 'Source', 'Status'];
      const csvRows = [
        headers.join(','),
        ...data.map((lead: any) => 
          [lead.name, lead.email, lead.phone, lead.company, lead.source, lead.status]
            .map(field => `"${field || ''}"`)
            .join(',')
        )
      ];
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cleaned_leads_${jobId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "Your cleaned leads are being downloaded",
      });
    } catch (error: any) {
      console.error('Error downloading data:', error);
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-accent text-accent-foreground">Completed</Badge>;
      case "processing":
        return <Badge className="bg-primary text-primary-foreground">Processing</Badge>;
      case "queued":
        return <Badge variant="outline">Queued</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return null;
    }
  };

  const calculateProgress = (job: any) => {
    if (job.total_records === 0) return 0;
    return Math.round((job.processed_records / job.total_records) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

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
        {cleaningJobs.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No cleaning jobs yet. Upload leads to get started.</p>
            </CardContent>
          </Card>
        ) : (
          cleaningJobs.map((job) => (
          <Card key={job.id} className="shadow-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{job.filename}</CardTitle>
                  <CardDescription className="mt-1">
                    {job.total_records.toLocaleString()} total records • Source: {job.source}
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
                    <span className="font-medium">{calculateProgress(job)}%</span>
                  </div>
                  <Progress value={calculateProgress(job)} className="h-2" />
                </div>
              )}

              {/* Error Message */}
              {job.status === "failed" && job.error_message && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{job.error_message}</p>
                </div>
              )}

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                    <span className="text-sm text-muted-foreground">Cleaned</span>
                  </div>
                  <div className="text-2xl font-bold">{job.valid_records.toLocaleString()}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-muted-foreground">Duplicates</span>
                  </div>
                  <div className="text-2xl font-bold">{job.duplicate_records}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="text-sm text-muted-foreground">Invalid</span>
                  </div>
                  <div className="text-2xl font-bold">{job.invalid_records}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Confidence</span>
                  </div>
                  <div className="text-2xl font-bold">{job.confidence_score}%</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {job.status === "completed" && (
                  <Button size="sm" onClick={() => downloadCleanedData(job.id)}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Cleaned Data
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          ))
        )}
      </div>

      {/* Summary Statistics */}
      {cleaningJobs.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Overall Statistics</CardTitle>
            <CardDescription>Summary of all cleaning operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Total Processed</span>
                <div className="text-2xl font-bold">
                  {cleaningJobs.reduce((sum, job) => sum + job.total_records, 0).toLocaleString()}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Valid Leads</span>
                <div className="text-2xl font-bold text-accent">
                  {cleaningJobs.reduce((sum, job) => sum + job.valid_records, 0).toLocaleString()}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Removed</span>
                <div className="text-2xl font-bold text-destructive">
                  {cleaningJobs.reduce((sum, job) => sum + job.invalid_records + job.duplicate_records + job.suppressed_records, 0).toLocaleString()}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Avg. Confidence</span>
                <div className="text-2xl font-bold">
                  {Math.round(cleaningJobs.reduce((sum, job) => sum + job.confidence_score, 0) / cleaningJobs.length)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
