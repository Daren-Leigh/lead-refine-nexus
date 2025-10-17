import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, Download, Upload, Edit2, Plus, Trash2, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DataReview() {
  const [rawLeads, setRawLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [filterText, setFilterText] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchRawLeads();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchRawLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('raw_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRawLeads(data || []);
    } catch (error: any) {
      console.error('Error fetching raw leads:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (lead: any) => {
    setEditingId(lead.id);
    setEditData({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
    });
  };

  const handleSave = async (id: string) => {
    try {
      const { error } = await supabase
        .from('raw_leads')
        .update(editData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Record updated successfully",
      });

      setEditingId(null);
      fetchRawLeads();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update record",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('raw_leads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Record deleted",
      });

      fetchRawLeads();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete record",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    const headers = ['Name', 'Email', 'Phone', 'Company', 'Source'];
    const csvRows = [
      headers.join(','),
      ...rawLeads.map((lead) => 
        [lead.name, lead.email, lead.phone, lead.company, lead.source]
          .map(field => `"${field || ''}"`)
          .join(',')
      )
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raw_data_${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export started",
      description: "Your data is being downloaded",
    });
  };

  const handleCleanAll = async () => {
    toast({
      title: "Cleaning started",
      description: "Processing your data...",
    });
    navigate('/cleanup');
  };

  const filteredLeads = rawLeads.filter(lead => 
    !filterText || 
    lead.name?.toLowerCase().includes(filterText.toLowerCase()) ||
    lead.email?.toLowerCase().includes(filterText.toLowerCase()) ||
    lead.phone?.includes(filterText) ||
    lead.company?.toLowerCase().includes(filterText.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Review Your Data</h1>
          <p className="mt-2 text-muted-foreground">
            Review and edit your uploaded data before cleaning. Fix names, remove spaces, or delete invalid entries.
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {filteredLeads.length} records
        </Badge>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by name, email, phone..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate('/upload')}>
          <Upload className="mr-2 h-4 w-4" />
          Import More
        </Button>
        <Button variant="outline" onClick={handleExport} disabled={rawLeads.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        <Button onClick={handleCleanAll} disabled={rawLeads.length === 0}>
          <Play className="mr-2 h-4 w-4" />
          Clean All Data
        </Button>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Records</CardTitle>
          <CardDescription>
            Click the edit icon to modify records, or delete invalid entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {rawLeads.length === 0 
                  ? "No data uploaded yet. Upload a CSV or Excel file to get started." 
                  : "No records match your filter."}
              </p>
              {rawLeads.length === 0 && (
                <Button className="mt-4" onClick={() => navigate('/upload')}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Data
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        {editingId === lead.id ? (
                          <Input
                            value={editData.name}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          lead.name || '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === lead.id ? (
                          <Input
                            value={editData.email}
                            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          lead.email || '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === lead.id ? (
                          <Input
                            value={editData.phone}
                            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          lead.phone || '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === lead.id ? (
                          <Input
                            value={editData.company}
                            onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          lead.company || '-'
                        )}
                      </TableCell>
                      <TableCell>{lead.source}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {editingId === lead.id ? (
                            <>
                              <Button size="sm" onClick={() => handleSave(lead.id)}>
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(lead)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(lead.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Cleaning Process Info */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-base">How Data Cleaning Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="font-semibold min-w-[140px]">1. Validation:</span>
            <span className="text-muted-foreground">Checks email formats and validates phone numbers</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold min-w-[140px]">2. Normalization:</span>
            <span className="text-muted-foreground">Standardizes phone numbers to consistent format</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold min-w-[140px]">3. Deduplication:</span>
            <span className="text-muted-foreground">Removes duplicate entries using unique hashes</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold min-w-[140px]">4. DNC Check:</span>
            <span className="text-muted-foreground">Suppresses numbers on Do-Not-Call lists</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold min-w-[140px]">5. Quality Score:</span>
            <span className="text-muted-foreground">Assigns confidence score based on data completeness</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}