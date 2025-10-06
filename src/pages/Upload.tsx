import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload as UploadIcon, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV or Excel file to upload.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    // Simulate upload process
    setTimeout(() => {
      setUploading(false);
      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded and queued for cleaning.`,
      });
      setFile(null);
    }, 2000);
  };

  const validationChecks = [
    { label: "File format supported", status: file?.name.match(/\.(csv|xlsx|xls)$/i) ? "pass" : "pending" },
    { label: "File size under 50MB", status: file && file.size < 50 * 1024 * 1024 ? "pass" : "pending" },
    { label: "Contains required fields", status: "pending" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload Leads</h1>
        <p className="mt-2 text-muted-foreground">
          Import raw lead data from CSV or Excel files. The system will automatically validate and map fields.
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
              <Label htmlFor="file-upload">Choose File</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="flex-1"
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
            </div>

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
              <CardTitle>Expected Fields</CardTitle>
              <CardDescription>Standard fields we'll look for</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">Required</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">Required</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium">Required</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address</span>
                  <span className="text-muted-foreground">Optional</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company</span>
                  <span className="text-muted-foreground">Optional</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5 shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Upload Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Files uploaded today</span>
                <span className="font-semibold">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Leads processed today</span>
                <span className="font-semibold">1,234</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Success rate</span>
                <span className="font-semibold text-accent">98.5%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
