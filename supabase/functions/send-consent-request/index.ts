import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
      throw new Error('Missing Twilio configuration');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { phone, leadId, name } = await req.json();

    if (!phone || !leadId) {
      return new Response(JSON.stringify({ error: 'Phone and leadId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Sending consent request to:', phone, 'for lead:', leadId);

    // Create or update lead record
    const { data: existingLead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (!existingLead) {
      return new Response(JSON.stringify({ error: 'Lead not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Send WhatsApp message via Twilio
    const message = `Hi ${name || 'there'}! Welcome to LeadFlow. To proceed with processing your data, please reply YES to consent to our data processing. Reply NO to deny. Thank you!`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    const params = new URLSearchParams();
    params.append('From', `whatsapp:${TWILIO_WHATSAPP_NUMBER}`);
    params.append('To', `whatsapp:${phone}`);
    params.append('Body', message);

    const twilioResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!twilioResponse.ok) {
      const error = await twilioResponse.text();
      console.error('Twilio API error:', error);
      throw new Error('Failed to send WhatsApp message');
    }

    const twilioData = await twilioResponse.json();
    console.log('WhatsApp consent request sent:', twilioData.sid);

    // Log the system message in conversations
    await supabase
      .from('conversations')
      .insert({
        lead_id: leadId,
        sender: 'system',
        message: message,
        agent_used: null
      });

    return new Response(JSON.stringify({ 
      success: true, 
      messageSid: twilioData.sid 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in send-consent-request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});