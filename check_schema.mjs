import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mgahjjoegseffezndojg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYWhqam9lZ3NlZmZlem5kb2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MTgyNTksImV4cCI6MjA4NDA5NDI1OX0.MHtt084b7VNp1T7wXwYnCQCb-bSQdAIEAeuMd7RIDO0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSchema() {
  console.log("Checking schema for table 'sales'...");
  
  // Try to fetch one row and see the keys
  const { data, error } = await supabase.from('sales').select('*').limit(1);
  
  if (error) {
    console.error("Error fetching sales:", error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log("Columns found in 'sales' table:");
    console.log(Object.keys(data[0]));
    
    if (Object.keys(data[0]).includes('itp_re_valortotal')) {
      console.log("SUCCESS: 'itp_re_valortotal' column exists.");
      console.log("Value in sample row:", data[0].itp_re_valortotal);
    } else {
      console.log("FAILURE: 'itp_re_valortotal' column NOT FOUND.");
    }
  } else {
    console.log("No data in 'sales' table.");
  }
}

checkSchema();
