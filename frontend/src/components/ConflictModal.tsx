import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  conflicts: Record<string, { name: string; existing: any; new: any }>;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  conflicts,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg p-6 mx-4 shadow-2xl glow-border">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
            <AlertTriangle size={24} /> 上書きの確認
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 本文 */}
        <p className="text-slate-300 text-sm mb-4">
          kintone上にすでに値が登録されている項目があります。以下の項目を入力した新しい値で上書きしますか？
          （※未入力の項目は上書きされず、以前登録したデータがそのまま残ります）
        </p>

        {/* 競合リスト */}
        <div className="max-h-60 overflow-y-auto bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 mb-6 flex flex-col gap-2">
          {Object.entries(conflicts).map(([key, info]) => (
            <div
              key={key}
              className="flex flex-col sm:flex-row sm:items-center justify-between py-2 px-3 bg-slate-900/50 rounded-lg border border-slate-800/40 text-sm"
            >
              <span className="font-semibold text-slate-200 mb-1 sm:mb-0">{info.name}</span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-red-950/40 border border-red-500/20 text-red-300 rounded text-xs">
                  既存: {String(info.existing)}
                </span>
                <span className="text-slate-500">➔</span>
                <span className="px-2 py-0.5 bg-green-950/40 border border-green-500/20 text-green-300 rounded text-xs">
                  今回: {String(info.new)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* フッターアクション */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 rounded-xl text-sm font-semibold transition-all duration-200"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-600/20 transition-all duration-200"
          >
            上書きして保存する
          </button>
        </div>
      </div>
    </div>
  );
};
