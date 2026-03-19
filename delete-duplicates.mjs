import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mgahjjoegseffezndojg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYWhqam9lZ3NlZmZlem5kb2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MTgyNTksImV4cCI6MjA4NDA5NDI1OX0.MHtt084b7VNp1T7wXwYnCQCb-bSQdAIEAeuMd7RIDO0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log("Deletando duplicadas (itp_in_sequencia >= 1000)...");
    const { data, error } = await supabase
        .from('sales')
        .delete()
        .gte('itp_in_sequencia', 1000);
        
    if (error) {
        console.error("Erro ao deletar:", error);
    } else {
        console.log("Duplicadas deletadas com sucesso.");
    }
}

run();
