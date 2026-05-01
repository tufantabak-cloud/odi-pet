import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

serve(async (req) => {
  const { pet_id, symptoms } = await req.json()
  
  // Phase 1: Rule-based heuristic scoring (No LLM wrapper required yet)
  let score = 0;
  let severity = "low";

  const symptomString = symptoms?.toLowerCase() || "";

  if (symptomString.includes("kan") || symptomString.includes("kriz")) {
    score = 90;
    severity = "critical";
  } else if (symptomString.includes("kusma") || symptomString.includes("ates")) {
    score = 50;
    severity = "medium";
  } else {
    score = 10;
  }

  return new Response(
    JSON.stringify({ 
      pet_id,
      score, 
      severity, 
      recommended_action: severity === "critical" ? "Acil Veteriner Ziyareti!" : "Kontrol Gerekebilir"
    }),
    { headers: { "Content-Type": "application/json" } },
  )
})
