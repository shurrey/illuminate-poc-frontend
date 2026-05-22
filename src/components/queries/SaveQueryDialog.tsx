"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";

interface SaveQueryDialogProps {
  initialName: string;
  initialDescription: string;
  onSave: (name: string, description: string) => void;
  onClose: () => void;
}

export function SaveQueryDialog({ initialName, initialDescription, onSave, onClose }: SaveQueryDialogProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  const onKey = useCallback((e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }, [onClose]);
  useEffect(() => { document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey); }, [onKey]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), description.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 text-sm">Save Query</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Student enrollment by term"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What does this query measure?"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim()} className="px-4 py-2 text-sm font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg transition-colors disabled:opacity-50">Save</button>
        </div>
      </div>
    </div>
  );
}
