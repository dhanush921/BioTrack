import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, Search, Play, HelpCircle, Send, 
  AlertTriangle, ShieldAlert, Sparkles, Clipboard, CheckSquare,
  ArrowRight, ShieldCheck, RefreshCw, MessageSquare
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { CardSkeleton } from '../components/SkeletonLoader';

interface EquipmentOption {
  id: string;
  name: string;
  category: string;
}

export const AIInsights: React.FC = () => {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [equipmentOptions, setEquipmentOptions] = useState<EquipmentOption[]>([]);
  const [selectedEqId, setSelectedEqId] = useState('');
  
  // Predictive Report states
  const [reportLoading, setReportLoading] = useState(false);
  const [predictionReport, setPredictionReport] = useState<any | null>(null);
  
  // Schedule Recommendation states
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleReport, setScheduleReport] = useState<any | null>(null);

  // Chatbot states
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      sender: 'ai',
      text: "Hello! I am BioTrack's Engineering AI assistant. Select an equipment asset and ask me troubleshooting questions, calibration guidelines, or safety compliance standards.",
      timestamp: new Date().toISOString()
    }
  ]);
  const [question, setQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const data = await api.get('/equipment');
        setEquipmentOptions(data.map((e: any) => ({
          id: e.id,
          name: `${e.name} (${e.id})`,
          category: e.category
        })));
        if (data.length > 0) {
          setSelectedEqId(data[0].id);
        }
      } catch (err) {
        toast.error('Failed to load equipment options.');
      } finally {
        setLoading(false);
      }
    };
    fetchEquipment();
  }, []);

  const triggerPredictiveAnalysis = async () => {
    if (!selectedEqId) return;
    setReportLoading(true);
    setPredictionReport(null);
    setScheduleReport(null);
    try {
      const res = await api.post('/ai/predict', { equipmentId: selectedEqId });
      setPredictionReport(res);
      toast.success('Telemetry breakdown prediction completed.');
    } catch (err) {
      toast.error('Prediction failed.');
    } finally {
      setReportLoading(false);
    }
  };

  const triggerScheduleAdvisor = async () => {
    if (!selectedEqId) return;
    setScheduleLoading(true);
    setPredictionReport(null);
    setScheduleReport(null);
    try {
      const res = await api.post('/ai/schedule-recommend', { equipmentId: selectedEqId });
      setScheduleReport(res);
      toast.success('AI preventive schedule advisor finished.');
    } catch (err) {
      toast.error('Schedule check failed.');
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !selectedEqId) return;

    const userMessage = question;
    setChatMessages(prev => [...prev, {
      sender: 'user',
      text: userMessage,
      timestamp: new Date().toISOString()
    }]);
    setQuestion('');
    setChatLoading(true);

    try {
      // First try to check if the query is a troubleshooting problem description (runs analyzeFault) or QA (runs answerQuestion)
      // If it contains terms like "shadow", "leak", "power", "fail" -> run troubleshooting API
      const lowerQ = userMessage.toLowerCase();
      let response;
      if (lowerQ.includes('fail') || lowerQ.includes('shadow') || lowerQ.includes('power') || lowerQ.includes('leak') || lowerQ.includes('fault') || lowerQ.includes('broken')) {
        const res = await api.post('/ai/troubleshoot', { equipmentId: selectedEqId, problemDescription: userMessage });
        
        // Format troubleshooting response beautifully for chat
        const causesText = res.probableCauses.map((c: string) => `• ${c}`).join('\n');
        const stepsText = res.troubleshootingSteps.map((s: string, idx: number) => `${idx + 1}. ${s}`).join('\n');
        
        response = `**AI Fault Diagnostics Diagnosis:**
Urgency Alert: **${res.urgency}**
Safety Directive: *${res.safetyNotice}*

*Probable Causes:*
${causesText}

*Recommended Troubleshooting Checklist:*
${stepsText}`;
      } else {
        const res = await api.post('/ai/chat', { equipmentId: selectedEqId, question: userMessage });
        const resourceText = res.suggestedResources.map((r: string) => `- [Ref: ${r}]`).join('\n');
        response = `${res.answer}\n\n*Reference Standards:*\n${resourceText}`;
      }

      setChatMessages(prev => [...prev, {
        sender: 'ai',
        text: response,
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      setChatMessages(prev => [...prev, {
        sender: 'ai',
        text: 'Error processing AI query. Please check server logs.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const quickTemplates = [
    "ECG does not power on, display is dead",
    "Shadow artifacts visible during ultrasound scan",
    "Flow sensor failure alarms on ventilator",
    "What are the calibration requirements for this device?",
    "Safety leakage standards (IEC 60601-1) limits"
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-slate-900/60 w-48 rounded animate-pulse"></div>
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 text-slate-800 dark:text-slate-100 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 text-white shadow-lg">
          <BrainCircuit className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">AI Predictive Maintenance & Advisor</h1>
          <p className="text-slate-400 text-sm mt-1">Telemetry analytics, wear predictions, and diagnostic guides.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column: Tools & Inputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target Asset selector */}
          <GlassCard className="border-white/5 bg-slate-900/40 space-y-4">
            <h3 className="font-semibold text-sm text-slate-300">Select Biomedical Asset</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Choose an active medical device registry entry to analyze wear indexes, schedule intervals, or troubleshoot fault states.
            </p>
            <select
              value={selectedEqId}
              onChange={(e) => setSelectedEqId(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-glass bg-slate-950/40 text-slate-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 appearance-none"
            >
              {equipmentOptions.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={triggerPredictiveAnalysis}
                disabled={reportLoading}
                className="py-2.5 px-3 bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 hover:from-cyan-500/30 hover:to-cyan-600/30 border border-cyan-500/30 text-cyan-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {reportLoading ? 'Processing...' : 'Predict Wear'}
              </button>
              <button
                onClick={triggerScheduleAdvisor}
                disabled={scheduleLoading}
                className="py-2.5 px-3 bg-gradient-to-r from-violet-500/20 to-violet-600/20 hover:from-violet-500/30 hover:to-violet-600/30 border border-violet-500/30 text-violet-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <Clipboard className="w-3.5 h-3.5" />
                {scheduleLoading ? 'Processing...' : 'Check Intervals'}
              </button>
            </div>
          </GlassCard>

          {/* AI Report display card */}
          {(predictionReport || scheduleReport) && (
            <GlassCard className="border-cyan-500/10 bg-slate-900/50 shadow-inner space-y-4 overflow-hidden relative">
              {/* Glowing header line */}
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-cyan-500 to-violet-500"></div>
              
              {predictionReport && (
                <div className="space-y-4 animate-scale-up">
                  <div className="flex justify-between items-start border-b border-white/5 pb-3">
                    <div>
                      <h4 className="font-bold text-sm text-slate-200">Wear & Breakdown Prognostics</h4>
                      <p className="text-[9px] text-slate-500 mt-0.5">Asset ID: {predictionReport.equipmentId}</p>
                    </div>
                    <StatusBadge status={predictionReport.warningLevel} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold tracking-tight text-gradient">{predictionReport.failureProbability}</span>
                      <span className="text-xs text-slate-400">Breakdown Risk Index</span>
                    </div>

                    <div className="p-3 border border-white/5 bg-slate-950/20 rounded-xl space-y-1.5 text-xs">
                      <p className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Critical Risk Center:</p>
                      <p className="text-slate-200 font-medium">{predictionReport.criticalComponent}</p>
                      <p className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] mt-2">Estimated Lifespan Limit:</p>
                      <p className="text-slate-200 font-mono">{predictionReport.estimatedFailureDate}</p>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                      {predictionReport.analysisSummary}
                    </p>

                    <div className="space-y-1.5 pt-2">
                      <span className="text-xs font-semibold text-slate-300">Prescriptive Directives:</span>
                      <ul className="text-[11px] text-slate-400 space-y-1">
                        {predictionReport.recommendations.map((r: string, idx: number) => (
                          <li key={idx} className="flex gap-2">
                            <span className="text-cyan-400 font-bold">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {scheduleReport && (
                <div className="space-y-4 animate-scale-up">
                  <div className="flex justify-between items-start border-b border-white/5 pb-3">
                    <div>
                      <h4 className="font-bold text-sm text-slate-200">Preventive PM Strategy</h4>
                      <p className="text-[9px] text-slate-500 mt-0.5">Asset ID: {scheduleReport.equipmentId}</p>
                    </div>
                    <span className="text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded font-semibold font-mono">
                      {scheduleReport.recommendedFrequency}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1 text-xs text-slate-300 leading-relaxed">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Medical Heuristics Justification:</span>
                      <p className="font-sans text-slate-400 mt-0.5">{scheduleReport.justification}</p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                        <CheckSquare className="w-4 h-4 text-violet-400" />
                        Required AI Checklist:
                      </span>
                      <div className="space-y-1.5 text-xs text-slate-400 font-mono bg-slate-950/20 p-3 border border-white/5 rounded-xl">
                        {scheduleReport.checklist.map((item: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-violet-400 font-bold">[{idx + 1}]</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>
          )}
        </div>

        {/* Right Column: Q&A Chat Assistant */}
        <div className="lg:col-span-3">
          <GlassCard className="border-white/5 bg-slate-900/40 flex flex-col h-[580px] p-6 relative">
            <div className="flex items-center gap-2 pb-4 border-b border-white/5">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="font-bold text-sm text-slate-200">BioTrack Engineering Assistant</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Live expert chatbot for troubleshooting & standards.</p>
              </div>
            </div>

            {/* Chat Messages scroll area */}
            <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1">
              {chatMessages.map((msg, idx) => (
                <div 
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div className={`
                    max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap
                    ${msg.sender === 'user' 
                      ? 'bg-cyan-500/10 text-slate-100 border border-cyan-500/20' 
                      : 'bg-slate-950/40 text-slate-300 border border-white/5 font-sans'}
                  `}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-950/40 text-slate-500 rounded-2xl p-3 border border-white/5 text-xs flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing schema, calibrator curves, and wear history...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Templates shortcuts */}
            <div className="border-t border-white/5 pt-3 mb-3">
              <p className="text-[10px] text-slate-500 mb-1.5 uppercase font-semibold">Troubleshoot Templates:</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 max-w-full">
                {quickTemplates.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQuestion(t)}
                    className="flex-shrink-0 px-2.5 py-1.5 bg-slate-950/40 hover:bg-slate-950/60 border border-white/5 rounded-lg text-[10px] text-slate-400 hover:text-white transition-colors"
                  >
                    {t.substring(0, 32)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Form input */}
            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about a breakdown (e.g. shadow artifacts screen)..."
                className="flex-1 px-3.5 py-2.5 border border-glass bg-slate-950/30 text-slate-200 rounded-xl text-xs focus:outline-none focus:border-cyan-500/50"
              />
              <button
                type="submit"
                disabled={chatLoading || !question.trim()}
                className="p-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-xl shadow-lg transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
