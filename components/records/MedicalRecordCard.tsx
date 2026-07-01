
import React from 'react';
import { MedicalRecord } from '../../types';
import { FileText, Calendar, User } from 'lucide-react';
import { formatDateTime } from '../../utils/dateFormatter';

interface MedicalRecordCardProps {
  record: MedicalRecord;
}

const MedicalRecordCard: React.FC<MedicalRecordCardProps> = ({ record }) => {
  return (
    <div className="bg-white border-l-4 border-teal-500 rounded-r-lg shadow-sm p-5 mb-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-bold text-lg text-slate-800 flex items-center gap-2">
          <FileText size={20} className="text-teal-600" />
          {record.diagnosis}
        </h4>
        <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded">
          DOC-{record.id.toUpperCase().substring(0, 6)}
        </span>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600 mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-slate-400" />
          <span>{formatDateTime(record.date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <User size={16} className="text-slate-400" />
          <span>{record.doctorName}</span>
        </div>
      </div>

      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
        <p className="text-xs uppercase font-bold text-slate-400 mb-1">Prescrição / Orientação</p>
        <p className="text-slate-800 font-medium">{record.prescription}</p>
      </div>
    </div>
  );
};

export default MedicalRecordCard;
