import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = 'https://mgahjjoegseffezndojg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYWhqam9lZ3NlZmZlem5kb2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MTgyNTksImV4cCI6MjA4NDA5NDI1OX0.MHtt084b7VNp1T7wXwYnCQCb-bSQdAIEAeuMd7RIDO0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    const { data, error } = await supabase
        .from('sales')
        .select('id, fil_in_codigo, ser_st_codigo, ped_in_codigo, itp_in_sequencia, ped_st_status')
        .gt('itp_in_sequencia', 1000);
        
    if (error) {
        fs.writeFileSync('duplicates.json', JSON.stringify({error}, null, 2));
    } else {
        fs.writeFileSync('duplicates.json', JSON.stringify(data, null, 2));
    }
}

run();
