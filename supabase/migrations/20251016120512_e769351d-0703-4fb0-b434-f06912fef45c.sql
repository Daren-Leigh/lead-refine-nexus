-- Fix DNC list RLS policy to restrict access to user's own entries
DROP POLICY IF EXISTS "Users can view dnc list" ON public.dnc_list;

CREATE POLICY "Users can view own dnc entries" ON public.dnc_list
FOR SELECT 
USING (auth.uid() = added_by OR added_by IS NULL);

-- Add INSERT policy so users can add their own DNC entries
CREATE POLICY "Users can insert own dnc entries" ON public.dnc_list
FOR INSERT 
WITH CHECK (auth.uid() = added_by);