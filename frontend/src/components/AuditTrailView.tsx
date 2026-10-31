import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  FileCode, 
  History, 
  ArrowDown, 
  Key, 
  Wrench,
  RotateCcw
} from 'lucide-react';
import { AuditBlock, User } from '../types';
import { api } from '../services/api';

interface AuditTrailViewProps {
  currentUser: User;
  refreshKey?: number;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ currentUser, refreshKey = 0 }) => {
  const [blocks, setBlocks] = useState<AuditBlock[]>([]);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const fetchChain = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditChain(100);
      setBlocks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const result = await api.verifyAuditChain();
      setVerificationResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  const handleSimulateTamper = async (blockIndex: number) => {
    setSimulating(true);
    try {
      await api.tamperAuditBlock(blockIndex);
      await fetchChain();
      await handleVerify();
    } catch (err: any) {
      alert(err.message || 'Tamper simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  const handleRestoreBlock = async (blockIndex: number) => {
    setSimulating(true);
    try {
      await api.restoreAuditBlock(blockIndex);
      await fetchChain();
      await handleVerify();
    } catch (err: any) {
      alert(err.message || 'Restore failed');
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    fetchChain();
    handleVerify();
  }, [refreshKey]);

  const isChainValid = verificationResult?.is_valid;

  return (
    <div className="space-y-6">
      {/* Top Banner & Cryptographic Status */}
      <div className={`p-6 rounded-2xl border text-white shadow-md relative overflow-hidden transition-colors ${
        isChainValid ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 border-slate-800' : 'bg-gradient-to-r from-red-950 via-rose-900 to-slate-950 border-red-700'
      }`}>
        <div className="relative z-10 flex flex-wrap justify-between items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-2 bg-white/10 backdrop-blur-sm border border-white/20">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>SHA-256 Merkle-Chained Ledger &bull; Haber &amp; Stornetta Standard</span>
            </div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              Tamper-Proof Audit Trail &amp; CAG Oversight
              {isChainValid ? (
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 100% Cryptographically Verified
                </span>
              ) : (
                <span className="text-xs bg-rose-500 text-white font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" /> TAMPERING DETECTED!
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Every deposit submission, bank DSC confirmation, scrutiny approval, and lien discharge is sequentially hash-chained. Modifying any database row breaks the cryptographic mathematical invariant across all subsequent blocks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <ShieldCheck className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
              {verifying ? 'Recalculating Hashes...' : 'Re-verify Entire Chain'}
            </button>
            <button
              onClick={fetchChain}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-3 py-2.5 rounded-xl text-xs border border-slate-700"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Verification Report Alert Box */}
      {verificationResult && (
        <div className={`p-4 rounded-xl border text-xs font-mono flex items-start justify-between gap-4 ${
          isChainValid ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-rose-50 border-rose-400 text-rose-950'
        }`}>
          <div className="space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              {isChainValid ? <ShieldCheck className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 text-rose-600" />}
              {verificationResult.message}
            </div>
            {verificationResult.tampered_block_index !== null && (
              <div className="text-rose-800 font-bold bg-white/60 p-2 rounded border border-rose-300">
                &bull; Violation at Block #{verificationResult.tampered_block_index}: {verificationResult.error_detail}
              </div>
            )}
            <div className="text-[11px] text-slate-600">
              Total Verified Blocks: <strong>{verificationResult.total_blocks}</strong> &bull; Latest Hash Tip: <span className="text-slate-800 font-semibold">{verificationResult.latest_block_hash?.slice(0, 24)}...</span>
            </div>
          </div>

          {/* If tampered, provide 1-click restore */}
          {!isChainValid && verificationResult.tampered_block_index !== null && (
            <button
              onClick={() => handleRestoreBlock(verificationResult.tampered_block_index)}
              disabled={simulating}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex-shrink-0 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore Original Block
            </button>
          )}
        </div>
      )}

      {/* Interactive Tamper-Evidence Testing Cockpit */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs flex flex-wrap justify-between items-center gap-4">
        <div>
          <span className="font-bold text-slate-900 flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-amber-600" />
            Official Cryptographic Tamper-Evidence Testing:
          </span>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Simulate a database intrusion altering deposit records directly in SQL to verify DepositGuard's tamper-detection engine.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {blocks.slice(0, 3).map(b => (
            <button
              key={b.block_index}
              onClick={() => handleSimulateTamper(b.block_index)}
              disabled={simulating}
              className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
            >
              Tamper Block #{b.block_index}
            </button>
          ))}
        </div>
      </div>

      {/* Hash Chained Blocks Timeline */}
      <div className="space-y-4">
        {blocks.map((block, idx) => {
          const isGenesis = block.block_index === 0;
          const isExpanded = expandedIndex === block.block_index;

          return (
            <div key={block.block_index} className="relative">
              {/* Connector line */}
              {idx < blocks.length - 1 && (
                <div className="absolute left-6 top-14 bottom-[-16px] w-0.5 bg-slate-300 z-0"></div>
              )}

              <div className="relative z-10 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isGenesis ? 'bg-amber-100 text-amber-900 ring-2 ring-amber-400' : 'bg-blue-100 text-blue-900'
                    }`}>
                      #{block.block_index}
                    </div>
                    <div>
                      <span className="font-bold text-sm text-slate-900">{block.action}</span>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>Actor: <strong className="text-slate-700">{block.actor_name}</strong> ({block.actor_role})</span>
                        <span>&bull;</span>
                        <span>Entity: {block.entity_type} ({block.entity_id})</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] font-mono text-slate-500">
                      {new Date(block.timestamp).toLocaleString()}
                    </span>
                    <button
                      onClick={() => setExpandedIndex(isExpanded ? null : block.block_index)}
                      className="block text-[11px] text-blue-600 hover:text-blue-800 font-semibold mt-0.5 ml-auto"
                    >
                      {isExpanded ? 'Hide Payload' : 'Inspect Raw Hashes'}
                    </button>
                  </div>
                </div>

                {/* Cryptographic Hashes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl font-mono text-[11px] border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Previous Hash Link</span>
                    <span className="text-slate-700 truncate block" title={block.previous_hash}>
                      {block.previous_hash.slice(0, 20)}...
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Payload Hash (SHA-256)</span>
                    <span className="text-slate-700 truncate block" title={block.payload_hash}>
                      {block.payload_hash.slice(0, 20)}...
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Block Hash (Header)</span>
                    <span className="text-blue-700 font-bold truncate block" title={block.block_hash}>
                      {block.block_hash.slice(0, 20)}...
                    </span>
                  </div>
                </div>

                {/* Expanded JSON Details */}
                {isExpanded && (
                  <div className="mt-3 p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto">
                    <div className="text-slate-400 text-[10px] uppercase mb-1 font-sans font-bold">Signed Payload Contents:</div>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(JSON.parse(block.details), null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

