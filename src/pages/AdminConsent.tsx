import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Phone, Mail, User, Calendar, Send } from "lucide-react";

interface Lead {
  id: string;
  name: string | null;
  surname: string | null;
  phone: string;
  email: string | null;
  consent_status: 'pending' | 'consented' | 'denied';
  consent_timestamp: string | null;
  latest_message: string | null;
  created_at: string;
}

interface Conversation {
  id: string;
  sender: 'client' | 'system' | 'agent';
  message: string;
  agent_used: string | null;
  created_at: string;
}

export default function AdminConsent() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    if (selectedLead) {
      fetchConversations(selectedLead.id);
    }
  }, [selectedLead]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading leads",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async (leadId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setConversations(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading conversations",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resendConsentRequest = async (lead: Lead) => {
    try {
      setSending(true);
      const { error } = await supabase.functions.invoke('send-consent-request', {
        body: {
          phone: lead.phone,
          leadId: lead.id,
          name: lead.name || lead.surname || 'there'
        }
      });

      if (error) throw error;

      toast({
        title: "Consent request sent",
        description: `WhatsApp message sent to ${lead.phone}`,
      });

      // Refresh conversations
      if (selectedLead?.id === lead.id) {
        await fetchConversations(lead.id);
      }
    } catch (error: any) {
      toast({
        title: "Error sending consent request",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getConsentBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending: { variant: "outline", label: "Pending" },
      consented: { variant: "default", label: "Consented" },
      denied: { variant: "destructive", label: "Denied" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Loading leads...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Consent Management</h1>
        <p className="text-muted-foreground">
          Manage WhatsApp consent requests and view conversation history
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leads List */}
        <Card>
          <CardHeader>
            <CardTitle>Leads ({leads.length})</CardTitle>
            <CardDescription>
              Click on a lead to view conversation history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {leads.map((lead) => (
                  <Card
                    key={lead.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedLead?.id === lead.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {lead.name} {lead.surname}
                          </span>
                        </div>
                        {getConsentBadge(lead.consent_status)}
                      </div>

                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </div>
                        {lead.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {lead.email}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {new Date(lead.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {lead.consent_status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3 w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            resendConsentRequest(lead);
                          }}
                          disabled={sending}
                        >
                          <Send className="h-3 w-3 mr-2" />
                          Resend Consent Request
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Conversation History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversation History
            </CardTitle>
            <CardDescription>
              {selectedLead
                ? `${selectedLead.name} ${selectedLead.surname} - ${selectedLead.phone}`
                : 'Select a lead to view conversations'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedLead ? (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {conversations.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No conversations yet
                    </p>
                  ) : (
                    conversations.map((conv, index) => (
                      <div key={conv.id}>
                        <div
                          className={`rounded-lg p-4 ${
                            conv.sender === 'client'
                              ? 'bg-primary/10 ml-8'
                              : conv.sender === 'agent'
                              ? 'bg-secondary mr-8'
                              : 'bg-muted mx-4'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-xs">
                              {conv.sender === 'client'
                                ? 'Client'
                                : conv.sender === 'agent'
                                ? conv.agent_used || 'Agent'
                                : 'System'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(conv.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{conv.message}</p>
                        </div>
                        {index < conversations.length - 1 && (
                          <Separator className="my-2" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[600px] flex items-center justify-center">
                <p className="text-muted-foreground">
                  Select a lead from the list to view their conversation history
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}