-- Create permissive INSERT policy for consent_ledger (allows all inserts)
CREATE POLICY "Allow inserts"
ON public.consent_ledger
FOR INSERT
WITH CHECK (true);