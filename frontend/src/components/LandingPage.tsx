import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Building2, 
  Lock, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  LogIn, 
  UserCheck, 
  Landmark, 
  ShieldAlert,
  Clock,
  KeyRound
} from 'lucide-react';
import { api } from '../services/api';

interface LandingPageProps {
  onLoginSuccess: (user: any) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('aicte_officer');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (loginUser?: string, loginPass?: string) => {
    const u = loginUser || username;
    const p = loginPass || password;
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(u, p);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Govt Bar */}
      <div className="bg-slate-950 text-slate-400 text-xs px-6 py-2 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-white tracking-wide">भारत सरकार | Government of India</span>
          <span className="text-slate-700">|</span>
          <span>Ministry of Education &bull; AICTE Regulation Bureau</span>
        </div>
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            IT Act 2000 &bull; Section 4/5 Validated
          </span>
          <span className="text-slate-700">|</span>
          <span>Core Banking System (CBS) Integration</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-12 flex flex-col justify-center space-y-12">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-3.5 py-1.5 rounded-full text-xs font-bold border border-blue-500/20">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Centralized Security Deposit &amp; FDR Portal
            </div>

            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
              DepositGuard
              <span className="block text-2xl md:text-3xl font-extrabold text-blue-400 mt-2">
                Digital Bank Attestation &amp; Institutional FDR Management
              </span>
            </h1>

            <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl">
              Eliminating fragmented physical files, unverified deposit declarations, and missed maturity lapses. DepositGuard empowers <strong>AICTE Regulation Bureau Officers</strong> and <strong>Issuing Bank Nodal Officers</strong> to collaborate in real-time with Class-3 DSC digital attestation, No-Gap Renewal guarantees, and SHA-256 tamper-proof audit trails.
            </p>

            {/* Pillar Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs space-y-1">
                <strong className="text-white block flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Bank DSC Attestation
                </strong>
                <span className="text-slate-400 text-[11px]">Class-3 DSC under CCA India Root CA.</span>
              </div>
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs space-y-1">
                <strong className="text-white block flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  No-Gap Renewal
                </strong>
                <span className="text-slate-400 text-[11px]">Zero broken days of student capital protection.</span>
              </div>
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs space-y-1">
                <strong className="text-white block flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                  Merkle Audit Chain
                </strong>
                <span className="text-slate-400 text-[11px]">Tamper-evident cryptographic ledger.</span>
              </div>
            </div>
          </div>

          {/* Login Card */}
          <div className="lg:col-span-5 bg-slate-800/90 border border-slate-700 p-8 rounded-3xl shadow-2xl space-y-6">
            <div className="border-b border-slate-700 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <LogIn className="w-5 h-5 text-blue-400" />
                Authorized Official Access
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Select your designated role to enter the secure portal.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* 1-Click Fast Login Cards for Both Roles */}
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Select Stakeholder Role (Pre-configured Credentials):
              </div>

              {/* AICTE Officer Card */}
              <div className="p-4 bg-slate-900/90 rounded-2xl border border-blue-500/30 hover:border-blue-500 transition-all flex justify-between items-center group">
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-blue-400 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" />
                    AICTE Regulation Bureau Officer
                  </div>
                  <div className="text-slate-300 font-semibold">Dr. Rajesh Sharma</div>
                  <div className="text-[11px] font-mono text-slate-400">
                    User: <span className="text-white">aicte_officer</span> &bull; Pass: <span className="text-white">password123</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleLogin('aicte_officer', 'password123')}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-md flex items-center gap-1"
                >
                  Sign In <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bank Officer Card */}
              <div className="p-4 bg-slate-900/90 rounded-2xl border border-emerald-500/30 hover:border-emerald-500 transition-all flex justify-between items-center group">
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Landmark className="w-4 h-4" />
                    Issuing Bank Nodal Officer
                  </div>
                  <div className="text-slate-300 font-semibold">S. Ramesh (State Bank of India)</div>
                  <div className="text-[11px] font-mono text-slate-400">
                    User: <span className="text-white">bank_officer</span> &bull; Pass: <span className="text-white">password123</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleLogin('bank_officer', 'password123')}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-md flex items-center gap-1"
                >
                  Sign In <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Standard Manual Login Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-3.5 pt-2 border-t border-slate-700 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                {loading ? 'Authenticating Official Token...' : 'Login with Credentials'}
              </button>
            </form>
          </div>
        </div>

        {/* Feature Highlights for AICTE Officer vs Bank Officer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-800">
          <div className="p-6 bg-slate-800/40 rounded-2xl border border-slate-700 space-y-3">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> AICTE Officer Scope &amp; Responsibilities
            </div>
            <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
              <li>Comprehensive repository oversight across all approved technical institutions.</li>
              <li>Two-tier scrutiny &amp; sanctioning of Lien Release applications.</li>
              <li>Issuing official digitally signed AICTE Lien Discharge Orders with QR verification.</li>
              <li>Triggering automated daily maturity watchdog (60, 30, and 15-day alert horizons).</li>
              <li>Two-way official messaging &amp; discrepancy notice dispatch directly to Bank Nodal Officers.</li>
            </ul>
          </div>

          <div className="p-6 bg-slate-800/40 rounded-2xl border border-slate-700 space-y-3">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <Landmark className="w-4 h-4" /> Issuing Bank Nodal Officer Scope &amp; Responsibilities
            </div>
            <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
              <li>Reviewing 15-day digital verification requests dispatched by technical institutions.</li>
              <li>Validating Core Banking Solution (CBS) ledgers and confirming joint lien to AICTE.</li>
              <li>Applying Class-3 Digital Signature Certificate (DSC) cryptographic attestation.</li>
              <li>Executing Core Banking System lien discharge once official AICTE Sanction Order is received.</li>
              <li>Direct secure communication channel with AICTE Regulation Bureau for prompt resolution.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 text-xs py-4 px-6 text-slate-500 text-center">
        &copy; 2026 All India Council for Technical Education (AICTE), Ministry of Education, Government of India &bull; DepositGuard Portal
      </footer>
    </div>
  );
};
