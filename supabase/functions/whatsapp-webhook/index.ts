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
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TWILIO_AUTH_TOKEN || !LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse incoming Twilio webhook data (form-encoded)
    const formData = await req.formData();
    const from = formData.get('From') as string; // WhatsApp number (e.g., whatsapp:+27...)
    const body = formData.get('Body') as string; // Message text
    
    console.log('Received WhatsApp message from:', from, 'body:', body);

    // Extract phone number (remove 'whatsapp:' prefix)
    const phone = from?.replace('whatsapp:', '') || '';
    
    if (!phone || !body) {
      return new Response('Invalid request', { status: 400, headers: corsHeaders });
    }

    // Look up the lead in the database
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('phone', phone)
      .single();

    if (leadError && leadError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error looking up lead:', leadError);
      return new Response('Database error', { status: 500, headers: corsHeaders });
    }

    if (!lead) {
      console.log('No lead found for phone:', phone);
      return new Response('Lead not found', { status: 404, headers: corsHeaders });
    }

    // Handle consent response
    const normalizedBody = body.trim().toUpperCase();
    
    if (normalizedBody === 'YES') {
      // Update consent status to consented
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          consent_status: 'consented',
          consent_timestamp: new Date().toISOString(),
          latest_message: body
        })
        .eq('id', lead.id);

      if (updateError) {
        console.error('Error updating consent:', updateError);
      }

      // Log conversation
      await supabase
        .from('conversations')
        .insert({
          lead_id: lead.id,
          sender: 'client',
          message: body,
          agent_used: null
        });

      // Send confirmation via Twilio
      await sendWhatsAppMessage(phone, 'Thank you for your consent! Your data will be processed now.');
      
      return new Response('Consent granted', { headers: corsHeaders });
      
    } else if (normalizedBody === 'NO') {
      // Update consent status to denied
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          consent_status: 'denied',
          latest_message: body
        })
        .eq('id', lead.id);

      if (updateError) {
        console.error('Error updating denial:', updateError);
      }

      // Log conversation
      await supabase
        .from('conversations')
        .insert({
          lead_id: lead.id,
          sender: 'client',
          message: body,
          agent_used: null
        });

      await sendWhatsAppMessage(phone, 'Understood. Your data will not be processed. Thank you.');
      
      return new Response('Consent denied', { headers: corsHeaders });
    }

    // Check consent status before routing to agents
    if (lead.consent_status !== 'consented') {
      const response = "We need your YES consent before continuing. Please reply YES to consent to our data processing, or NO to deny.";
      
      await supabase
        .from('conversations')
        .insert({
          lead_id: lead.id,
          sender: 'client',
          message: body,
          agent_used: null
        });

      await sendWhatsAppMessage(phone, response);
      
      return new Response('Consent required', { headers: corsHeaders });
    }

    // Route to multi-agent system
    const agentResponse = await routeToAgent(body, lead, supabase);
    
    // Log conversation with agent
    await supabase
      .from('conversations')
      .insert([
        {
          lead_id: lead.id,
          sender: 'client',
          message: body,
          agent_used: null
        },
        {
          lead_id: lead.id,
          sender: 'agent',
          message: agentResponse.message,
          agent_used: agentResponse.agent
        }
      ]);

    // Update latest message
    await supabase
      .from('leads')
      .update({ latest_message: body })
      .eq('id', lead.id);

    // Send response via Twilio
    await sendWhatsAppMessage(phone, agentResponse.message);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function sendWhatsAppMessage(to: string, message: string) {
  const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
  const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
  const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  
  const params = new URLSearchParams();
  params.append('From', `whatsapp:${TWILIO_WHATSAPP_NUMBER}`);
  params.append('To', `whatsapp:${to}`);
  params.append('Body', message);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Twilio API error:', error);
    throw new Error('Failed to send WhatsApp message');
  }

  console.log('WhatsApp message sent to:', to);
  return await response.json();
}

async function routeToAgent(message: string, lead: any, supabase: any) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  // First, use Triage Agent to identify intent
  const triagePrompt = `You are a triage agent. Analyze this message and determine the user's intent. 
Possible intents: update_number, check_status, missing_data, general_support, follow_up.
Message: "${message}"
Lead info: Name: ${lead.name || 'Unknown'}, Email: ${lead.email || 'None'}, Phone: ${lead.phone}
Respond with just the intent name.`;

  const triageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a triage agent that identifies user intent.' },
        { role: 'user', content: triagePrompt }
      ],
      temperature: 0.3,
    }),
  });

  if (!triageResponse.ok) {
    console.error('Triage agent error:', await triageResponse.text());
    throw new Error('Failed to determine intent');
  }

  const triageData = await triageResponse.json();
  const intent = triageData.choices[0].message.content.trim().toLowerCase();
  
  console.log('Detected intent:', intent);

  let agentName = 'Support Agent';
  let systemPrompt = '';

  // Route to appropriate agent based on intent
  if (intent.includes('update') || intent.includes('number')) {
    agentName = 'Missing Data Agent';
    systemPrompt = `You are a data collection agent. Help the user update their information. 
Current lead data: Name: ${lead.name || 'Unknown'}, Email: ${lead.email || 'None'}, Phone: ${lead.phone}.
Ask what information they want to update and guide them to provide it clearly.`;
  } else if (intent.includes('status') || intent.includes('check')) {
    agentName = 'Support Agent';
    systemPrompt = `You are a support agent. Provide status information about the lead.
Lead status: Consent granted on ${lead.consent_timestamp}. Data is being processed.
Be helpful and informative.`;
  } else if (intent.includes('missing') || intent.includes('data')) {
    agentName = 'Missing Data Agent';
    systemPrompt = `You are a data collection agent. The system detected missing information.
Current data: Name: ${lead.name || 'Unknown'}, Email: ${lead.email || 'None'}, Phone: ${lead.phone}.
Politely ask the user to provide the missing information.`;
  } else if (intent.includes('follow')) {
    agentName = 'Follow-Up Agent';
    systemPrompt = `You are a follow-up agent. Send friendly reminders to complete missing information.
Keep it professional and encouraging.`;
  } else {
    agentName = 'Support Agent';
    systemPrompt = `You are a helpful support agent for a lead management system. 
Answer questions about the service, data processing, and help with any concerns.
Be professional, friendly, and concise.`;
  }

  // Call the appropriate agent
  const agentResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 200,
    }),
  });

  if (!agentResponse.ok) {
    console.error('Agent error:', await agentResponse.text());
    throw new Error('Failed to get agent response');
  }

  const agentData = await agentResponse.json();
  const responseMessage = agentData.choices[0].message.content;

  return {
    message: responseMessage,
    agent: agentName
  };
}