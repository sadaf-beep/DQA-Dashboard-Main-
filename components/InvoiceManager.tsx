
import React, { useState, useRef } from 'react';
import { Invoice, User, UserRole, InvoiceFileMeta } from '../types';
import { Button, Card, Badge } from './Common';

interface InvoiceManagerProps {
  invoices: Invoice[];
  currentUser: User;
  users: User[]; // Added users prop
  onAddInvoice: (invoice: Invoice) => void;
  onUpdateInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
}

// Sub-component to handle local state for card assignment controls
const InvoiceAssignmentControl: React.FC<{
  invoice: Invoice;
  users: User[]; // Added users prop
  onAssign: (invoice: Invoice, assigneeId: string, startDate: string, dueDate: string) => void;
  onUpdate: (invoice: Invoice) => void;
  onDelete: (id: string) => void;
}> = ({ invoice, users, onAssign, onUpdate, onDelete }) => {
  // Default start date to today
  const [startDate, setStartDate] = useState(invoice.startDate || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(invoice.dueDate || '');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
     const val = e.target.value;
     if (val) {
        onAssign(invoice, val, startDate || new Date().toISOString().split('T')[0], dueDate);
     }
  };

  const isFinalized = invoice.status === 'COMPLETED' || invoice.status === 'UPLOADED';

  return (
    <div className="space-y-3">
      {invoice.status === 'COMPLETED' && (
         <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg mb-3">
             <p className="text-xs text-indigo-800 font-medium mb-2">Agent has completed processing.</p>
             <Button 
                onClick={() => onUpdate({ ...invoice, status: 'UPLOADED' })} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200"
             >
                Confirm Upload to Beam
             </Button>
         </div>
      )}
      
      {invoice.status === 'UPLOADED' && (
         <div className="p-2 bg-green-50 border border-green-100 rounded-lg mb-3 text-center">
             <span className="text-xs font-bold text-green-700 flex items-center justify-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Upload Confirmed
             </span>
         </div>
      )}

      <div className="grid grid-cols-2 gap-2">
         <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Start Date</label>
            <input 
              type="date" 
              className="w-full mt-1 border border-slate-300 rounded-md text-xs py-1 px-1"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              disabled={isFinalized}
            />
         </div>
         <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Due Date</label>
            <input 
              type="date" 
              className="w-full mt-1 border border-slate-300 rounded-md text-xs py-1 px-1"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              disabled={isFinalized}
            />
         </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Assign Agent</label>
        <select 
          className="w-full mt-1 border border-slate-300 rounded-md text-sm py-1.5 px-2 focus:ring-2 focus:ring-blue-500"
          value={invoice.assigneeId || ''}
          onChange={handleChange}
          disabled={isFinalized}
        >
          <option value="">Select Agent...</option>
          {users.filter(u => u.role === UserRole.AGENT).map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
      <button 
        onClick={() => onDelete(invoice.id)}
        className="text-xs text-red-500 hover:text-red-700 font-medium"
      >
        Delete Slot
      </button>
    </div>
  );
};

const InvoiceManager: React.FC<InvoiceManagerProps> = ({ invoices, currentUser, users, onAddInvoice, onUpdateInvoice, onDeleteInvoice }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // New Invoice Form State
  const [newRefName, setNewRefName] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [newAssignee, setNewAssignee] = useState('');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDueDate, setNewDueDate] = useState('');

  // Agent Upload State (Map keyed by invoice ID to handle multiple cards)
  const [agentUploads, setAgentUploads] = useState<Record<string, File>>({});

  const fileInputPdfRef = useRef<HTMLInputElement>(null);
  const fileInputCsvRef = useRef<HTMLInputElement>(null);

  const isManager = currentUser.role === UserRole.MANAGER;

  // Filter invoices for Agent view
  const visibleInvoices = isManager 
    ? invoices 
    : invoices.filter(inv => inv.assigneeId === currentUser.id);

  // Helper to read file content
  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      // Read PDF as DataURL (base64) to preserve binary, CSV as Text
      if (file.type.includes('pdf') || file.name.endsWith('.pdf')) {
          reader.readAsDataURL(file);
      } else {
          reader.readAsText(file);
      }
    });
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !newRefName) return;

    setIsProcessing(true);
    
    try {
        // Read file contents
        const pdfContent = await readFile(pdfFile);
        const csvContent = csvFile ? await readFile(csvFile) : undefined;

        const assignee = users.find(u => u.id === newAssignee);
        const effectiveStartDate = newStartDate || new Date().toISOString().split('T')[0];

        const newInvoice: Invoice = {
          id: `inv-slot-${Date.now()}`,
          referenceName: newRefName,
          status: 'PENDING',
          pdfFile: {
            name: pdfFile.name,
            size: (pdfFile.size / 1024 / 1024).toFixed(2) + ' MB',
            type: 'pdf',
            content: pdfContent
          },
          csvFile: csvFile ? {
            name: csvFile.name,
            size: (csvFile.size / 1024 / 1024).toFixed(2) + ' MB',
            type: 'csv',
            content: csvContent
          } : undefined,
          assigneeId: assignee?.id,
          assigneeName: assignee?.name,
          startDate: effectiveStartDate,
          dueDate: newDueDate,
          isPreProcessed: !!csvFile,
          createdAt: Date.now()
        };

        onAddInvoice(newInvoice);
        setIsModalOpen(false);
        resetForm();
    } catch (err) {
        console.error(err);
        alert("Failed to read file contents.");
    } finally {
        setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setNewRefName('');
    setPdfFile(null);
    setCsvFile(null);
    setNewAssignee('');
    setNewStartDate(new Date().toISOString().split('T')[0]);
    setNewDueDate('');
    if (fileInputPdfRef.current) fileInputPdfRef.current.value = '';
    if (fileInputCsvRef.current) fileInputCsvRef.current.value = '';
  };

  const handleAssignChange = (invoice: Invoice, assigneeId: string, startDate: string, dueDate: string) => {
    const assignee = users.find(u => u.id === assigneeId);
    onUpdateInvoice({
      ...invoice,
      assigneeId: assigneeId,
      assigneeName: assignee?.name,
      startDate: startDate || new Date().toISOString().split('T')[0],
      dueDate: dueDate,
      status: 'ASSIGNED'
    });
  };

  const handleAgentFileSelect = (invoiceId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAgentUploads(prev => ({ ...prev, [invoiceId]: file }));
    }
  };

  const handleMarkComplete = async (invoice: Invoice) => {
    const finalFile = agentUploads[invoice.id];
    
    // Strict validation: Agent must upload file
    if (!finalFile && !invoice.finalCsvFile) {
      alert("Please upload the final processed CSV file before completing this task.");
      return;
    }

    // Don't re-process if they are just clicking complete again without changing file
    if (!finalFile && invoice.finalCsvFile) {
        onUpdateInvoice({ ...invoice, status: 'COMPLETED', completedAt: Date.now() });
        return;
    }

    try {
        const finalContent = await readFile(finalFile);

        const updatedInvoice = {
          ...invoice,
          status: 'COMPLETED' as const,
          completedAt: Date.now(),
          finalCsvFile: {
            name: finalFile.name,
            size: (finalFile.size / 1024 / 1024).toFixed(2) + ' MB',
            type: 'csv' as const,
            content: finalContent
          }
        };

        onUpdateInvoice(updatedInvoice);
        
        // Clear upload state
        const newUploads = { ...agentUploads };
        delete newUploads[invoice.id];
        setAgentUploads(newUploads);

    } catch (err) {
        alert("Failed to process the uploaded file.");
    }
  };

  const handleDownload = (file: InvoiceFileMeta) => {
    const link = document.createElement('a');
    link.download = file.name;

    if (file.content) {
        // If we have actual stored content, use it
        if (file.type === 'pdf') {
             // PDF stored as DataURL
             link.href = file.content;
        } else {
             // CSV stored as Text
             const blob = new Blob([file.content], { type: 'text/csv' });
             link.href = URL.createObjectURL(blob);
        }
    } else {
        // Fallback Mock
        const content = file.type === 'csv' 
          ? `Reference,Date,Status,Notes\nREF-001,2024-01-01,Confirmed,Sample data from ${file.name}\nREF-002,2024-01-02,Pending,More mock data`
          : `%PDF-1.4\n%... Mock PDF content for ${file.name} ...`;
        
        const blob = new Blob([content], { type: file.type === 'csv' ? 'text/csv' : 'application/pdf' });
        link.href = URL.createObjectURL(blob);
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (file.content && file.type === 'pdf') {
        // DataURL, no cleanup needed
    } else {
        URL.revokeObjectURL(link.href);
    }
  };

  return (
    <div className="h-full flex flex-col relative">
       {isProcessing && (
        <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center backdrop-blur-sm rounded-xl">
           <div className="flex flex-col items-center">
             <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
             <p className="text-slate-600 font-medium">Processing File...</p>
           </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Studio Invoices</h2>
           <p className="text-slate-500 text-sm">Upload, assign, and process invoice documents.</p>
        </div>
        {isManager && (
          <Button onClick={() => setIsModalOpen(true)}>
            + New Invoice Slot
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-6">
        {visibleInvoices.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
             <div className="text-slate-400 mb-2">No invoices found.</div>
             {isManager && <p className="text-sm text-blue-500 cursor-pointer hover:underline" onClick={() => setIsModalOpen(true)}>Create the first slot</p>}
          </div>
        )}

        {visibleInvoices.map(invoice => (
          <Card key={invoice.id} className={`p-5 flex flex-col relative overflow-hidden ${invoice.status === 'UPLOADED' ? 'bg-green-50/50 opacity-90' : invoice.status === 'COMPLETED' ? 'bg-indigo-50/20' : ''}`}>
            {/* Status Strip */}
            <div className={`absolute top-0 left-0 w-1.5 h-full ${
              invoice.status === 'UPLOADED' ? 'bg-purple-600' :
              invoice.status === 'COMPLETED' ? 'bg-green-500' : 
              invoice.status === 'ASSIGNED' ? 'bg-blue-500' : 'bg-slate-300'
            }`}></div>
            
            <div className="pl-3 mb-4">
              <div className="flex justify-between items-start">
                 <h3 className="font-bold text-slate-800 text-lg">{invoice.referenceName}</h3>
                 <Badge color={
                    invoice.status === 'UPLOADED' ? 'blue' : 
                    invoice.status === 'COMPLETED' ? 'green' : 
                    invoice.status === 'ASSIGNED' ? 'blue' : 'gray'
                 }>
                   {invoice.status}
                 </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1">Created: {new Date(invoice.createdAt).toLocaleDateString()}</p>
              {invoice.dueDate && (
                 <p className="text-xs text-red-500 mt-1 font-medium">Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
              )}
              
              {invoice.isPreProcessed && (
                 <div className="mt-2">
                   <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200">
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                     Pre-processed
                   </span>
                 </div>
              )}
            </div>

            {/* Files Section */}
            <div className="pl-3 space-y-3 mb-6 flex-1">
               <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Input Files</div>
               
               {/* PDF File */}
               <div className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200 group">
                  <div className="flex items-center gap-2 overflow-hidden">
                     <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                     <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{invoice.pdfFile.name}</p>
                        <p className="text-xs text-slate-400">{invoice.pdfFile.size}</p>
                     </div>
                  </div>
                  <button onClick={() => handleDownload(invoice.pdfFile)} className="text-slate-400 hover:text-blue-600" title="Download Original PDF">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </button>
               </div>

               {/* CSV File */}
               {invoice.csvFile && (
                 <div className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200 group">
                    <div className="flex items-center gap-2 overflow-hidden">
                       <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                       <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{invoice.csvFile.name}</p>
                          <p className="text-xs text-slate-400">{invoice.csvFile.size}</p>
                       </div>
                    </div>
                    <button onClick={() => handleDownload(invoice.csvFile!)} className="text-slate-400 hover:text-blue-600" title="Download Pre-processed CSV">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>
                 </div>
               )}

               {/* Final Deliverable Section */}
               {invoice.finalCsvFile && (
                 <>
                   <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-4 mb-2">Final Deliverable</div>
                   <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200 group">
                      <div className="flex items-center gap-2 overflow-hidden">
                         <svg className="w-6 h-6 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                         <div className="min-w-0">
                            <p className="text-sm font-medium text-green-800 truncate">{invoice.finalCsvFile.name}</p>
                            <p className="text-xs text-green-600">{invoice.finalCsvFile.size}</p>
                         </div>
                      </div>
                      <button onClick={() => handleDownload(invoice.finalCsvFile!)} className="text-green-600 hover:text-green-800" title="Download Final CSV">
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </button>
                   </div>
                 </>
               )}
            </div>

            {/* Actions Footer */}
            <div className="pl-3 mt-auto pt-4 border-t border-slate-100">
               {isManager ? (
                 <InvoiceAssignmentControl 
                   invoice={invoice} 
                   users={users}
                   onAssign={handleAssignChange}
                   onUpdate={onUpdateInvoice}
                   onDelete={onDeleteInvoice} 
                 />
               ) : (
                 <div className="space-y-3">
                   {invoice.status !== 'COMPLETED' && invoice.status !== 'UPLOADED' ? (
                     <>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Upload Final CSV <span className="text-red-500">*</span></label>
                          <input 
                            type="file"
                            accept=".csv"
                            onChange={(e) => handleAgentFileSelect(invoice.id, e)}
                            className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                          />
                        </div>
                        <Button onClick={() => handleMarkComplete(invoice)} className="w-full" disabled={!agentUploads[invoice.id]}>
                          Submit & Complete
                        </Button>
                     </>
                   ) : (
                     <div className="text-center">
                       <span className="text-sm text-green-600 font-medium flex items-center justify-center gap-1">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                         {invoice.status === 'UPLOADED' ? 'Processing Complete' : 'Sent to Manager'}
                       </span>
                     </div>
                   )}
                 </div>
               )}
            </div>
          </Card>
        ))}
      </div>

      {/* New Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Create Invoice Slot</h3>
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Reference Name</label>
                   <input 
                     required 
                     type="text" 
                     placeholder="e.g. Studio X - Batch 4"
                     className="w-full border border-slate-300 rounded-lg px-3 py-2"
                     value={newRefName}
                     onChange={e => setNewRefName(e.target.value)}
                   />
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Original Invoice (PDF) <span className="text-red-500">*</span></label>
                   <input 
                     required 
                     type="file" 
                     accept=".pdf"
                     ref={fileInputPdfRef}
                     className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                     onChange={e => setPdfFile(e.target.files?.[0] || null)}
                   />
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Pre-processed Data (CSV)</label>
                   <input 
                     type="file" 
                     accept=".csv"
                     ref={fileInputCsvRef}
                     className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                     onChange={e => setCsvFile(e.target.files?.[0] || null)}
                   />
                   <p className="text-xs text-slate-400 mt-1">Attaching a CSV will automatically tag this as "Pre-processed".</p>
                </div>

                <div className="border-t border-slate-100 pt-4">
                   <p className="text-sm font-semibold text-slate-700 mb-3">Assignment (Optional)</p>
                   
                   <div className="grid grid-cols-2 gap-3 mb-3">
                     <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
                        <input 
                          type="date" 
                          className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
                          value={newStartDate}
                          onChange={e => setNewStartDate(e.target.value)}
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Due Date</label>
                        <input 
                          type="date" 
                          className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
                          value={newDueDate}
                          onChange={e => setNewDueDate(e.target.value)}
                        />
                     </div>
                   </div>

                   <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Agent</label>
                      <select 
                        className="w-full border border-slate-300 rounded-lg px-3 py-2"
                        value={newAssignee}
                        onChange={e => setNewAssignee(e.target.value)}
                      >
                        <option value="">Do not assign yet</option>
                        {users.filter(u => u.role === UserRole.AGENT).map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                   </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                   <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                   <Button type="submit">Create Slot</Button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceManager;
