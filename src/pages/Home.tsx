import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Data Cleaning Tool
          </h1>
          <p className="text-lg text-muted-foreground">
            Upload your data and let us clean it for you. Simple and easy to use.
          </p>
        </div>
        
        <div className="flex justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link to="/upload">
              <Upload className="h-5 w-5" />
              Upload Your Data
            </Link>
          </Button>
        </div>

        <div className="rounded-lg border bg-muted/50 p-6 text-left">
          <h3 className="font-semibold mb-2">Supported Formats:</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• CSV files (.csv)</li>
            <li>• Excel files (.xlsx)</li>
            <li>• Text files (.txt)</li>
            <li>• Word documents (.docx)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
