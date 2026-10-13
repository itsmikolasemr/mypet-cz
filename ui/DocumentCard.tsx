import React from 'react';

interface DocumentCardProps {
  type: string;
  uploadedAt: string;
  fileName?: string;
}

export function DocumentCard({ type, uploadedAt, fileName }: DocumentCardProps) {
  return (
    <div className="rounded-xl bg-[#F7F5F2] p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-[#2E7D6F] flex items-center justify-center text-white text-xs">
        DOC
      </div>
      <div>
        <p className="font-medium text-gray-900">{type}</p>
        <p className="text-xs text-gray-500">{fileName || 'Dokument'} · {uploadedAt}</p>
      </div>
    </div>
  );
}
