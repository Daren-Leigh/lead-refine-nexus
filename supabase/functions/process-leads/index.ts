import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { parse } from "https://deno.land/std@0.190.0/csv/parse.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadRecord {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
}

interface ProcessingStats {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  suppressed: number;
  expired: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const source = formData.get('source') as string || 'Manual Upload';

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing file: ${file.name} for user: ${user.id}`);

    // Create cleaning job
    const { data: job, error: jobError } = await supabase
      .from('cleaning_jobs')
      .insert({
        user_id: user.id,
        filename: file.name,
        source: source,
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('Error creating job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to create cleaning job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process file in background
    EdgeRuntime.waitUntil(processLeadsFile(supabase, file, job.id, user.id, source));

    return new Response(
      JSON.stringify({ 
        message: 'Processing started',
        jobId: job.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-leads function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processLeadsFile(
  supabase: any,
  file: File,
  jobId: string,
  userId: string,
  source: string
) {
  try {
    console.log(`Starting background processing for job ${jobId}`);
    
    const fileContent = await file.text();
    const parsedData = parse(fileContent, { skipFirstRow: true });
    const records = parsedData as Array<Record<string, string | undefined>>;

    const stats: ProcessingStats = {
      total: records.length,
      valid: 0,
      invalid: 0,
      duplicates: 0,
      suppressed: 0,
      expired: 0
    };

    // Update job with total records
    await supabase
      .from('cleaning_jobs')
      .update({ total_records: stats.total })
      .eq('id', jobId);

    // Fetch DNC list
    const { data: dncList } = await supabase
      .from('dnc_list')
      .select('email, phone');

    const dncEmails = new Set(dncList?.map((d: any) => d.email?.toLowerCase()) || []);
    const dncPhones = new Set(dncList?.map((d: any) => normalizePhone(d.phone)) || []);

    // Fetch existing record hashes for deduplication
    const { data: existingLeads } = await supabase
      .from('clean_leads')
      .select('record_hash');

    const existingHashes = new Set(existingLeads?.map((l: any) => l.record_hash) || []);
    const currentBatchHashes = new Set<string>();

    const rawLeads: any[] = [];
    const cleanLeads: any[] = [];

    for (const record of records) {
      const lead: LeadRecord = {
        name: record['name']?.trim() || record['Name']?.trim(),
        email: record['email']?.trim() || record['Email']?.trim(),
        phone: record['phone']?.trim() || record['Phone']?.trim(),
        company: record['company']?.trim() || record['Company']?.trim()
      };

      const recordHash = generateHash(lead.name || '', lead.email || '', lead.phone || '');

      // Store in raw_leads
      rawLeads.push({
        job_id: jobId,
        user_id: userId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        source: source,
        record_hash: recordHash
      });

      // Validate format
      const isEmailValid = validateEmail(lead.email || '');
      const isPhoneValid = validatePhone(lead.phone || '');

      if (!isEmailValid || !isPhoneValid) {
        stats.invalid++;
        continue;
      }

      // Check for duplicates (within batch and against existing)
      if (currentBatchHashes.has(recordHash) || existingHashes.has(recordHash)) {
        stats.duplicates++;
        continue;
      }

      currentBatchHashes.add(recordHash);

      // Check suppression list
      const normalizedEmail = lead.email?.toLowerCase();
      const normalizedPhone = normalizePhone(lead.phone || '');
      
      if (dncEmails.has(normalizedEmail!) || dncPhones.has(normalizedPhone)) {
        stats.suppressed++;
        continue;
      }

      // Check if expired (>30 days would be handled by scheduled job, but we can check source timestamp if available)
      const isExpired = false; // New records are not expired
      
      if (isExpired) {
        stats.expired++;
      }

      // Add to clean leads
      cleanLeads.push({
        job_id: jobId,
        user_id: userId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        source: source,
        record_hash: recordHash,
        is_expired: isExpired,
        status: 'valid'
      });

      stats.valid++;
    }

    // Batch insert raw leads
    if (rawLeads.length > 0) {
      const { error: rawError } = await supabase
        .from('raw_leads')
        .insert(rawLeads);
      
      if (rawError) {
        console.error('Error inserting raw leads:', rawError);
      }
    }

    // Batch insert clean leads
    if (cleanLeads.length > 0) {
      const { error: cleanError } = await supabase
        .from('clean_leads')
        .insert(cleanLeads);
      
      if (cleanError) {
        console.error('Error inserting clean leads:', cleanError);
      }
    }

    // Calculate confidence score
    const confidenceScore = stats.total > 0 
      ? Math.round((stats.valid / stats.total) * 100) 
      : 0;

    // Update job with final stats
    await supabase
      .from('cleaning_jobs')
      .update({
        status: 'completed',
        processed_records: stats.total,
        valid_records: stats.valid,
        invalid_records: stats.invalid,
        duplicate_records: stats.duplicates,
        suppressed_records: stats.suppressed,
        expired_records: stats.expired,
        confidence_score: confidenceScore,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`Completed processing job ${jobId}. Stats:`, stats);

  } catch (error) {
    console.error('Error processing leads file:', error);
    
    // Update job with error
    await supabase
      .from('cleaning_jobs')
      .update({
        status: 'failed',
        error_message: (error as Error).message || 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[\w\.-]+@[\w\.-]+\.\w+$/;
  return emailRegex.test(email);
}

function validatePhone(phone: string): boolean {
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function generateHash(name: string, email: string, phone: string): string {
  const input = `${name.toLowerCase()}${email.toLowerCase()}${normalizePhone(phone)}`;
  // Simple hash function (for production, consider using crypto)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

declare const EdgeRuntime: any;
