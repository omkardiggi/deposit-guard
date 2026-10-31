import React from 'react';
import { 
  Bell, 
  X, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  Clock,
  CheckCheck
} from 'lucide-react';
import { NotificationAlert } from '../types';

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: NotificationAlert[];
  onMarkRead: (id: string) => void;
  onRunScheduler: () => void;
  isSchedulerRunning: boolean;
  onSelectFDR: (fdrId: string) => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onMarkRead,
  onRunScheduler,
  isSchedulerRunning,
  onSelectFDR,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Smart Alerts &amp; Maturity Watch
              </h3>
              <p className="text-[11px] text-slate-500">60 &bull; 30 &bull; 15 Day Escalation Engine</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trigger scheduler strip */}
        <div className="p-4 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between text-xs">
          <div>
            <strong className="block text-blue-950 font-bold">Daily Watchdog Routine</strong>
            <span className="text-[11px] text-blue-800">Scans all instruments against maturity horizons</span>
          </div>
          <button
            onClick={onRunScheduler}
            disabled={isSchedulerRunning}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <Play className={`w-3 h-3 fill-current ${isSchedulerRunning ? 'animate-spin' : ''}`} />
            {isSchedulerRunning ? 'Running...' : 'Run Watch'}
          </button>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {alerts.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
              No active alerts. All deposits conform to AICTE timelines.
            </div>
          ) : (
            alerts.map(a => {
              const isCritical = a.severity === 'CRITICAL';
              const isWarning = a.severity === 'WARNING';
              const isSuccess = a.severity === 'SUCCESS';

              return (
                <div
                  key={a.id}
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                    a.is_read ? 'opacity-60 bg-white border-slate-200' :
                    isCritical ? 'bg-rose-50/80 border-rose-300' :
                    isWarning ? 'bg-amber-50/80 border-amber-300' :
                    isSuccess ? 'bg-emerald-50/80 border-emerald-300' : 'bg-blue-50/80 border-blue-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`font-bold flex items-center gap-1 ${
                      isCritical ? 'text-rose-900' : isWarning ? 'text-amber-900' : isSuccess ? 'text-emerald-900' : 'text-blue-900'
                    }`}>
                      {isCritical && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                      {isWarning && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                      {isSuccess && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                      {a.title}
                    </span>
                    {!a.is_read && (
                      <button
                        onClick={() => onMarkRead(a.id)}
                        title="Mark as read"
                        className="text-slate-400 hover:text-slate-600 ml-2"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-slate-700 text-[11px] leading-relaxed">{a.message}</p>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-200/50">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {a.fdr_id && (
                      <button
                        onClick={() => {
                          onSelectFDR(a.fdr_id!);
                          onClose();
                        }}
                        className="text-blue-700 font-bold hover:underline"
                      >
                        Inspect FDR &rarr;
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

