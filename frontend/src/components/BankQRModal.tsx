import React, { useState, useEffect } from 'react';
import { QrCode, Copy, Check, ExternalLink, X, Clock, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

interface BankQRModalProps {
  token: string | null;
  fdrNumber: string;
  onClose: () => void;
  onNavigateToBankDesk: (token: string) => void;
}

export const BankQRModal: React.FC<BankQRModalProps> = ({
  token,
  fdrNumber,
  onClose,
  onNavigateToBankDesk,
}) => {
  if (!token) return null;

  const [qrData, setQrData] = useState<{ qr_image_data_uri: string; verification_url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchQR = async () => {
      setLoading(true);
      try {
        const data = await api.getTokenQR(token);
        setQrData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQR();
  }, [token]);

  const handleCopy = () => {
    if (qrData) {
      navigator.clipboard.writeText(qrData.verification_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl text-center space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-left">
            <QrCode className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-900">One-Time Bank Request QR</h3>
              <p className="text-[11px] text-slate-500 font-mono">FDR #{fdrNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block shadow-inner">
          {loading ? (
            <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
              Generating QR Code...
            </div>
          ) : qrData ? (
            <img 
              src={qrData.qr_image_data_uri} 
              alt="Bank Verification QR Code" 
              className="w-48 h-48 mx-auto rounded-lg shadow-sm"
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-xs text-rose-500">
              Failed to load QR
            </div>
          )}
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-center gap-1.5 text-amber-700 bg-amber-50 py-1.5 px-3 rounded-lg border border-amber-200 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>Validity: 15 Days from Dispatched Date</span>
          </div>

          <p className="text-slate-500 text-[11px] leading-relaxed">
            The issuing bank branch manager or nodal officer scans this QR code or accesses the secure link to confirm the instrument and sign with DSC.
          </p>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleCopy}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Link Copied!' : 'Copy Direct URL'}
            </button>
            <button
              onClick={() => {
                onNavigateToBankDesk(token);
                onClose();
              }}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Bank Desk
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

