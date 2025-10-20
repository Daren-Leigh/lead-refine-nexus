import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<string>("Manual Upload");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(csv|xlsx|xls)$/i)) {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV or Excel file",
          variant: "destructive",
        });
        return;
      }

      if (selectedFile.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 50MB",
          variant: "destructive",
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV or Excel file to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to upload files",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('source', source);

      const { data, error } = await supabase.functions.invoke('process-leads', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Upload successful",
        description: `${file.name} is being processed. View progress in the Cleanup page.`,
      });
      
      setFile(null);
      navigate('/cleanup');
      
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to process file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const validationChecks = [
    { label: "File format supported", status: file?.name.match(/\.(csv|xlsx|xls)$/i) ? "pass" : "pending" },
    { label: "File size under 50MB", status: file && file.size < 50 * 1024 * 1024 ? "pass" : "pending" },
    { label: "Contains CSV/Excel data", status: file ? "pass" : "pending" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload Leads</h1>
        <p className="mt-2 text-muted-foreground">
          Import raw lead data from CSV or Excel files. The system will automatically validate, clean, and deduplicate your leads.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload Section */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>File Upload</CardTitle>
            <CardDescription>Select a CSV or Excel file containing your lead data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="source">Lead Source</Label>
              <Input
                id="source"
                type="text"
                placeholder="e.g., Vendor A, Partner B, Web Form"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                disabled={uploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Select CSV or Excel File</Label>
              <Input
                id="file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </div>

            {file && (
              <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 p-3">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <div className="flex-1 text-sm">
                  <div className="font-medium">{file.name}</div>
                  <div className="text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</div>
                </div>
              </div>
            )}

            <div className="rounded-lg border-2 border-dashed border-border bg-secondary/30 p-8 text-center">
              <UploadIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Drag and drop your file here, or click to browse
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Supports CSV, XLSX, XLS (max 50MB)</p>
            </div>

            <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
              {uploading ? "Uploading..." : "Upload and Process"}
            </Button>
          </CardContent>
        </Card>

        {/* Validation Section */}
        <div className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Pre-Upload Validation</CardTitle>
              <CardDescription>Automatic checks before processing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {validationChecks.map((check) => (
                <div key={check.label} className="flex items-center gap-3">
                  {check.status === "pass" ? (
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-sm">{check.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Expected CSV Columns</CardTitle>
              <CardDescription>Standard fields the system will process</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">name or Name</span>
                  <span className="font-medium">Required</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">email or Email</span>
                  <span className="font-medium">Required</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">phone or Phone</span>
                  <span className="font-medium">Required</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">company or Company</span>
                  <span className="text-muted-foreground">Optional</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5 shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Data Cleaning Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                <span>Email & phone validation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                <span>Duplicate detection</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                <span>DNC list suppression</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                <span>Source tagging & timestamps</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
