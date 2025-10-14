-- Create function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create enum for lead status
CREATE TYPE lead_status AS ENUM ('pending', 'valid', 'invalid', 'duplicate', 'suppressed', 'expired');

-- Create enum for cleaning job status
CREATE TYPE job_status AS ENUM ('queued', 'processing', 'completed', 'failed');

-- Create dnc_list table (Do Not Call / Opt-out suppression list)
CREATE TABLE public.dnc_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  phone text,
  reason text,
  added_at timestamptz DEFAULT now(),
  added_by uuid REFERENCES auth.users(id),
  CONSTRAINT dnc_list_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX idx_dnc_email ON public.dnc_list(email) WHERE email IS NOT NULL;
CREATE INDEX idx_dnc_phone ON public.dnc_list(phone) WHERE phone IS NOT NULL;

ALTER TABLE public.dnc_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view dnc list"
  ON public.dnc_list FOR SELECT
  TO authenticated
  USING (true);

-- Create raw_leads table (uncleaned uploads)
CREATE TABLE public.raw_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text,
  email text,
  phone text,
  company text,
  source text NOT NULL,
  record_hash text,
  ingestion_timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_raw_leads_job_id ON public.raw_leads(job_id);
CREATE INDEX idx_raw_leads_user_id ON public.raw_leads(user_id);
CREATE INDEX idx_raw_leads_hash ON public.raw_leads(record_hash);

ALTER TABLE public.raw_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own raw leads"
  ON public.raw_leads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own raw leads"
  ON public.raw_leads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create clean_leads table (Clean Candidate Pool)
CREATE TABLE public.clean_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  company text,
  source text NOT NULL,
  record_hash text NOT NULL UNIQUE,
  ingestion_timestamp timestamptz DEFAULT now(),
  is_expired boolean DEFAULT false,
  status lead_status DEFAULT 'valid',
  validation_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_clean_leads_job_id ON public.clean_leads(job_id);
CREATE INDEX idx_clean_leads_user_id ON public.clean_leads(user_id);
CREATE INDEX idx_clean_leads_email ON public.clean_leads(email);
CREATE INDEX idx_clean_leads_phone ON public.clean_leads(phone);
CREATE INDEX idx_clean_leads_hash ON public.clean_leads(record_hash);
CREATE INDEX idx_clean_leads_expired ON public.clean_leads(is_expired);

ALTER TABLE public.clean_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clean leads"
  ON public.clean_leads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clean leads"
  ON public.clean_leads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clean leads"
  ON public.clean_leads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create cleaning_jobs table (track cleaning operations)
CREATE TABLE public.cleaning_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  source text NOT NULL,
  status job_status DEFAULT 'queued',
  total_records int DEFAULT 0,
  processed_records int DEFAULT 0,
  valid_records int DEFAULT 0,
  invalid_records int DEFAULT 0,
  duplicate_records int DEFAULT 0,
  suppressed_records int DEFAULT 0,
  expired_records int DEFAULT 0,
  confidence_score int DEFAULT 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_cleaning_jobs_user_id ON public.cleaning_jobs(user_id);
CREATE INDEX idx_cleaning_jobs_status ON public.cleaning_jobs(status);

ALTER TABLE public.cleaning_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cleaning jobs"
  ON public.cleaning_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cleaning jobs"
  ON public.cleaning_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cleaning jobs"
  ON public.cleaning_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for updating clean_leads updated_at
CREATE TRIGGER set_clean_leads_updated_at
  BEFORE UPDATE ON public.clean_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger for updating cleaning_jobs updated_at
CREATE TRIGGER set_cleaning_jobs_updated_at
  BEFORE UPDATE ON public.cleaning_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to mark expired leads (>30 days)
CREATE OR REPLACE FUNCTION public.mark_expired_leads()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clean_leads
  SET is_expired = true,
      status = 'expired',
      updated_at = now()
  WHERE ingestion_timestamp < now() - interval '30 days'
    AND is_expired = false;
END;
$$;

-- Enable realtime for cleaning_jobs (so UI can update in real-time)
ALTER PUBLICATION supabase_realtime ADD TABLE public.cleaning_jobs;