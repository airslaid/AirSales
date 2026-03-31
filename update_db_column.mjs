import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mgahjjoegseffezndojg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYWhqam9lZ3NlZmZlem5kb2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MTgyNTksImV4cCI6MjA4NDA5NDI1OX0.MHtt084b7VNp1T7wXwYnCQCb-bSQdAIEAeuMd7RIDO0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function addColumn() {
  console.log("Adding column itp_re_valortotal to table sales...");
  
  // Note: Supabase JS client doesn't support running raw SQL directly via the client easily 
  // unless we use a function. But we can try to use the REST API or just inform the user.
  // Actually, I'll use the rpc 'exec_sql' if it exists, but it likely doesn't.
  
  console.log("Please run this SQL in your Supabase SQL Editor:");
  console.log("ALTER TABLE sales ADD COLUMN itp_re_valortotal NUMERIC;");
  
  // Alternatively, try a dummy select to verify connection
  const { data, error } = await supabase.from('sales').select('id').limit(1);
  if (error) {
    console.error("Connection error:", error);
  } else {
    console.log("Connection successful. Proceed to run the SQL in the dashboard.");
  }
}

addColumn();
