import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mgahjjoegseffezndojg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYWhqam9lZ3NlZmZlem5kb2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MTgyNTksImV4cCI6MjA4NDA5NDI1OX0.MHtt084b7VNp1T7wXwYnCQCb-bSQdAIEAeuMd7RIDO0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    const { data, error } = await supabase
        .from('sales')
        .select('fil_in_codigo, ser_st_codigo, ped_in_codigo, itp_in_sequencia, ped_st_status')
        .eq('ped_in_codigo', 386);
        
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Data for ped_in_codigo 386:", JSON.stringify(data, null, 2));
    }
}

run();
