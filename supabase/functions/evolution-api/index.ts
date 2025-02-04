import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

console.log("Evolution API Edge Function initialized")

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname

    // Basic auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || authHeader !== `Bearer ${Deno.env.get('EVOLUTION_API_KEY')}`) {
      return new Response('Unauthorized', { 
        status: 401,
        headers: { ...corsHeaders }
      })
    }

    // Route handling
    if (path === '/send-message' && req.method === 'POST') {
      const { phoneNumber, message } = await req.json()
      
      // Here we'll implement the WhatsApp message sending logic
      // For now, we'll just log the attempt
      console.log(`Attempting to send message to ${phoneNumber}: ${message}`)

      return new Response(JSON.stringify({
        success: true,
        message: 'Message queued for delivery'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      })
    }

    return new Response('Not Found', { 
      status: 404,
      headers: { ...corsHeaders }
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })
  }
})