import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Inbox, 
  CheckCheck, 
  AlertTriangle, 
  FileCheck2, 
  ShieldCheck, 
  Clock, 
  PlusCircle, 
  Reply, 
  Building2, 
  UserCheck, 
  Search,
  Filter
} from 'lucide-react';
import { Message, User, FDR } from '../types';
import { api } from '../services/api';

interface MessagesViewProps {
  currentUser: User;
  fdrs: FDR[];
  onRefreshData: () => void;
  refreshKey?: number;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  currentUser,
  fdrs,
  onRefreshData,
  refreshKey = 0,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'INBOX' | 'SENT'>('INBOX');

  // Compose Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedFdrId, setSelectedFdrId] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [messageType, setMessageType] = useState<any>('OFFICIAL_NOTICE');

  const isAicte = currentUser.role === 'AICTE_OFFICER';

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const data = await api.getMessages({ role: currentUser.role });
      setMessages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [currentUser.role, refreshKey]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markMessageRead(id);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
      onRefreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !content.trim()) return;
    setSubmitting(true);

    const recipientRole = isAicte ? 'BANK_OFFICER' : 'AICTE_OFFICER';
    const recipientName = isAicte ? 'Bank Nodal Officer (State Bank of India)' : 'AICTE Regulation Bureau Officer';
    const linkedFdr = fdrs.find(f => f.id === selectedFdrId);

    try {
      await api.sendMessage({
        recipient_role: recipientRole,
        recipient_name: recipientName,
        fdr_id: selectedFdrId || undefined,
        fdr_number: linkedFdr ? linkedFdr.fdr_number : undefined,
        subject,
        content,
        message_type: messageType
      });

      setIsComposeOpen(false);
      setSubject('');
      setContent('');
      setSelectedFdrId('');
      await fetchMessages();
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch message');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickReply = (msg: Message) => {
    setSubject(msg.subject.startsWith('Re: ') ? msg.subject : `Re: ${msg.subject}`);
    setSelectedFdrId(msg.fdr_id || '');
    setMessageType(isAicte ? 'OFFICIAL_NOTICE' : 'BANK_CONFIRMATION');
    setIsComposeOpen(true);
  };

  // Filter messages based on active tab and type
  const displayedMessages = messages.filter(m => {
    const isReceived = m.recipient_role === currentUser.role;
    const matchesTab = activeTab === 'INBOX' ? isReceived : !isReceived;
    const matchesType = filterType === 'ALL' || m.message_type === filterType;
    return matchesTab && matchesType;
  });

  const getMessageTypeBadge = (type: string) => {
    switch (type) {
      case 'DISCREPANCY_FLAG':
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Discrepancy Notice</span>;
      case 'LIEN_DISCHARGE_ORDER':
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"><FileCheck2 className="w-3 h-3" /> Lien Discharge Order</span>;
      case 'BANK_CONFIRMATION':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Bank CBS Confirmation</span>;
      case 'VERIFICATION_REQUEST':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.5 rounded text-[10px] font-bold">Verification Request</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 border border-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">Official Notice</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Two-Way Official Communications &amp; Notice Desk
            </h2>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
              Direct AICTE &bull; Bank Nodal Channel
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time formal communications, discrepancy notifications, and lien clearance instructions between the <strong>AICTE Regulation Bureau</strong> and <strong>Issuing Bank Nodal Officers</strong>. Every dispatch is cryptographically hash-chained in the audit log.
          </p>
        </div>

        <button
          onClick={() => setIsComposeOpen(true)}
          className={`font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center gap-2 text-white ${
            isAicte ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          {isAicte ? 'Dispatch Notice to Bank Officer' : 'Send Message to AICTE Officer'}
        </button>
      </div>

      {/* Control Tabs & Filters */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('INBOX')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'INBOX' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            Inbox ({messages.filter(m => m.recipient_role === currentUser.role && !m.is_read).length} Unread)
          </button>
          <button
            onClick={() => setActiveTab('SENT')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'SENT' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Sent Notices
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Communication Types</option>
            <option value="DISCREPANCY_FLAG">Discrepancy Notices</option>
            <option value="BANK_CONFIRMATION">Bank CBS Confirmations</option>
            <option value="LIEN_DISCHARGE_ORDER">Lien Discharge Orders</option>
            <option value="OFFICIAL_NOTICE">General Official Notices</option>
          </select>
        </div>
      </div>

      {/* Messages Timeline */}
      <div className="space-y-3">
        {displayedMessages.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No messages found under {activeTab.toLowerCase()} with current filters.
          </div>
        ) : (
          displayedMessages.map((msg) => (
            <div
              key={msg.id}
              className={`p-5 rounded-2xl border transition-all ${
                !msg.is_read && activeTab === 'INBOX'
                  ? 'bg-blue-50/50 border-blue-300 shadow-sm ring-1 ring-blue-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getMessageTypeBadge(msg.message_type)}
                    <h3 className="font-bold text-sm text-slate-900">{msg.subject}</h3>
                    {!msg.is_read && activeTab === 'INBOX' && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>From: <strong className="text-slate-800">{msg.sender_name}</strong></span>
                    <span>&bull;</span>
                    <span>To: <strong className="text-slate-800">{msg.recipient_name}</strong></span>
                    {msg.fdr_number && (
                      <>
                        <span>&bull;</span>
                        <span>FDR: <strong className="font-mono text-blue-900">{msg.fdr_number}</strong></span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date(msg.created_at).toLocaleString()}
                  </span>
                  {!msg.is_read && activeTab === 'INBOX' && (
                    <button
                      onClick={() => handleMarkRead(msg.id)}
                      className="p-1 text-blue-600 hover:text-blue-800 font-semibold"
                      title="Mark as read"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleQuickReply(msg)}
                    className="p-1 text-slate-500 hover:text-blue-600 font-semibold flex items-center gap-1"
                    title="Reply to message"
                  >
                    <Reply className="w-3.5 h-3.5" /> Reply
                  </button>
                </div>
              </div>

              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Compose Official Message Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {isAicte ? 'Dispatch Official Notice to Bank Officer' : 'Dispatch Communication to AICTE Bureau'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Recipient: <strong>{isAicte ? 'Bank Nodal Officer, State Bank of India' : 'AICTE Regulation Bureau Officer'}</strong>
                </p>
              </div>
              <button onClick={() => setIsComposeOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Message Type *</label>
                  <select
                    value={messageType}
                    onChange={(e) => setMessageType(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  >
                    <option value="OFFICIAL_NOTICE">Official Notice</option>
                    <option value="DISCREPANCY_FLAG">Discrepancy Notice &amp; Rectification</option>
                    <option value="VERIFICATION_REQUEST">Urgent Verification Request</option>
                    <option value="LIEN_DISCHARGE_ORDER">Lien Discharge Sanction Notice</option>
                    <option value="BANK_CONFIRMATION">Bank CBS Confirmation &amp; DSC Attestation</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Link to Fixed Deposit Receipt (Optional)</label>
                  <select
                    value={selectedFdrId}
                    onChange={(e) => setSelectedFdrId(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-[11px]"
                  >
                    <option value="">No linked FDR (General Notice)</option>
                    {fdrs.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.fdr_number} &bull; {f.issuing_bank} (₹{(f.bank_confirmed_amount || f.declared_amount).toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Urgent CBS Lien Marking Rectification for Institution #1-102938471"
                  required
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Content / Directive *</label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter detailed notice, regulatory observations, CBS references, or instructions..."
                  required
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500">
                <strong>Audit Compliance:</strong> Dispatching this notice will immediately notify the recipient officer and create an immutable SHA-256 block in the DepositGuard audit ledger.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5 ${
                    isAicte ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting ? 'Dispatching...' : 'Dispatch Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

