-- Create enum for ledger consent status
CREATE TYPE public.ledger_consent_status AS ENUM ('pending', 'opted_in', 'opted_out', 'no_response', 'failed');

-- Create consent_ledger table
CREATE TABLE public.consent_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    phone_number TEXT NOT NULL,
    consent_status public.ledger_consent_status DEFAULT 'pending',
    consent_whatsapp BOOLEAN DEFAULT false,
    consent_prompted_at TIMESTAMP WITH TIME ZONE,
    consent_responded_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_consent_ledger_lead_id ON public.consent_ledger(lead_id);
CREATE INDEX idx_consent_ledger_phone ON public.consent_ledger(phone_number);
CREATE INDEX idx_consent_ledger_status ON public.consent_ledger(consent_status);

-- Enable RLS
ALTER TABLE public.consent_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own consent ledger entries"
ON public.consent_ledger
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consent ledger entries"
ON public.consent_ledger
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consent ledger entries"
ON public.consent_ledger
FOR UPDATE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_consent_ledger_updated_at
BEFORE UPDATE ON public.consent_ledger
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();