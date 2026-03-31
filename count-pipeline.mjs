import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mgahjjoegseffezndojg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYWhqam9lZ3NlZmZlem5kb2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MTgyNTksImV4cCI6MjA4NDA5NDI1OX0.MHtt084b7VNp1T7wXwYnCQCb-bSQdAIEAeuMd7RIDO0';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  let { count, error } = await supabase
      .from('crm_pipeline')
      .select('*', { count: 'exact', head: true });
      
  console.log("Count crm_pipeline:", count);
}

test();
