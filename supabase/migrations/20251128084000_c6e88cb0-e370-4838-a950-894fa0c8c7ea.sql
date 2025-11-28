-- Create consent_status ENUM type
CREATE TYPE consent_status AS ENUM ('pending', 'consented', 'denied');

-- Create sender_type ENUM for conversations
CREATE TYPE sender_type AS ENUM ('client', 'system', 'agent');

-- Create leads table for consent management
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT,
  surname TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  consent_status consent_status NOT NULL DEFAULT 'pending',
  consent_timestamp TIMESTAMP WITH TIME ZONE NULL,
  latest_message TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(phone, user_id)
);

-- Create conversations table for message history
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sender sender_type NOT NULL,
  message TEXT NOT NULL,
  agent_used TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on leads table
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for leads
CREATE POLICY "Users can view their own leads"
  ON public.leads
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leads"
  ON public.leads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leads"
  ON public.leads
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable RLS on conversations table
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for conversations
CREATE POLICY "Users can view conversations for their leads"
  ON public.conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = conversations.lead_id
      AND leads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert conversations for their leads"
  ON public.conversations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = conversations.lead_id
      AND leads.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_leads_phone ON public.leads(phone);
CREATE INDEX idx_leads_consent_status ON public.leads(consent_status);
CREATE INDEX idx_leads_user_id ON public.leads(user_id);
CREATE INDEX idx_conversations_lead_id ON public.conversations(lead_id);
CREATE INDEX idx_conversations_created_at ON public.conversations(created_at DESC);