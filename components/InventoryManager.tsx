
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { InventoryFile, InventoryItem, InventoryStatus, UserRole, User, Task, TaskPriority, TaskType, TaskStatus } from '../types';
import { Button, Card, Badge } from './Common';

interface InventoryManagerProps {
  inventories: InventoryFile[];
  currentUser: User;
  users: User[];
  onUpload: (file: InventoryFile) => void;
  onDeleteFile: (fileId: string) => void;
  onUpdateItems: (fileId: string, items: InventoryItem[]) => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
}

const COLUMNS = [
    { key: 'productId', label: 'Product ID', width: 'min-w-[150px]' },
    { key: 'mfr', label: 'MFR', width: 'min-w-[120px]' },
    { key: 'model', label: 'Model', width: 'min-w-[120px]' },
    { key: 'productName', label: 'Name', width: 'min-w-[200px]' },
    { key: 'studio', label: 'Studio', width: 'min-w-[120px]' },
    { key: 'csvStatus', label: 'Status', width: 'min-w-[120px]' },
    { key: 'status', label: 'Workflow', width: 'min-w-[140px]' },
    { key: 'assigneeName', label: 'Assignee', width: 'min-w-[140px]' },
];

const InventoryManager: React.FC<InventoryManagerProps> = ({ inventories, currentUser, users, onUpload, onDeleteFile, onUpdateItems, onAddTask }) => {
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  
  // --- Google Sheets Style Filtering State ---
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);

  // --- Assignment Modal State ---
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignType, setAssignType] = useState<'AUGMENTATION' | 'QA'>('AUGMENTATION');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [assignStartDate, setAssignStartDate] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');

  const activeInventory = inventories.find(inv => inv.id === activeFileId) || null;
  const isManager = currentUser.role === UserRole.MANAGER;

  // --- FILTER & SORT LOGIC ---
  const filteredData = useMemo(() => {
    if (!activeInventory) return [];
    let data = activeInventory.data;

    // 1. Permission Check
    if (!isManager) {
        data = data.filter(item => item.assigneeId === currentUser.id);
    }

    // 2. Apply Column Filters
    const activeKeys = Object.keys(columnFilters);
    if (activeKeys.length > 0) {
        data = data.filter(item => {
            return activeKeys.every(key => {
                const allowedSet = columnFilters[key];
                if (!allowedSet) return true;
                const val = String(item[key as keyof InventoryItem] || '');
                return allowedSet.has(val);
            });
        });
    }

    // 3. Apply Sorting
    if (sortConfig) {
        data = [...data].sort((a, b) => {
            const valA = String(a[sortConfig.key as keyof InventoryItem] || '');
            const valB = String(b[sortConfig.key as keyof InventoryItem] || '');
            
            // Numeric sort check
            const numA = parseFloat(valA);
            const numB = parseFloat(valB);
            if (!isNaN(numA) && !isNaN(numB) && isFinite(numA) && isFinite(numB)) {
                 return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
            }

            return sortConfig.direction === 'asc' 
                ? valA.localeCompare(valB, undefined, { sensitivity: 'base' })
                : valB.localeCompare(valA, undefined, { sensitivity: 'base' });
        });
    }

    return data;
  }, [activeInventory, columnFilters, sortConfig, isManager, currentUser.id]);

  useEffect(() => {
    if (!activeFileId && inventories.length > 0) {
      setActiveFileId(inventories[0].id);
      setColumnFilters({});
      setSortConfig(null);
      setSelectedIds(new Set());
    }
  }, [inventories, activeFileId]);

  useEffect(() => {
    const agents = users.filter(u => u.role === UserRole.AGENT);
    if (agents.length > 0 && !selectedAssignee) {
      setSelectedAssignee(agents[0].id);
    }
  }, [users, selectedAssignee]);

  // --- HANDLERS ---

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
      setSortConfig({ key, direction });
      setActiveFilterCol(null); // Close dropdown
  };

  const handleApplyFilter = (key: string, selectedValues: Set<string> | null) => {
      setColumnFilters(prev => {
          const next = { ...prev };
          if (selectedValues === null) {
              delete next[key];
          } else {
              next[key] = selectedValues;
          }
          return next;
      });
      setActiveFilterCol(null);
  };

  const getDistinctValues = (key: string) => {
      if (!activeInventory) return [];
      const values = new Set<string>();
      activeInventory.data.forEach(item => {
          // Permission filter should apply to available options too? 
          // Usually sheets shows ALL values in the file, even if hidden by other filters.
          // Let's show all values present in the dataset to allow proper "Where" logic building.
          if (!isManager && item.assigneeId !== currentUser.id) return;

          const val = String(item[key as keyof InventoryItem] || '');
          values.add(val);
      });
      return Array.from(values).sort();
  };

  const toggleSelect = (id: string, shiftKey: boolean) => {
    setSelectedIds(prev => {
      const newSelected = new Set(prev);
      const isAdding = !prev.has(id);
      
      if (shiftKey && lastSelectedId) {
        const lastIdx = filteredData.findIndex(i => i.id === lastSelectedId);
        const currentIdx = filteredData.findIndex(i => i.id === id);
        
        if (lastIdx !== -1 && currentIdx !== -1) {
          const start = Math.min(lastIdx, currentIdx);
          const end = Math.max(lastIdx, currentIdx);
          const rangeIds = filteredData.slice(start, end + 1).map(i => i.id);
          rangeIds.forEach(rid => isAdding ? newSelected.add(rid) : newSelected.delete(rid));
          return newSelected;
        }
      }
      isAdding ? newSelected.add(id) : newSelected.delete(id);
      return newSelected;
    });
    setLastSelectedId(id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    
    setTimeout(() => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const lines = text.split('\n');
          if (lines.length < 2) throw new Error("File is empty");
          
          const parseLine = (line: string) => {
             const result = [];
             let start = 0;
             let inQuotes = false;
             for (let i = 0; i < line.length; i++) {
                 if (line[i] === '"') inQuotes = !inQuotes;
                 if (line[i] === ',' && !inQuotes) {
                     result.push(line.substring(start, i).replace(/^"|"$/g, '').trim());
                     start = i + 1;
                 }
             }
             result.push(line.substring(start).replace(/^"|"$/g, '').trim());
             return result;
          };

          const headers = parseLine(lines[0]).map(h => h.toLowerCase());
          const findIdx = (keys: string[]) => headers.findIndex(h => keys.some(k => h === k || h.includes(k)));
          
          const mapping = {
            productId: findIdx(['product id', 'product_id', 'productid']),
            name: findIdx(['name', 'product name']),
            model: findIdx(['model']),
            status: findIdx(['status']),
            augmented: findIdx(['augmented']),
            reviewed: findIdx(['reviewed']),
            reviewedBy: findIdx(['reviewed by']),
            mfr: findIdx(['manufacturer', 'mfr']),
            studio: findIdx(['studio name', 'studio']),
            dimension: findIdx(['dimension']),
            approxMat: findIdx(['approx mat', 'approx match'])
          };

          const data: InventoryItem[] = [];
          for (let i = 1; i < Math.min(lines.length, 5000); i++) {
            if (!lines[i].trim()) continue;
            const currentLine = parseLine(lines[i]);
            const getVal = (idx: number) => idx > -1 && currentLine[idx] ? currentLine[idx] : ''; // Empty string for blanks

            data.push({
              id: `inv-${Date.now()}-${i}`,
              productId: getVal(mapping.productId),
              productName: getVal(mapping.name),
              model: getVal(mapping.model),
              csvStatus: getVal(mapping.status),
              augmented: getVal(mapping.augmented),
              reviewed: getVal(mapping.reviewed),
              reviewedBy: getVal(mapping.reviewedBy),
              mfr: getVal(mapping.mfr),
              studio: getVal(mapping.studio),
              dimension: getVal(mapping.dimension),
              approxMatch: getVal(mapping.approxMat),
              status: InventoryStatus.PENDING
            });
          }

          onUpload({
            id: Date.now().toString(),
            fileName: file.name.replace('.csv', ''),
            uploadDate: Date.now(),
            rowCount: data.length,
            data: data
          });
        } catch (err) {
          console.error(err);
          alert("Failed to parse CSV. Please ensure standard CSV format.");
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsText(file);
    }, 100);
  };

  const handleAssignSubmit = () => {
    if (!activeInventory) return;
    const assignee = users.find(u => u.id === selectedAssignee);
    const selectedCount = selectedIds.size;
    
    const updatedItems = activeInventory.data.map(item => {
      if (selectedIds.has(item.id)) {
        return {
          ...item,
          status: assignType === 'AUGMENTATION' ? InventoryStatus.ASSIGNED_AUGMENTATION : InventoryStatus.ASSIGNED_QA,
          assigneeId: selectedAssignee,
          assigneeName: assignee?.name,
          assignmentStartDate: assignStartDate,
          assignmentDueDate: assignDueDate
        };
      }
      return item;
    });

    const taskType = assignType === 'AUGMENTATION' ? TaskType.AUGMENTING : TaskType.QA;
    onAddTask({
      title: `${assignType === 'AUGMENTATION' ? 'Augment' : 'QA Review'} ${selectedCount} products in ${activeInventory.fileName}`,
      description: `Automated task for processing ${selectedCount} items from studio file: ${activeInventory.fileName}.`,
      assigneeId: selectedAssignee,
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      type: taskType,
      dueDate: assignDueDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
      notes: [{ id: `note-${Date.now()}`, authorId: currentUser.id, authorName: currentUser.name, text: 'Auto-generated from inventory workflow.', timestamp: Date.now() }],
      inventoryFileId: activeInventory.id,
      inventoryItemIds: Array.from(selectedIds)
    });

    onUpdateItems(activeInventory.id, updatedItems);
    setSelectedIds(new Set());
    setIsAssignModalOpen(false);
  };

  const handleAgentStatusUpdate = (newStatus: InventoryStatus) => {
    if (!activeInventory) return;
    const updatedItems = activeInventory.data.map(item => {
      if (selectedIds.has(item.id)) return { ...item, status: newStatus };
      return item;
    });
    onUpdateItems(activeInventory.id, updatedItems);
    setSelectedIds(new Set());
  };

  const openAssignModal = (type: 'AUGMENTATION' | 'QA') => {
    setAssignType(type);
    setAssignStartDate(new Date().toISOString().split('T')[0]);
    setIsAssignModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col gap-4 relative">
      {/* Loading Overlay */}
      {isUploading && (
        <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center backdrop-blur-sm rounded-xl">
           <div className="flex flex-col items-center">
             <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
             <p className="text-slate-600 font-medium">Processing CSV...</p>
           </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Inventory Workflow</h2>
        {isManager && (
          <Button onClick={() => fileInputRef.current?.click()} variant="secondary">
             + Add Studio File
          </Button>
        )}
        <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
      </div>

      {/* File Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        {inventories.map(inv => (
          <button key={inv.id} onClick={() => setActiveFileId(inv.id)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeFileId === inv.id ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}>
             {inv.fileName}
          </button>
        ))}
      </div>

      {activeInventory ? (
        <div className="flex-1 flex flex-col min-h-0 gap-4">
          <Card className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
             <div className="flex-1">
                <div className="text-sm text-slate-600">
                    Showing <span className="font-bold">{filteredData.length}</span> of {activeInventory.data.length} items
                    {Object.keys(columnFilters).length > 0 && (
                        <button onClick={() => setColumnFilters({})} className="ml-4 text-xs text-red-500 hover:underline">Clear all filters</button>
                    )}
                </div>
             </div>
             <div className="flex items-center gap-2">
               {selectedIds.size > 0 && (
                 <>
                   {isManager ? (
                     <>
                        <Button variant="secondary" onClick={() => openAssignModal('AUGMENTATION')}>Assign Augmentation</Button>
                        <Button variant="secondary" onClick={() => openAssignModal('QA')}>Assign QA</Button>
                     </>
                   ) : (
                     <>
                        <Button variant="primary" onClick={() => handleAgentStatusUpdate(InventoryStatus.AUGMENTED)}>Mark Augmented</Button>
                        <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAgentStatusUpdate(InventoryStatus.QA_COMPLETE)}>Mark QA'd</Button>
                     </>
                   )}
                   <span className="text-xs font-bold text-slate-500">{selectedIds.size} selected</span>
                 </>
               )}
               {isManager && <Button variant="danger" onClick={() => onDeleteFile(activeInventory.id)}>Delete</Button>}
             </div>
          </Card>

          <Card className="flex-1 overflow-hidden relative">
            <div className="overflow-auto h-full pb-20">
              <table className="w-full text-sm text-left whitespace-nowrap border-collapse">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th className="p-4 w-10 bg-slate-50 border-b border-slate-200">
                        <input type="checkbox" onChange={(e) => setSelectedIds(e.target.checked ? new Set(filteredData.map(i => i.id)) : new Set())} checked={filteredData.length > 0 && selectedIds.size === filteredData.length} />
                    </th>
                    {COLUMNS.map(col => (
                        <th key={col.key} className={`px-6 py-3 ${col.width} bg-slate-50 border-b border-slate-200 relative group`}>
                            <div className="flex items-center justify-between cursor-pointer hover:text-blue-600" onClick={() => setActiveFilterCol(activeFilterCol === col.key ? null : col.key)}>
                                <span>{col.label}</span>
                                <div className={`p-1 rounded hover:bg-slate-200 ${columnFilters[col.key] || sortConfig?.key === col.key ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                </div>
                            </div>

                            {/* DROPDOWN MENU */}
                            {activeFilterCol === col.key && (
                                <FilterDropdown 
                                    columnKey={col.key}
                                    allValues={getDistinctValues(col.key)}
                                    currentFilters={columnFilters[col.key]}
                                    sortConfig={sortConfig?.key === col.key ? sortConfig : null}
                                    onSort={handleSort}
                                    onFilter={handleApplyFilter}
                                    onClose={() => setActiveFilterCol(null)}
                                />
                            )}
                        </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr 
                      key={item.id} 
                      className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer select-none ${selectedIds.has(item.id) ? 'bg-blue-50' : ''}`}
                      onClick={(e) => toggleSelect(item.id, e.shiftKey)}
                    >
                       <td className="p-4" onClick={e => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={selectedIds.has(item.id)} 
                            onChange={() => {}}
                            onClick={(e) => {
                               e.stopPropagation();
                               toggleSelect(item.id, e.shiftKey);
                            }}
                          />
                        </td>
                        {COLUMNS.map(col => (
                            <td key={col.key} className="px-6 py-3" onClick={col.key === 'productId' ? e => e.stopPropagation() : undefined}>
                                {col.key === 'productId' ? (
                                    <a 
                                        href={`https://insights.beamdynamics.io/product/${item.productId}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                        {item.productId}
                                        <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                ) : col.key === 'status' ? (
                                    <Badge color={item.status === InventoryStatus.QA_COMPLETE ? 'green' : item.status === InventoryStatus.AUGMENTED ? 'blue' : 'yellow'}>
                                        {item.status.replace(/_/g, ' ')}
                                    </Badge>
                                ) : (
                                    <span className={item[col.key] ? "text-slate-600" : "text-slate-300 italic"}>
                                        {item[col.key] || '-'}
                                    </span>
                                )}
                            </td>
                        ))}
                    </tr>
                  ))}
                  {filteredData.length === 0 && (
                      <tr>
                          <td colSpan={COLUMNS.length + 1} className="p-8 text-center text-slate-400">
                              {activeInventory?.data.length === 0 ? "No data in file." : "No matches found."}
                          </td>
                      </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Backdrop to close dropdown */}
            {activeFilterCol && (
                <div className="fixed inset-0 z-10" onClick={() => setActiveFilterCol(null)}></div>
            )}
          </Card>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400 italic">No studio file selected.</div>
      )}

      {/* Assignment Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">Assign {selectedIds.size} items</h3>
              <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Agent</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={selectedAssignee} onChange={e => setSelectedAssignee(e.target.value)}>
                      {users.filter(u => u.role === UserRole.AGENT).map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Due Date</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={assignDueDate} onChange={e => setAssignDueDate(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                 <Button variant="ghost" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
                 <Button onClick={handleAssignSubmit}>Confirm Assignment</Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// --- Helper Component for Dropdown ---
const FilterDropdown = ({ 
    columnKey, 
    allValues, 
    currentFilters, 
    sortConfig, 
    onSort, 
    onFilter,
    onClose 
}: any) => {
    const [search, setSearch] = useState('');
    // Initialize checked state: if currentFilters is null, it means ALL are selected initially
    const [checked, setChecked] = useState<Set<string>>(() => 
        currentFilters ? new Set(currentFilters) : new Set(allValues)
    );

    const filteredValues = allValues.filter((v: string) => v.toLowerCase().includes(search.toLowerCase()));

    const toggle = (val: string) => {
        const next = new Set(checked);
        if (next.has(val)) next.delete(val);
        else next.add(val);
        setChecked(next);
    };

    const handleSelectAll = () => {
        const next = new Set(checked);
        filteredValues.forEach((v: string) => next.add(v));
        setChecked(next);
    };

    const handleClear = () => {
        const next = new Set(checked);
        filteredValues.forEach((v: string) => next.delete(v));
        setChecked(next);
    };

    const handleApply = () => {
        // If all values are checked, pass null to indicate "no filter" (optimization)
        if (checked.size === allValues.length) {
            onFilter(columnKey, null);
        } else {
            onFilter(columnKey, checked);
        }
    };

    return (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50 flex flex-col text-slate-700 animate-fadeIn" onClick={e => e.stopPropagation()}>
            {/* Sort Section */}
            <div className="p-2 border-b border-slate-100 flex flex-col gap-1">
                <button 
                    onClick={() => onSort(columnKey, 'asc')}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded hover:bg-slate-50 ${sortConfig?.direction === 'asc' ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                    Sort A to Z
                </button>
                <button 
                    onClick={() => onSort(columnKey, 'desc')}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded hover:bg-slate-50 ${sortConfig?.direction === 'desc' ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h5m1 0v12m0 0l-4-4m4 4l4-4" /></svg>
                    Sort Z to A
                </button>
            </div>

            {/* Filter Section */}
            <div className="p-2">
                <input 
                    type="text" 
                    placeholder="Search..." 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none mb-2"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    autoFocus
                />
                
                <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-100 rounded mb-2">
                    {filteredValues.length > 0 ? filteredValues.map((val: string) => (
                        <label key={val} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={checked.has(val)}
                                onChange={() => toggle(val)}
                                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="text-xs text-slate-700 truncate">{val || '(Blanks)'}</span>
                        </label>
                    )) : (
                        <div className="p-4 text-center text-xs text-slate-400 italic">No matches found</div>
                    )}
                </div>

                <div className="flex justify-between items-center mb-3 px-1">
                    <button onClick={handleSelectAll} className="text-[10px] text-blue-600 font-bold hover:underline">Select All</button>
                    <button onClick={handleClear} className="text-[10px] text-slate-400 hover:text-slate-600 font-bold hover:underline">Clear</button>
                </div>

                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-1.5 text-xs border border-slate-200 rounded text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button onClick={handleApply} className="flex-1 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">OK</button>
                </div>
            </div>
        </div>
    );
};

export default InventoryManager;
