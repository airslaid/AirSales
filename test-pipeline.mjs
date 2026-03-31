import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mgahjjoegseffezndojg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYWhqam9lZ3NlZmZlem5kb2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MTgyNTksImV4cCI6MjA4NDA5NDI1OX0.MHtt084b7VNp1T7wXwYnCQCb-bSQdAIEAeuMd7RIDO0';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  console.log("Testing CRMPipelineStatus Upsert...");
  const payload = {
      fil_in_codigo: 900,
      ser_st_codigo: 'TEST',
      ped_in_codigo: 12345,
      status: 'EM APROVAÇÃO (INTERNO)'
  };
  
  // First attempt (might insert)
  let { data, error } = await supabase
      .from('crm_pipeline')
      .upsert([payload], { onConflict: 'fil_in_codigo,ser_st_codigo,ped_in_codigo' });
      
  console.log("First attempt:", error ? error.message : "Success");
  
  // Second attempt (will update if onConflict works, or fail if missing constraint)
  if (!error) {
    payload.status = 'PROPOSTA ENVIADA';
    let { data: d2, error: e2 } = await supabase
        .from('crm_pipeline')
        .upsert([payload], { onConflict: 'fil_in_codigo,ser_st_codigo,ped_in_codigo' });
    console.log("Second attempt:", e2 ? e2.message : "Success");
  }
}

test();
