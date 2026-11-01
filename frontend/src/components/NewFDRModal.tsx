import React, { useState, useRef } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ScanLine,
  Loader2,
  X,
  Eye
} from 'lucide-react';
import { Institution, OcrExtraction, UploadedDocument } from '../types';
import { api } from '../services/api';
import { extractDocumentText } from '../services/extract';
import { InstitutionCombobox } from './InstitutionCombobox';

interface NewFDRModalProps {
  isOpen: boolean;
  onClose: () => void;
  institutions: Institution[];
  onRefreshData: () => void;
}

// Labels for the extraction report; keys match the backend's extracted_fields.
const FIELD_LABELS: Record<string, string> = {
  fdr_number: 'FDR Number',
  issuing_bank: 'Issuing Bank',
  branch_name: 'Branch',
  ifsc_code: 'IFSC',
  amount: 'Amount',
  amount_in_words: 'Amount in Words',
  issue_date: 'Issue Date',
  maturity_date: 'Maturity Date',
  tenure_months: 'Tenure',
  interest_rate: 'Interest Rate',
  joint_holder: 'Joint Holder',
  lien_marked: 'Lien Marked',
};

export const NewFDRModal: React.FC<NewFDRModalProps> = ({
  isOpen,
  onClose,
  institutions,
  onRefreshData,
}) => {
  if (!isOpen) return null;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [institutionId, setInstitutionId] = useState(institutions[0]?.id || '');
  const [fdrNumber, setFdrNumber] = useState('');
  const [purpose, setPurpose] = useState('Establishment of New Technical Institution (Degree Engg)');
  const [issuingBank, setIssuingBank] = useState('');
  const [branchName, setBranchName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [declaredAmount, setDeclaredAmount] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [declaredMaturityDate, setDeclaredMaturityDate] = useState('');
  const [tenureMonths, setTenureMonths] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [declaredJointHolder, setDeclaredJointHolder] = useState('Jointly with Member Secretary, AICTE, New Delhi');
  const [autoRenewalClause, setAutoRenewalClause] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [doc, setDoc] = useState<UploadedDocument | null>(null);
  const [ocr, setOcr] = useState<OcrExtraction | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const calculateMaturity = (issue: string, months: string) => {
    if (!issue || !months) return;
    try {
      const d = new Date(issue);
      d.setMonth(d.getMonth() + Number(months));
      setDeclaredMaturityDate(d.toISOString().split('T')[0]);
    } catch { /* ignore invalid date */ }
  };

  // Apply only the fields the engine actually found — never invent a value.
  const applyExtraction = (result: OcrExtraction) => {
    const f = result.extracted_fields;
    if (f.fdr_number) setFdrNumber(f.fdr_number);
    if (f.issuing_bank) setIssuingBank(f.issuing_bank);
    if (f.branch_name) setBranchName(f.branch_name);
    if (f.ifsc_code) setIfscCode(f.ifsc_code);
    if (f.amount != null) setDeclaredAmount(String(f.amount));
    if (f.issue_date) setIssueDate(f.issue_date);
    if (f.maturity_date) setDeclaredMaturityDate(f.maturity_date);
    if (f.tenure_months != null) setTenureMonths(String(f.tenure_months));
    if (f.interest_rate != null) setInterestRate(String(f.interest_rate));
    if (f.joint_holder) setDeclaredJointHolder(f.joint_holder);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setOcr(null);
    setProgress('Uploading…');
    try {
      // Store the instrument, and let the server extract if it has an OCR
      // runtime available.
      const result: UploadedDocument = await api.uploadDocument(file, true, institutionId);
      setDoc(result);

      let extraction = result.ocr;

      // A serverless backend cannot carry the OCR runtime, so fall back to
      // extracting in the browser and send just the text back for parsing.
      // The parsing rules are identical either way.
      const serverExtracted = !!extraction?.method && (extraction?.detected_count ?? 0) > 0;
      if (!serverExtracted) {
        const local = await extractDocumentText(file, (stage, pct) =>
          setProgress(pct != null ? `${stage} ${pct}%` : stage));
        setProgress('Parsing fields…');
        extraction = await api.parseExtractedText({
          text: local.text,
          filename: file.name,
          method: local.method,
          engine: local.engine,
          pages: local.pages,
          confidence: local.confidence,
          institution_id: institutionId || undefined,
        });
      }

      if (extraction) {
        setOcr(extraction);
        applyExtraction(extraction);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.submitFDR({
        institution_id: institutionId,
        fdr_number: fdrNumber,
        purpose,
        issuing_bank: issuingBank,
        branch_name: branchName,
        ifsc_code: ifscCode,
        declared_amount: Number(declaredAmount),
        issue_date: issueDate,
        declared_maturity_date: declaredMaturityDate,
        tenure_months: Number(tenureMonths),
        interest_rate: Number(interestRate),
        declared_joint_holder: declaredJointHolder,
        declared_lien: true,
        auto_renewal_clause: autoRenewalClause,
        document_filename: doc?.document_filename || null,
        document_path: doc?.document_path || null,
        // Persist exactly what was read off the instrument, for the audit record.
        ocr_extract: ocr ? JSON.stringify(ocr) : null,
      });
      onRefreshData();
      onClose();
    } catch (err: any) {
      alert(err.message || 'FDR submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const detectedEntries = ocr ? Object.entries(ocr.extracted_fields) : [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Submit New Fixed Deposit Receipt (FDR)
            </h3>
            <p className="text-xs text-slate-500">
              Upload the instrument to auto-extract details, then verify before submission.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-lg">&times;</button>
        </div>

        {/* ---------- Document upload + real text extraction ---------- */}
        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <ScanLine className="w-4 h-4 text-blue-600" />
              <div>
                <span className="text-blue-900 font-bold block">Upload FDR Document</span>
                <span className="text-[11px] text-blue-700/80">
                  PDF, PNG, JPG, TIFF &bull; text is read from the file itself
                </span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.bmp"
              onChange={handleFileSelected}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3.5 py-2 rounded-lg text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-50 flex-shrink-0"
            >
              {uploading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Extracting…</>
                : <><Upload className="w-3.5 h-3.5" /> Choose File</>}
            </button>
          </div>

          {uploading && (
            <p className="text-[11px] text-blue-800">
              {progress || 'Reading document…'}
              <span className="block text-blue-700/70">
                First run downloads the OCR engine; later uploads are faster.
              </span>
            </p>
          )}

          {uploadError && (
            <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-800 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {doc && (
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs">
              <span className="flex items-center gap-2 text-slate-800 font-medium truncate">
                <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="truncate">{doc.document_filename}</span>
                <span className="text-slate-400 flex-shrink-0">({(doc.size_bytes / 1024).toFixed(0)} KB)</span>
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={api.documentUrl(doc.document_path)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </a>
                <button
                  type="button"
                  onClick={() => { setDoc(null); setOcr(null); }}
                  className="text-slate-400 hover:text-rose-600"
                  title="Remove attached document"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Extraction report — shows what was and was not found */}
          {ocr && (
            <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Extracted {ocr.detected_count}/{ocr.total_fields} fields
                </span>
                <span className="text-slate-500">
                  {ocr.method === 'PDF_TEXT_LAYER' ? 'PDF text layer' : 'OCR'}
                  {ocr.engine ? ` · ${ocr.engine}` : ''}
                </span>
                {ocr.ocr_confidence != null && (
                  <span className="text-slate-500">
                    confidence {(ocr.ocr_confidence * 100).toFixed(1)}%
                  </span>
                )}
                {ocr.pages > 0 && <span className="text-slate-500">{ocr.pages} page(s)</span>}
              </div>

              {ocr.warning && (
                <div className="text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 text-[11px]">
                  {ocr.warning}
                </div>
              )}

              {/* Does this document actually belong to the selected institution? */}
              {ocr.institution_match && (() => {
                const m = ocr.institution_match!;
                const style =
                  m.verdict === 'MATCH' ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : m.verdict === 'PARTIAL' ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : m.verdict === 'NO_MATCH' ? 'bg-rose-50 border-rose-400 text-rose-900'
                        : 'bg-slate-50 border-slate-300 text-slate-700';
                const Icon = m.verdict === 'MATCH' ? CheckCircle2 : AlertTriangle;
                return (
                  <div className={`rounded-lg border p-2.5 ${style}`}>
                    <div className="flex items-start gap-2">
                      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <strong className="block">
                          {m.verdict === 'MATCH' ? 'Document matches the selected institution'
                            : m.verdict === 'PARTIAL' ? 'Institution match is uncertain'
                              : m.verdict === 'NO_MATCH' ? 'Institution MISMATCH — this document may belong elsewhere'
                                : 'Institution could not be verified'}
                        </strong>
                        <span className="block text-[11px] mt-0.5">{m.reason}</span>
                        <span className="block text-[11px] mt-0.5 opacity-80">
                          Filing against: <strong>{m.expected_institution}</strong>
                        </span>
                        {m.signals.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {m.signals.map((sig, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-white/70 border border-current/20 text-[10px] font-semibold">
                                {sig.type.replace(/_/g, ' ')}: {sig.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex flex-wrap gap-1.5">
                {detectedEntries.map(([key, value]) => {
                  const found = value !== null && value !== '';
                  return (
                    <span
                      key={key}
                      title={found ? String(value) : 'Not detected — enter manually'}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        found
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                      }`}
                    >
                      {FIELD_LABELS[key] || key}
                    </span>
                  );
                })}
              </div>

              <p className="text-[11px] text-amber-700">
                Auto-filled from the document — please verify every value before submitting.
              </p>

              {ocr.raw_text && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowRawText(v => !v)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    {showRawText ? 'Hide' : 'Show'} extracted text
                  </button>
                  {showRawText && (
                    <pre className="mt-1.5 p-2 bg-slate-900 text-emerald-300 rounded text-[10px] max-h-40 overflow-auto whitespace-pre-wrap">
                      {ocr.raw_text}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Institution *</label>
            <InstitutionCombobox
              institutions={institutions}
              value={institutionId}
              onChange={(id) => setInstitutionId(id)}
              onInstitutionAdded={onRefreshData}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">FDR Receipt Number *</label>
              <input
                type="text"
                value={fdrNumber}
                onChange={(e) => setFdrNumber(e.target.value)}
                placeholder="As printed on the instrument"
                required
                className="w-full p-2.5 font-mono font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Principal Deposit Amount (INR) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={declaredAmount}
                onChange={(e) => setDeclaredAmount(e.target.value)}
                placeholder="e.g. 2500000"
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
              <option value="Regulatory Compliance & Norms Maintenance">Regulatory Compliance &amp; Norms Maintenance</option>
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
                placeholder="Bank name"
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
                placeholder="Branch"
                required
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Branch IFSC *</label>
              <input
                type="text"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                placeholder="SBIN0000123"
                pattern="[A-Za-z]{4}0[A-Za-z0-9]{6}"
                title="IFSC format: 4 letters, 0, then 6 alphanumerics"
                required
                className="w-full p-2.5 font-mono uppercase bg-white border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tenure (Months) *</label>
              <input
                type="number"
                min="1"
                value={tenureMonths}
                onChange={(e) => {
                  setTenureMonths(e.target.value);
                  calculateMaturity(issueDate, e.target.value);
                }}
                placeholder="60"
                required
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Interest Rate (%) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="7.10"
                required
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
              />
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
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? 'Registering & Generating Token…' : 'Register FDR & Dispatch Bank Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
