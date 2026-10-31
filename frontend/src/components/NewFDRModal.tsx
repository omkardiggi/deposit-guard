import React, { useState } from 'react';
import { 
  Building, 
  Sparkles, 
  Upload, 
  CheckCircle2, 
  AlertTriangle,
  FileText
} from 'lucide-react';
import { Institution } from '../types';
import { api } from '../services/api';

interface NewFDRModalProps {
  isOpen: boolean;
  onClose: () => void;
  institutions: Institution[];
  onRefreshData: () => void;
}

export const NewFDRModal: React.FC<NewFDRModalProps> = ({
  isOpen,
  onClose,
  institutions,
  onRefreshData,
}) => {
  if (!isOpen) return null;

  const [institutionId, setInstitutionId] = useState(institutions[0]?.id || '');
  const [fdrNumber, setFdrNumber] = useState('');
  const [purpose, setPurpose] = useState('Establishment of New Technical Institution (Degree Engg)');
  const [issuingBank, setIssuingBank] = useState('State Bank of India');
  const [branchName, setBranchName] = useState('Commercial Branch');
  const [ifscCode, setIfscCode] = useState('SBIN0000691');
  const [declaredAmount, setDeclaredAmount] = useState<number>(3500000);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [declaredMaturityDate, setDeclaredMaturityDate] = useState('');
  const [tenureMonths, setTenureMonths] = useState<number>(60);
  const [interestRate, setInterestRate] = useState<number>(7.1);
  const [declaredJointHolder, setDeclaredJointHolder] = useState('Jointly with Member Secretary, AICTE, New Delhi');
  const [autoRenewalClause, setAutoRenewalClause] = useState(true);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);

  // Auto calculate maturity date from issue date + tenure
  const calculateMaturity = (issue: string, months: number) => {
    try {
      const d = new Date(issue);
      d.setMonth(d.getMonth() + Number(months));
      setDeclaredMaturityDate(d.toISOString().split('T')[0]);
    } catch (e) {}
  };

  const handleTenureChange = (months: number) => {
    setTenureMonths(months);
    calculateMaturity(issueDate, months);
  };

  const handleSimulateOCR = async () => {
    setOcrLoading(true);
    try {
      const res = await api.simulateOCR('fdr_sample_scan.pdf');
      const fields = res.extracted_fields;
      setFdrNumber(fields.fdr_number);
      setIssuingBank(fields.issuing_bank);
      setBranchName(fields.branch_name);
      setIfscCode(fields.ifsc_code);
      setDeclaredAmount(fields.amount);
      setIssueDate(fields.issue_date);
      setDeclaredMaturityDate(fields.maturity_date);
      setTenureMonths(fields.tenure_months);
      setInterestRate(fields.interest_rate);
      setDeclaredJointHolder(fields.joint_holder);
      setOcrSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        institution_id: institutionId,
        fdr_number: fdrNumber || `FDR-${Date.now().toString().slice(-8)}`,
        purpose,
        issuing_bank: issuingBank,
        branch_name: branchName,
        ifsc_code: ifscCode,
        declared_amount: Number(declaredAmount),
        issue_date: issueDate,
        declared_maturity_date: declaredMaturityDate || new Date(Date.now() + 5 * 365 * 86400000).toISOString().split('T')[0],
        tenure_months: Number(tenureMonths),
        interest_rate: Number(interestRate),
        declared_joint_holder: declaredJointHolder,
        declared_lien: true,
        auto_renewal_clause: autoRenewalClause,
        document_filename: 'uploaded_fdr_instrument.pdf'
      };

      await api.submitFDR(payload);
      onRefreshData();
      onClose();
    } catch (err: any) {
      alert(err.message || 'FDR submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Submit New Fixed Deposit Receipt (FDR)
            </h3>
            <p className="text-xs text-slate-500">
              Mandatory submission under AICTE Approval Process Handbook
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-lg">&times;</button>
        </div>

        {/* AI OCR Auto-Fill Trigger Strip */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="text-blue-900 font-semibold">
              Fast-Track Ingestion: AI Document OCR Extraction
            </span>
          </div>
          <button
            type="button"
            onClick={handleSimulateOCR}
            disabled={ocrLoading}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            {ocrLoading ? 'Extracting Text...' : 'Auto-Fill from FDR Scan'}
          </button>
        </div>

        {ocrSuccess && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>OCR extracted 8 fields with 98.2% confidence. Please review before submission.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Institution Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Institution *</label>
            <select
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
              required
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
            >
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.aicte_id}) &bull; {inst.state}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">FDR Receipt Number *</label>
              <input
                type="text"
                value={fdrNumber}
                onChange={(e) => setFdrNumber(e.target.value)}
                placeholder="e.g. SBI-MUM-2026-902184"
                required
                className="w-full p-2.5 font-mono font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Principal Deposit Amount (INR) *</label>
              <input
                type="number"
                step="0.01"
                value={declaredAmount}
                onChange={(e) => setDeclaredAmount(Number(e.target.value))}
                required
                className="w-full p-2.5 font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Approval Purpose / Norm *</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
            >
              <option value="Establishment of New Technical Institution (Degree Engg)">Establishment of New Technical Institution (Degree Engg)</option>
              <option value="Introduction of New Course / Expansion (PG / Emerging Tech)">Introduction of New Course / Expansion (PG / Emerging Tech)</option>
              <option value="Increase in Student Intake Capacity">Increase in Student Intake Capacity</option>
              <option value="Regulatory Compliance & Norms Maintenance">Regulatory Compliance & Norms Maintenance</option>
              <option value="Change of Site / Location">Change of Site / Location</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Issuing Bank *</label>
              <input
                type="text"
                value={issuingBank}
                onChange={(e) => setIssuingBank(e.target.value)}
                required
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Branch Name *</label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                required
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Branch IFSC *</label>
              <input
                type="text"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value)}
                required
                className="w-full p-2.5 font-mono uppercase bg-white border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tenure (Months) *</label>
              <select
                value={tenureMonths}
                onChange={(e) => handleTenureChange(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
              >
                <option value={36}>36 Months (3 Years)</option>
                <option value={60}>60 Months (5 Years - Standard)</option>
                <option value={96}>96 Months (8 Years)</option>
                <option value={120}>120 Months (10 Years)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Issue Date *</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => {
                  setIssueDate(e.target.value);
                  calculateMaturity(e.target.value, tenureMonths);
                }}
                required
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Maturity Date *</label>
              <input
                type="date"
                value={declaredMaturityDate}
                onChange={(e) => setDeclaredMaturityDate(e.target.value)}
                required
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-blue-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Account Title (Mandatory Joint Clause) *
            </label>
            <input
              type="text"
              value={declaredJointHolder}
              onChange={(e) => setDeclaredJointHolder(e.target.value)}
              required
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <label htmlFor="autoRenCheck" className="text-xs">
              <strong className="block text-slate-900">Auto-Renewal Clause in Bank Instrument</strong>
              <span className="text-[11px] text-slate-500">Ensures non-lapse protection if renewal is delayed.</span>
            </label>
            <input
              type="checkbox"
              id="autoRenCheck"
              checked={autoRenewalClause}
              onChange={(e) => setAutoRenewalClause(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md"
            >
              {submitting ? 'Registering & Generating Token...' : 'Register FDR & Dispatch Bank Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
