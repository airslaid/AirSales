import React, { useState, useEffect } from 'react';
import { VisitReport, AppUser } from '../types';
import { fetchVisitReports, upsertVisitReport, deleteVisitReport, fetchAppUsers } from '../services/supabaseService';
import { 
  FileText, Plus, Search, Trash2, Save, ArrowLeft, 
  Printer, Share2, Calendar, User, Building2, 
  Phone, Mail, PenTool, ClipboardList, CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface FormsViewProps {
  user: AppUser | null;
}

export const FormsView: React.FC<FormsViewProps> = ({ user }) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'EDIT' | 'SELECTION'>('LIST');
  const [reports, setReports] = useState<VisitReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentReport, setCurrentReport] = useState<Partial<VisitReport>>({});
  const [saving, setSaving] = useState(false);

  const AVAILABLE_FORMS = [
    {
      id: 'FOR-242',
      title: 'Relatório de Visita',
      subtitle: 'Filtro Prensa',
      revision: 'REV. 06',
      icon: ClipboardList,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      disabled: false
    },
    {
      id: 'FUTURE-001',
      title: 'Novo Relatório',
      subtitle: 'Em Breve',
      revision: '-',
      icon: FileText,
      color: 'text-gray-400',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      disabled: true
    }
  ];

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    const data = await fetchVisitReports();
    setReports(data);
    setLoading(false);
  };

  const handleNewReport = () => {
    setViewMode('SELECTION');
  };

  const handleSelectForm = (formId: string) => {
    if (formId === 'FOR-242') {
      setCurrentReport({
        type: 'Filtro Prensa',
        data_visita: new Date().toISOString().split('T')[0],
        rep_in_codigo: user?.rep_in_codigo || 0,
        solicitante: user?.name || ''
      });
      setViewMode('EDIT');
    }
  };

  const handleEditReport = (report: VisitReport) => {
    setCurrentReport(report);
    setViewMode('EDIT');
  };

  const handleDeleteReport = async (id: string) => {
    // In a real app, use a custom modal. For now, we'll proceed or log.
    console.log('Deleting report:', id);
    await deleteVisitReport(id);
    loadReports();
  };

  const handleSave = async () => {
    if (!currentReport.cliente_nome) {
      console.warn('O nome do cliente é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      await upsertVisitReport(currentReport as VisitReport);
      setViewMode('LIST');
      loadReports();
    } catch (error) {
      console.error('Erro ao salvar relatório:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredReports = reports.filter(r => 
    r.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.solicitante?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (viewMode === 'SELECTION') {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 h-full overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => setViewMode('LIST')}
            className="p-2 hover:bg-gray-100 rounded-sm transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Novo Relatório</h1>
            <p className="text-gray-500">Selecione o modelo de relatório que deseja preencher.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AVAILABLE_FORMS.map(form => (
            <button
              key={form.id}
              onClick={() => !form.disabled && handleSelectForm(form.id)}
              disabled={form.disabled}
              className={`text-left p-6 rounded-sm border transition-all duration-300 group relative overflow-hidden
                ${form.disabled 
                  ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60' 
                  : 'border-gray-200 bg-white hover:border-blue-500 hover:shadow-md cursor-pointer'
                }`}
            >
              <div className={`w-12 h-12 rounded-sm flex items-center justify-center mb-4 ${form.disabled ? 'bg-gray-100' : form.bgColor}`}>
                <form.icon className={`w-6 h-6 ${form.color}`} />
              </div>
              
              <div className="space-y-1">
                <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {form.title}
                </h3>
                <p className="text-sm text-gray-500 font-medium">{form.subtitle}</p>
                <div className="flex items-center gap-2 mt-4">
                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded-sm text-gray-600">
                    {form.id}
                  </span>
                  <span className="text-xs text-gray-400">
                    {form.revision}
                  </span>
                </div>
              </div>

              {!form.disabled && (
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-8 h-8 bg-blue-50 rounded-sm flex items-center justify-center">
                    <Plus className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (viewMode === 'LIST') {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 h-full overflow-y-auto custom-scrollbar">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-8 h-8 text-blue-600" />
              Formulários
            </h1>
            <p className="text-gray-500">Gerencie seus relatórios de visita e outros formulários.</p>
          </div>
          <button 
            onClick={handleNewReport}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-sm hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Relatório
          </button>
        </div>

        <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar por cliente ou solicitante..." 
                className="w-full pl-10 pr-4 py-2 rounded-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Data Visita</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Solicitante</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">Carregando...</td></tr>
                ) : filteredReports.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum relatório encontrado.</td></tr>
                ) : (
                  filteredReports.map(report => (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(report.data_visita).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{report.cliente_nome}</td>
                      <td className="px-4 py-3 text-gray-600">{report.type}</td>
                      <td className="px-4 py-3 text-gray-600">{report.solicitante}</td>
                      <td className="px-4 py-3 text-right flex justify-end gap-2">
                        <button 
                          onClick={() => handleEditReport(report)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded-sm"
                          title="Editar"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteReport(report.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded-sm"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- FORM EDITOR ---
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in slide-in-from-right-10 duration-500 h-full overflow-y-auto custom-scrollbar">
      {/* Header Actions */}
      <div className="flex items-center justify-between bg-white p-4 rounded-sm shadow-sm border border-gray-200 sticky top-4 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setViewMode('LIST')}
            className="p-2 hover:bg-gray-100 rounded-sm transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Relatório de Visita</h2>
            <p className="text-xs text-gray-500">FOR 242 - REV. 06</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-sm text-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-sm hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-none">
        {/* Header Form */}
        <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <span className="font-bold text-red-600 text-xl tracking-tighter">air slaid</span>
            </div>
            <div className="text-right">
                <h1 className="text-xl font-bold text-gray-900 uppercase">Relatório de Visita</h1>
            </div>
            <div className="text-xs text-gray-500 text-right">
                <p>FOR 242</p>
                <p>REV. 06</p>
            </div>
        </div>

        <div className="p-6 space-y-6">
            {/* Top Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
                    <input 
                        type="text" 
                        className="w-full p-2 border border-gray-300 rounded-sm bg-gray-50"
                        value={currentReport.type || 'Filtro Prensa'}
                        onChange={e => setCurrentReport({...currentReport, type: e.target.value})}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Solicitante</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border border-gray-300 rounded-sm"
                            value={currentReport.solicitante || ''}
                            onChange={e => setCurrentReport({...currentReport, solicitante: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Visita</label>
                        <input 
                            type="date" 
                            className="w-full p-2 border border-gray-300 rounded-sm"
                            value={currentReport.data_visita || ''}
                            onChange={e => setCurrentReport({...currentReport, data_visita: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            {/* Section: DADOS DO CLIENTE */}
            <div className="space-y-4">
                <div className="bg-gray-200 px-3 py-1 text-xs font-bold text-gray-700 uppercase tracking-wide rounded-sm">
                    Dados do Cliente
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-8">
                        <label className="block text-xs font-medium text-gray-500">Cliente</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 focus:border-blue-500 outline-none" 
                            value={currentReport.cliente_nome || ''} onChange={e => setCurrentReport({...currentReport, cliente_nome: e.target.value})} />
                    </div>
                    <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-gray-500">CNPJ</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 focus:border-blue-500 outline-none" 
                            value={currentReport.cnpj || ''} onChange={e => setCurrentReport({...currentReport, cnpj: e.target.value})} />
                    </div>

                    <div className="md:col-span-8">
                        <label className="block text-xs font-medium text-gray-500">Cidade</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 focus:border-blue-500 outline-none" 
                            value={currentReport.cidade || ''} onChange={e => setCurrentReport({...currentReport, cidade: e.target.value})} />
                    </div>
                    <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-gray-500">Estado</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 focus:border-blue-500 outline-none" 
                            value={currentReport.estado || ''} onChange={e => setCurrentReport({...currentReport, estado: e.target.value})} />
                    </div>

                    {/* Contatos Grid */}
                    <div className="md:col-span-12 grid grid-cols-12 gap-4 items-end border-t border-gray-100 pt-2">
                        <div className="col-span-4"><label className="text-xs font-bold text-gray-700">Contato Técnico</label></div>
                        <div className="col-span-8"><input type="text" placeholder="Nome" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.contato_tecnico_nome || ''} onChange={e => setCurrentReport({...currentReport, contato_tecnico_nome: e.target.value})} /></div>
                        
                        <div className="col-span-4"><label className="text-xs text-gray-500">E-mail</label></div>
                        <div className="col-span-5"><input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.contato_tecnico_email || ''} onChange={e => setCurrentReport({...currentReport, contato_tecnico_email: e.target.value})} /></div>
                        <div className="col-span-3"><input type="text" placeholder="Fone" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.contato_tecnico_fone || ''} onChange={e => setCurrentReport({...currentReport, contato_tecnico_fone: e.target.value})} /></div>
                        
                        <div className="col-span-4"><label className="text-xs text-gray-500">Depto</label></div>
                        <div className="col-span-8"><input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.contato_tecnico_depto || ''} onChange={e => setCurrentReport({...currentReport, contato_tecnico_depto: e.target.value})} /></div>
                    </div>

                    <div className="md:col-span-12 grid grid-cols-12 gap-4 items-end border-t border-gray-100 pt-2">
                        <div className="col-span-4"><label className="text-xs font-bold text-gray-700">Contato Comprador</label></div>
                        <div className="col-span-8"><input type="text" placeholder="Nome" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.contato_comprador_nome || ''} onChange={e => setCurrentReport({...currentReport, contato_comprador_nome: e.target.value})} /></div>
                        
                        <div className="col-span-4"><label className="text-xs text-gray-500">E-mail</label></div>
                        <div className="col-span-5"><input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.contato_comprador_email || ''} onChange={e => setCurrentReport({...currentReport, contato_comprador_email: e.target.value})} /></div>
                        <div className="col-span-3"><input type="text" placeholder="Fone" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.contato_comprador_fone || ''} onChange={e => setCurrentReport({...currentReport, contato_comprador_fone: e.target.value})} /></div>
                    </div>

                    <div className="md:col-span-12 grid grid-cols-12 gap-4 items-end border-t border-gray-100 pt-2">
                        <div className="col-span-4"><label className="text-xs font-bold text-gray-700">Gerente Planta</label></div>
                        <div className="col-span-8"><input type="text" placeholder="Nome" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.contato_gerente_nome || ''} onChange={e => setCurrentReport({...currentReport, contato_gerente_nome: e.target.value})} /></div>
                        
                        <div className="col-span-4"><label className="text-xs text-gray-500">E-mail</label></div>
                        <div className="col-span-5"><input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.contato_gerente_email || ''} onChange={e => setCurrentReport({...currentReport, contato_gerente_email: e.target.value})} /></div>
                        <div className="col-span-3"><input type="text" placeholder="Fone" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.contato_gerente_fone || ''} onChange={e => setCurrentReport({...currentReport, contato_gerente_fone: e.target.value})} /></div>
                    </div>

                    <div className="md:col-span-12 grid grid-cols-12 gap-4 items-end border-t border-gray-100 pt-2">
                        <div className="col-span-4"><label className="text-xs font-bold text-gray-700">Coordenador Planta</label></div>
                        <div className="col-span-8"><input type="text" placeholder="Nome" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.contato_coordenador_nome || ''} onChange={e => setCurrentReport({...currentReport, contato_coordenador_nome: e.target.value})} /></div>
                        
                        <div className="col-span-4"><label className="text-xs text-gray-500">E-mail</label></div>
                        <div className="col-span-5"><input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.contato_coordenador_email || ''} onChange={e => setCurrentReport({...currentReport, contato_coordenador_email: e.target.value})} /></div>
                        <div className="col-span-3"><input type="text" placeholder="Fone" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.contato_coordenador_fone || ''} onChange={e => setCurrentReport({...currentReport, contato_coordenador_fone: e.target.value})} /></div>
                    </div>

                    <div className="md:col-span-12 grid grid-cols-12 gap-4 items-end border-t border-gray-100 pt-2">
                        <div className="col-span-4"><label className="text-xs font-bold text-gray-700">Engenheiro Processo</label></div>
                        <div className="col-span-8"><input type="text" placeholder="Nome" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.contato_engenheiro_nome || ''} onChange={e => setCurrentReport({...currentReport, contato_engenheiro_nome: e.target.value})} /></div>
                        
                        <div className="col-span-4"><label className="text-xs text-gray-500">E-mail</label></div>
                        <div className="col-span-5"><input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.contato_engenheiro_email || ''} onChange={e => setCurrentReport({...currentReport, contato_engenheiro_email: e.target.value})} /></div>
                        <div className="col-span-3"><input type="text" placeholder="Fone" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.contato_engenheiro_fone || ''} onChange={e => setCurrentReport({...currentReport, contato_engenheiro_fone: e.target.value})} /></div>
                    </div>

                    <div className="md:col-span-12 pt-2">
                        <label className="block text-xs font-medium text-gray-500">Transportadora</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 focus:border-blue-500 outline-none" 
                            value={currentReport.transportadora || ''} onChange={e => setCurrentReport({...currentReport, transportadora: e.target.value})} />
                    </div>
                </div>
            </div>

            {/* Section: DADOS DO EQUIPAMENTO */}
            <div className="space-y-4">
                <div className="bg-gray-200 px-3 py-1 text-xs font-bold text-gray-700 uppercase tracking-wide rounded-sm">
                    Dados do Equipamento
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Marca do Fabricante</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.marca_fabricante || ''} onChange={e => setCurrentReport({...currentReport, marca_fabricante: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Material Placas</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.material_placas || ''} onChange={e => setCurrentReport({...currentReport, material_placas: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Temperatura</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.temperatura || ''} onChange={e => setCurrentReport({...currentReport, temperatura: e.target.value})} />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Equipamento</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.equipamento || ''} onChange={e => setCurrentReport({...currentReport, equipamento: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Dimensões</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.dimensoes || ''} onChange={e => setCurrentReport({...currentReport, dimensoes: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">PH Água Lavagem</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.ph_agua_lavagem || ''} onChange={e => setCurrentReport({...currentReport, ph_agua_lavagem: e.target.value})} />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Qtde Placas</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.qtde_placas || ''} onChange={e => setCurrentReport({...currentReport, qtde_placas: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">PH</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.ph || ''} onChange={e => setCurrentReport({...currentReport, ph: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Produto a Filtrar</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.produto_filtrar || ''} onChange={e => setCurrentReport({...currentReport, produto_filtrar: e.target.value})} />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Tempo Secagem</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.tempo_secagem || ''} onChange={e => setCurrentReport({...currentReport, tempo_secagem: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">% Sólidos Filtrados</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.percent_solidos || ''} onChange={e => setCurrentReport({...currentReport, percent_solidos: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Tempo Filtração</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.tempo_filtracao || ''} onChange={e => setCurrentReport({...currentReport, tempo_filtracao: e.target.value})} />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Tipo Abertura</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.tipo_abertura || ''} onChange={e => setCurrentReport({...currentReport, tipo_abertura: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Tipo Limpeza</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.tipo_limpeza || ''} onChange={e => setCurrentReport({...currentReport, tipo_limpeza: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Tipo Bomba</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.tipo_bomba || ''} onChange={e => setCurrentReport({...currentReport, tipo_bomba: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Qtde de Setores</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.qtde_setores || ''} onChange={e => setCurrentReport({...currentReport, qtde_setores: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Pressão Sopro</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.pressao_sopro || ''} onChange={e => setCurrentReport({...currentReport, pressao_sopro: e.target.value})} />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Umidade Torta</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.umidade_torta || ''} onChange={e => setCurrentReport({...currentReport, umidade_torta: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Pressão Filtração</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.pressao_filtracao || ''} onChange={e => setCurrentReport({...currentReport, pressao_filtracao: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Aux. Filtração</label>
                        <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.aux_filtracao || ''} onChange={e => setCurrentReport({...currentReport, aux_filtracao: e.target.value})} />
                    </div>
                </div>
            </div>

            {/* Section: MEDIDAS DO DESENHO (Apenas Filtro Prensa) */}
            {currentReport.type === 'Filtro Prensa' && (
                <div className="space-y-4">
                    <div className="bg-gray-200 px-3 py-1 text-xs font-bold text-gray-700 uppercase tracking-wide rounded-sm flex justify-between items-center">
                        <span>Medidas do Desenho Técnico</span>
                        <span className="text-[10px] font-normal text-gray-500 normal-case">Preencha as medidas nos campos indicados</span>
                    </div>
                    
                    <div className="relative w-full bg-gray-100 border border-gray-300 rounded-sm overflow-hidden" style={{ minHeight: '500px' }}>
                        {/* Placeholder Image - Substituir por imagem real */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                            <span className="text-4xl font-bold text-gray-300">DESENHO TÉCNICO</span>
                        </div>
                        
                        {/* Imagem de Fundo (Placeholder) */}
                        <img 
                            src="https://placehold.co/800x600/png?text=Desenho+Tecnico" 
                            alt="Desenho Técnico Filtro Prensa" 
                            className="w-full h-full object-contain opacity-50"
                        />

                        {/* Inputs Sobrepostos - Posições Aproximadas */}
                        {[
                            { key: 'A', top: '10%', left: '10%', label: 'Ø Sup. Esq.' },
                            { key: 'B', top: '10%', left: '50%', label: 'Largura Sup.' },
                            { key: 'C', top: '10%', left: '85%', label: 'Ø Sup. Dir.' },
                            { key: 'D', top: '35%', left: '10%', label: 'Altura Esq.' },
                            { key: 'E', top: '50%', left: '50%', label: 'Ø Central' },
                            { key: 'F', top: '35%', left: '85%', label: 'Altura Dir.' },
                            { key: 'G', top: '85%', left: '10%', label: 'Ø Inf. Esq.' },
                            { key: 'H', top: '85%', left: '50%', label: 'Largura Inf.' },
                            { key: 'I', top: '85%', left: '85%', label: 'Ø Inf. Dir.' },
                            { key: 'J', top: '50%', left: '95%', label: 'Espessura' },
                        ].map((point) => (
                            <div 
                                key={point.key}
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded shadow-md border border-red-500 flex flex-col items-center gap-1"
                                style={{ top: point.top, left: point.left, width: '80px' }}
                            >
                                <span className="text-[10px] font-bold text-gray-500">{point.label}</span>
                                <input 
                                    type="text" 
                                    className="w-full text-center text-xs font-bold border border-gray-300 rounded-sm p-1 focus:border-blue-500 outline-none"
                                    placeholder="mm"
                                    value={currentReport.medidas_desenho?.[point.key] || ''}
                                    onChange={(e) => {
                                        const newMedidas = { ...(currentReport.medidas_desenho || {}) };
                                        newMedidas[point.key] = e.target.value;
                                        setCurrentReport({ ...currentReport, medidas_desenho: newMedidas });
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 italic text-center">* Insira as medidas em milímetros (mm) nos campos correspondentes ao desenho.</p>
                </div>
            )}

            {/* Section: OUTROS */}
            <div className="space-y-4">
                <div className="bg-gray-200 px-3 py-1 text-xs font-bold text-gray-700 uppercase tracking-wide rounded-sm">
                    Detalhes Adicionais
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-500">Motivo Substituição</label>
                            <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.motivo_substituicao || ''} onChange={e => setCurrentReport({...currentReport, motivo_substituicao: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Tecido Atual</label>
                            <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.tecido_atual || ''} onChange={e => setCurrentReport({...currentReport, tecido_atual: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Fornecedor Atual</label>
                            <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.fornecedor_atual || ''} onChange={e => setCurrentReport({...currentReport, fornecedor_atual: e.target.value})} />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-500">CFM</label>
                            <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.cfm || ''} onChange={e => setCurrentReport({...currentReport, cfm: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Vida Útil</label>
                            <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.vida_util || ''} onChange={e => setCurrentReport({...currentReport, vida_util: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Situação das Lonas</label>
                            <input type="text" className="w-full p-1 border-b border-gray-300 text-sm" value={currentReport.situacao_lonas || ''} onChange={e => setCurrentReport({...currentReport, situacao_lonas: e.target.value})} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Section: OBSERVAÇÕES */}
            <div className="space-y-2">
                <div className="bg-gray-200 px-3 py-1 text-xs font-bold text-gray-700 uppercase tracking-wide rounded-sm">
                    Observações
                </div>
                <textarea 
                    className="w-full p-3 border border-gray-300 rounded-sm text-sm h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Digite suas observações aqui..."
                    value={currentReport.observacoes || ''}
                    onChange={e => setCurrentReport({...currentReport, observacoes: e.target.value})}
                />
            </div>
        </div>
      </div>
    </div>
  );
};
