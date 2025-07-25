-- Supabase Edge Function pro odesílání emailů
-- Tento kód nahrajte jako Edge Function v Supabase dashboard

-- 1. Jděte na https://supabase.com/dashboard
-- 2. Vyberte váš projekt
-- 3. Jděte na "Edge Functions"
-- 4. Klikněte "Create new function"
-- 5. Pojmenujte ji "send-newsletter"
-- 6. Vložte tento TypeScript kód:

/*
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { emails, resendApiKey } = await req.json()
    
    if (!emails || !Array.isArray(emails)) {
      throw new Error('Invalid emails array')
    }

    if (!resendApiKey) {
      throw new Error('Resend API key is required')
    }

    const results = []

    // Odeslání emailů po jednom
    for (const emailData of emails) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailData),
        })

        const data = await response.json()

        if (response.ok) {
          results.push({
            success: true,
            email: emailData.to[0],
            id: data.id
          })
        } else {
          results.push({
            success: false,
            email: emailData.to[0],
            error: data.message || 'Unknown error'
          })
        }

        // Malé zpoždění mezi emaily
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        results.push({
          success: false,
          email: emailData.to[0],
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failedCount,
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
*/

-- Po nahrání Edge Function:
-- 7. Klikněte "Deploy"
-- 8. Zkopírujte URL funkce (něco jako: https://ABC.supabase.co/functions/v1/send-newsletter)