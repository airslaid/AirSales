import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = 'https://mgahjjoegseffezndojg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYWhqam9lZ3NlZmZlem5kb2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MTgyNTksImV4cCI6MjA4NDA5NDI1OX0.MHtt084b7VNp1T7wXwYnCQCb-bSQdAIEAeuMd7RIDO0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    // try to query a hypothetical table to see if it exists
    const { data: d1, error: e1 } = await supabase.from('crm_pipeline').select('*').limit(1);
    console.log("crm_pipeline:", { error: e1 ? e1.message : 'exists' });
}

run();
