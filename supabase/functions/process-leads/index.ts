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
    
    // Clear all existing data for this user before processing new upload
    console.log(`Clearing existing data for user ${userId}`);
    await supabase.from('clean_leads').delete().eq('user_id', userId);
    await supabase.from('raw_leads').delete().eq('user_id', userId);
    await supabase.from('cleaning_jobs').delete().eq('user_id', userId);
    
    const fileContent = await file.text();
    
    // Validate file is not empty
    if (!fileContent || fileContent.trim().length === 0) {
      throw new Error('CSV file is empty');
    }

    // Parse CSV with error handling
    let parsedData;
    try {
      parsedData = parse(fileContent, { skipFirstRow: true });
    } catch (parseError) {
      console.error('CSV parsing error:', parseError);
      throw new Error('Failed to parse CSV file. Please ensure the file is properly formatted.');
    }

    const records = parsedData as Array<Record<string, string | undefined>>;
    
    // Validate we have records
    if (!records || records.length === 0) {
      throw new Error('No data found in CSV file. Please ensure the file contains data rows.');
    }
    
    // Validate required columns exist
    const firstRecord = records[0];
    const hasName = 'name' in firstRecord || 'Name' in firstRecord;
    const hasEmail = 'email' in firstRecord || 'Email' in firstRecord;
    const hasPhone = 'phone' in firstRecord || 'Phone' in firstRecord;
    
    if (!hasName && !hasEmail && !hasPhone) {
      throw new Error('CSV must contain at least one of the following columns: name/Name, email/Email, phone/Phone');
    }
    
    console.log(`Parsed ${records.length} records from CSV`);

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
      // Skip completely empty rows
      const isEmpty = Object.values(record).every(val => !val || val.trim() === '');
      if (isEmpty) {
        continue;
      }

      const lead: LeadRecord = {
        name: record['name']?.trim() || record['Name']?.trim(),
        email: record['email']?.trim() || record['Email']?.trim(),
        phone: record['phone']?.trim() || record['Phone']?.trim(),
        company: record['company']?.trim() || record['Company']?.trim()
      };

      // Skip if missing all required fields
      if (!lead.name && !lead.email && !lead.phone) {
        stats.invalid++;
        continue;
      }

      const recordHash = await generateHash(lead.name || '', lead.email || '', lead.phone || '');

      // Store in raw_leads (with sanitization)
      rawLeads.push({
        job_id: jobId,
        user_id: userId,
        name: sanitizeCSVValue(lead.name),
        email: sanitizeCSVValue(lead.email),
        phone: sanitizeCSVValue(lead.phone),
        company: sanitizeCSVValue(lead.company),
        source: source,
        record_hash: recordHash
      });

      // Validate format (at least one must be valid)
      const isEmailValid = lead.email ? validateEmail(lead.email) : false;
      const isPhoneValid = lead.phone ? validatePhone(lead.phone) : false;
      const hasValidData = (lead.name && (isEmailValid || isPhoneValid));

      if (!hasValidData && !isEmailValid && !isPhoneValid) {
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

      // Add to clean leads (with sanitization)
      cleanLeads.push({
        job_id: jobId,
        user_id: userId,
        name: sanitizeCSVValue(lead.name),
        email: sanitizeCSVValue(lead.email),
        phone: sanitizeCSVValue(lead.phone),
        company: sanitizeCSVValue(lead.company),
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

      // Create lead records for consent management
      // Only create leads for records with phone numbers
      const leadsForConsent = cleanLeads
        .filter(lead => lead.phone)
        .map(lead => {
          const nameParts = lead.name?.split(' ') || [];
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          return {
            user_id: userId,
            name: firstName,
            surname: lastName || null,
            phone: lead.phone,
            email: lead.email || null,
            consent_status: 'pending' as const
          };
        });

      if (leadsForConsent.length > 0) {
        // Insert leads with upsert to handle duplicates
        const { data: insertedLeads, error: leadsError } = await supabase
          .from('leads')
          .upsert(leadsForConsent, { 
            onConflict: 'phone,user_id',
            ignoreDuplicates: false 
          })
          .select();

        if (leadsError) {
          console.error('Error creating leads for consent:', leadsError);
        } else if (insertedLeads) {
          console.log(`Created ${insertedLeads.length} leads for consent management`);
          
          // Trigger consent requests for each lead
          // Note: We're doing this async without blocking the main flow
          for (const lead of insertedLeads) {
            try {
              // Call send-consent-request function
              fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-consent-request`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                },
                body: JSON.stringify({
                  phone: lead.phone,
                  leadId: lead.id,
                  name: lead.name
                })
              }).catch(err => console.error('Error sending consent request:', err));
            } catch (error) {
              console.error('Error triggering consent request for lead:', lead.id, error);
            }
          }
        }
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
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during processing';
    
    // Update job with error
    await supabase
      .from('cleaning_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

// Helper function to sanitize CSV values against formula injection
function sanitizeCSVValue(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  // Neutralize dangerous formula prefixes by prepending single quote
  if (trimmed.match(/^[=+\-@\t\r]/)) {
    return "'" + trimmed;
  }
  return value;
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

async function generateHash(name: string, email: string, phone: string): Promise<string> {
  const input = `${name.toLowerCase()}${email.toLowerCase()}${normalizePhone(phone)}`;
  
  // Use SHA-256 for collision-resistant hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

declare const EdgeRuntime: any;
