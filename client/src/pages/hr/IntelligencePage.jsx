import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiAPI } from '../../services/api';
import { Brain, Send, Sparkles, Zap } from 'lucide-react';
import { attendanceAPI } from '../../services/api';

const QUICK_PROMPTS = [
  'Who has attendance below 80%?',
  'How many pending leave requests?',
  'Show employees with frequent absences',
  'Which department has highest absenteeism?',
  'Who checked in late this month?',
  'Show attendance anomalies',
  'What is today\'s total payroll cost?',
  'List employees with missing checkouts',
];

export default function IntelligencePage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '👋 Hello! I\'m DAYFLOW Intelligence — your AI HR Copilot.\n\nAsk me anything about attendance, leave patterns, anomalies, or workforce insights. I query live data to give you real-time answers.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [anomalies, setAnomalies] = useState([]);
  const msgEndRef = useRef(null);

  useEffect(() => {
    attendanceAPI.getIntelligence()
      .then(r => setAnomalies(r.data.anomalies || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (query) => {
    const q = query || input.trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);

    try {
      const res = await aiAPI.query(q);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.response,
        tools: res.data.toolsUsed,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ I encountered an error querying the data. The AI service may be temporarily unavailable. Please try again.',
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="animate-fadeIn" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, height: 'calc(100vh - 120px)' }}>
      {/* Main Chat Panel */}
      <div className="ai-panel">
        {/* Header */}
        <div className="ai-panel-header">
          <div className="ai-panel-title">
            <Brain size={18} style={{ color: 'var(--brand-primary)' }} />
            DAYFLOW Intelligence
            <span style={{ fontSize: '0.65rem', background: 'hsla(235,85%,62%,0.15)', color: 'var(--brand-primary)', borderRadius: 99, padding: '2px 8px', fontWeight: 600 }}>AI Copilot</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Powered by Gemini · Queries live HR data</div>
        </div>

        {/* Messages */}
        <div className="ai-messages">
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`ai-message ${msg.role}`} style={{ borderLeft: msg.error ? '3px solid var(--danger)' : undefined }}>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{msg.content}</div>
              {msg.tools?.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {msg.tools.map((t, j) => (
                    <span key={j} style={{ fontSize: '0.65rem', background: 'hsla(235,85%,62%,0.15)', color: 'var(--brand-primary)', borderRadius: 99, padding: '2px 7px' }}>
                      🔧 {t.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ai-message assistant">
              <div className="ai-typing">
                <span /><span /><span />
                <span style={{ marginLeft: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Querying HR data...</span>
              </div>
            </motion.div>
          )}
          <div ref={msgEndRef} />
        </div>

        {/* Input */}
        <div className="ai-input-area">
          <textarea
            className="ai-input"
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about attendance, leaves, patterns, anomalies..."
            disabled={loading}
          />
          <button className="btn btn-primary btn-icon" onClick={() => sendMessage()} disabled={!input.trim() || loading}>
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Right Panel: Quick Prompts + Live Alerts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        {/* Quick Prompts */}
        <div className="card">
          <h3 style={{ marginBottom: 14, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={15} style={{ color: 'var(--brand-primary)' }} /> Quick Queries
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {QUICK_PROMPTS.map((p, i) => (
              <motion.button key={i} whileHover={{ x: 3 }} onClick={() => sendMessage(p)}
                style={{ textAlign: 'left', background: 'var(--surface-2)', border: '1px solid var(--surface-3)', borderRadius: 'var(--r-md)', padding: '8px 12px', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-secondary)', transition: 'all 0.15s', fontFamily: 'inherit' }}
                onMouseOver={e => e.target.style.borderColor = 'var(--brand-primary)'}
                onMouseOut={e => e.target.style.borderColor = 'var(--surface-3)'}
              >{p}</motion.button>
            ))}
          </div>
        </div>

        {/* Live Anomalies */}
        {anomalies.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 12, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={15} style={{ color: 'var(--warning)' }} /> Live Alerts
            </h3>
            {anomalies.slice(0, 5).map((a, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--surface-2)', cursor: 'pointer' }}
                onClick={() => sendMessage(`Tell me about ${a.employeeName}'s attendance issues`)}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{a.employeeName}</div>
                <div style={{ fontSize: '0.72rem', color: a.topSeverity === 'high' ? 'var(--danger)' : 'var(--warning)' }}>
                  {a.attendancePct}% attendance · {a.issues.length} issue{a.issues.length > 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
