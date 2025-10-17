import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [truecallerApiKey, setTruecallerApiKey] = useState("");
  const { toast } = useToast();

  const handleSaveApiKey = () => {
    if (!truecallerApiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive",
      });
      return;
    }
    
    // Save to localStorage for now
    localStorage.setItem("truecaller_api_key", truecallerApiKey);
    
    toast({
      title: "Success",
      description: "Truecaller API key saved successfully",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Configure your external integrations
        </p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Truecaller API Integration
          </CardTitle>
          <CardDescription>
            Connect your Truecaller API to validate phone numbers in real-time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="truecallerKey">Truecaller API Key</Label>
            <Input
              id="truecallerKey"
              type="password"
              placeholder="Enter your Truecaller API key"
              value={truecallerApiKey}
              onChange={(e) => setTruecallerApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your API key will be stored securely and used to validate phone numbers during data cleaning.
            </p>
          </div>
          <Button onClick={handleSaveApiKey}>Save API Key</Button>
        </CardContent>
      </Card>

      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base">About Truecaller Integration</CardTitle>
          <CardDescription>
            Truecaller helps verify phone numbers and identify invalid or spam numbers in your dataset.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Validates phone number formats</p>
          <p>• Identifies carrier information</p>
          <p>• Detects spam or invalid numbers</p>
          <p>• Improves data quality automatically</p>
        </CardContent>
      </Card>
    </div>
  );
}
