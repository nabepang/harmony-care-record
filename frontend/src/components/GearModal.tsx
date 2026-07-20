import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, Plus, Trash2, RotateCcw } from "lucide-react";

interface GearModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  apiBaseUrl: string;
}

export const GearModal: React.FC<GearModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
  apiBaseUrl,
}) => {
  const [models, setModels] = useState<string[]>([]);
  const [newModel, setNewModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [savedSuccessMsg, setSavedSuccessMsg] = useState(false);

  // ローカルストレージからモデルリストおよびAPIキーを読み込む
  useEffect(() => {
    const defaultModels = ["gemini-3.5-flash", "gemini-3.1-pro", "gemini-3.1-flash-lite"];
    const savedModels = localStorage.getItem("care_record_ai_models");
    if (savedModels) {
      const parsed: string[] = JSON.parse(savedModels);
      const merged = Array.from(new Set([...defaultModels, ...parsed]));
      setModels(merged);
      localStorage.setItem("care_record_ai_models", JSON.stringify(merged));
    } else {
      setModels(defaultModels);
      localStorage.setItem("care_record_ai_models", JSON.stringify(defaultModels));
    }

    const savedKey = localStorage.getItem("care_record_gemini_api_key");
    if (savedKey) {
      setApiKey(savedKey);
    } else if (apiBaseUrl) {
      // localStorage に未設定の場合、サーバーの .env 内のデフォルトキーを自動取得して設定
      axios.get(`${apiBaseUrl}/api/config-status`)
        .then((res) => {
          if (res.data.status === "success" && res.data.default_gemini_api_key) {
            setApiKey(res.data.default_gemini_api_key);
            localStorage.setItem("care_record_gemini_api_key", res.data.default_gemini_api_key);
          }
        })
        .catch((err) => console.error("デフォルトAPIキーの読み込みに失敗しました", err));
    }
  }, [apiBaseUrl]);

  const handleResetToDefault = () => {
    axios.get(`${apiBaseUrl}/api/config-status`)
      .then((res) => {
        if (res.data.status === "success" && res.data.default_gemini_api_key) {
          setApiKey(res.data.default_gemini_api_key);
          localStorage.setItem("care_record_gemini_api_key", res.data.default_gemini_api_key);
          setSavedSuccessMsg(true);
          setTimeout(() => setSavedSuccessMsg(false), 2000);
        }
      })
      .catch((err) => console.error("デフォルトAPIキーのリセットに失敗しました", err));
  };

  const handleSaveApiKey = () => {
    localStorage.setItem("care_record_gemini_api_key", apiKey.trim());
    setSavedSuccessMsg(true);
    setTimeout(() => setSavedSuccessMsg(false), 2000);
  };

  const handleAddModel = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newModel.trim();
    if (trimmed && !models.includes(trimmed)) {
      const updated = [...models, trimmed];
      setModels(updated);
      localStorage.setItem("care_record_ai_models", JSON.stringify(updated));
      setNewModel("");
    }
  };

  const handleDeleteModel = (modelToDelete: string) => {
    // デフォルトのモデルは削除できないようにする
    if (
      modelToDelete === "gemini-3.5-flash" ||
      modelToDelete === "gemini-3.1-pro" ||
      modelToDelete === "gemini-3.1-flash-lite"
    ) {
      alert("初期モデルは削除できません。");
      return;
    }
    const updated = models.filter((m) => m !== modelToDelete);
    setModels(updated);
    localStorage.setItem("care_record_ai_models", JSON.stringify(updated));
    if (selectedModel === modelToDelete) {
      onSelectModel("gemini-3.5-flash");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md p-6 mx-4 shadow-2xl glow-border">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            ⚙️ 設定
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Gemini API キー設定 */}
        <div className="mb-6 border-b border-slate-800 pb-6">
          <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center justify-between">
            <span>Gemini API キー (任意)</span>
            {savedSuccessMsg && (
              <span className="text-xs text-green-400 font-normal">✓ 保存しました</span>
            )}
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="flex-1 premium-input px-3 py-2 rounded-lg text-sm border border-slate-700"
            />
            <button
              type="button"
              onClick={handleSaveApiKey}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shrink-0"
            >
              保存
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px]">
            <span className="text-slate-400">※デフォルトは .env のキーが自動設定されています。</span>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-medium transition-colors"
            >
              <RotateCcw size={12} /> .env初期値に戻す
            </button>
          </div>
        </div>

        {/* AIモデル選択 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            使用するAIモデル
          </label>
          <select
            value={selectedModel}
            onChange={(e) => onSelectModel(e.target.value)}
            className="w-full premium-input px-3 py-2.5 rounded-lg border border-slate-700 focus:outline-none"
          >
            {models.map((model) => (
              <option key={model} value={model} className="bg-slate-900 text-slate-100">
                {model}
              </option>
            ))}
          </select>
        </div>

        {/* 新しいモデルの追加 */}
        <div className="border-t border-slate-800 pt-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            新しいモデルIDを追加
          </label>
          <form onSubmit={handleAddModel} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
              placeholder="例: gemini-2.5-flash"
              className="flex-1 premium-input px-3 py-2 rounded-lg text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1 transition-all duration-200"
            >
              <Plus size={16} /> 追加
            </button>
          </form>

          {/* モデル一覧の管理 */}
          <div className="max-h-40 overflow-y-auto bg-slate-950/40 rounded-lg p-2 border border-slate-800/60">
            <span className="text-xs font-semibold text-slate-500 px-2 py-1 block">登録済みモデル一覧</span>
            {models.map((model) => (
              <div
                key={model}
                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-slate-850/50 transition-colors"
              >
                <span className="text-sm text-slate-300">{model}</span>
                {model !== "gemini-3.5-flash" && model !== "gemini-3.1-pro" && (
                  <button
                    onClick={() => handleDeleteModel(model)}
                    className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 閉じるボタン */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 rounded-lg text-sm font-semibold transition-all duration-200"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
