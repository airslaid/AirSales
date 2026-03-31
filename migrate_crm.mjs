import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mgahjjoegseffezndojg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYWhqam9lZ3NlZmZlem5kb2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MTgyNTksImV4cCI6MjA4NDA5NDI1OX0.MHtt084b7VNp1T7wXwYnCQCb-bSQdAIEAeuMd7RIDO0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CRM_STATUSES = [
  'EM ANALISE', 'EM ANÁLISE', 'EM NEGOCIACAO', 'EM NEGOCIAÇÃO',
  'AGUARDANDO CLIENTE', 'EM APROVACAO (INTERNO)', 'EM APROVAÇÃO (INTERNO)',
  'PROPOSTA ENVIADA', 'CANCELADO / PERDIDO', 'FECHADO (GANHO)', 'FECHADO (PERDIDO)'
];

async function migrate_data() {
    console.log("Iniciando migração de histórico do CRM...");
    
    // Buscar todos os registros do sales que têm um status típico do CRM
    // Ou buscar todos os orçamentos (OV)
    
    const { data: sales, error } = await supabase
        .from('sales')
        .select('fil_in_codigo, ser_st_codigo, ped_in_codigo, ped_st_status')
        .eq('ser_st_codigo', 'OV');
        
    if (error) {
        console.error("Erro ao buscar sales:", error);
        return;
    }
    
    console.log(`Encontrados ${sales.length} orçamentos (OV). Processando...`);
    
    const pipelineEntries = [];
    const uniqueKeys = new Set();
    
    for (const s of sales) {
        const key = `${s.fil_in_codigo}-${s.ser_st_codigo}-${s.ped_in_codigo}`;
        if (!uniqueKeys.has(key)) {
            uniqueKeys.add(key);
            
            // Vamos inserir TODOS os orçamentos na tabela do CRM para garantir que a foto
            // exata de hoje seja preservada
            pipelineEntries.push({
                fil_in_codigo: s.fil_in_codigo,
                ser_st_codigo: s.ser_st_codigo,
                ped_in_codigo: s.ped_in_codigo,
                status: s.ped_st_status
            });
        }
    }
    
    console.log(`Preparando para inserir ${pipelineEntries.length} registros no crm_pipeline...`);
    
    // Inserir em lotes de 1000
    const batchSize = 1000;
    for (let i = 0; i < pipelineEntries.length; i += batchSize) {
        const batch = pipelineEntries.slice(i, i + batchSize);
        const { error: insertError } = await supabase
            .from('crm_pipeline')
            .upsert(batch, { onConflict: 'fil_in_codigo,ser_st_codigo,ped_in_codigo' });
            
        if (insertError) {
            console.error(`Erro no lote ${i}:`, insertError);
        } else {
            console.log(`Lote ${i/batchSize + 1} inserido com sucesso.`);
        }
    }
    
    console.log("Migração concluída com sucesso!");
}

migrate_data();
