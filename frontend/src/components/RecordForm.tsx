import React from "react";
import { ArrowLeft, Save, Plus, Minus } from "lucide-react";

export interface CareRecordData {
  record_date: string;
  user_name: string;
  staff_in_charge: string;
  transport_pickup: string;
  transport_dropoff: string;
  entry_time: string;
  exit_time: string;
  kt_am: number | "";
  kt_pm: number | "";
  hr: number | "";
  spo2: number | "";
  bp: string;
  rr: number | "";
  food_main: number | "";
  food_side: number | "";
  fluid_log: string;
  urine_count: number | "";
  stool_count: number | "";
  rehab_status: string;
  bath_status: string;
  suction_count: number | "";
  seizure_log: string;
  medication_status: string;
  remarks: string;
}

interface RecordFormProps {
  formData: CareRecordData;
  onChangeField: (field: keyof CareRecordData, value: any) => void;
  onSave: () => void;
  onBack: () => void;
  isSaving: boolean;
  userMaster?: { full_name: string; aliases: string[] }[];
  extractedFields?: (keyof CareRecordData)[];
}

export const RecordForm: React.FC<RecordFormProps> = ({
  formData,
  onChangeField,
  onSave,
  onBack,
  isSaving,
  userMaster = [],
  extractedFields = [],
}) => {
  const isExtracted = (field: keyof CareRecordData) => extractedFields.includes(field);

  const getFieldInputClass = (
    field: keyof CareRecordData,
    baseClass: string = "w-full premium-input px-3.5 py-2.5 rounded-xl text-sm"
  ) => {
    if (isExtracted(field)) {
      return `${baseClass} border-indigo-400 ring-2 ring-indigo-400/40 bg-indigo-950/30 font-semibold transition-all`;
    }
    return baseClass;
  };

  const renderLabel = (label: string, field: keyof CareRecordData) => (
    <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
      <span>{label}</span>
      {isExtracted(field) && (
        <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/90 border border-indigo-400/50 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm animate-fade-in">
          ✨ 今回の解析項目
        </span>
      )}
    </label>
  );

  // 数値フィールドのインクリメント/デクリメント用ヘルパー
  const handleStep = (field: keyof CareRecordData, step: number, min: number = 0) => {
    const current = Number(formData[field]) || 0;
    const next = Math.max(min, current + step);
    onChangeField(field, next);
  };

  const handleSelectToggle = (field: keyof CareRecordData, currentVal: string, options: string[]) => {
    const nextIdx = (options.indexOf(currentVal) + 1) % options.length;
    onChangeField(field, options[nextIdx]);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
      {/* ナビゲーション */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 rounded-xl text-slate-300 font-semibold text-sm transition-all"
        >
          <ArrowLeft size={16} /> 戻る
        </button>
        <span className="text-sm font-semibold text-slate-400">
          AI解析結果の確認・手動修正
        </span>
      </div>

      {/* 今回の解析結果ヘッダー説明 */}
      <div className="flex flex-col gap-1.5 bg-indigo-950/20 border border-indigo-500/10 p-4 rounded-2xl glow-border">
        <h3 className="text-base font-bold text-indigo-300 flex items-center gap-2">
          ✨ 今回の音声入力からの解析結果
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          ※ここには今回の音声入力（または手動入力）からAIが読み取った内容だけが表示されています。
          すでに本日登録済みのデータ（以前入力した体温など）は上書きされずに保持されますのでご安心ください。
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* セクション 1: 基本情報 */}
        <div className="glass-panel p-6 glow-border">
          <h3 className="text-lg font-bold text-indigo-300 border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
            📋 基本情報
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              {renderLabel("記録日", "record_date")}
              <input
                type="date"
                value={formData.record_date}
                onChange={(e) => onChangeField("record_date", e.target.value)}
                className={getFieldInputClass("record_date")}
              />
            </div>
            <div>
              {renderLabel("利用者氏名", "user_name")}
              <select
                value={formData.user_name}
                onChange={(e) => onChangeField("user_name", e.target.value)}
                className={getFieldInputClass("user_name")}
              >
                <option value="">-- 利用者を選択してください --</option>
                {userMaster.map((user) => (
                  <option key={user.full_name} value={user.full_name}>
                    {user.full_name}
                  </option>
                ))}
                {/* マスタに登録されていない名前が抽出された場合のフォールバック */}
                {formData.user_name && !userMaster.some(u => u.full_name === formData.user_name) && (
                  <option value={formData.user_name}>{formData.user_name}（AI抽出）</option>
                )}
              </select>
            </div>
            <div>
              {renderLabel("担当者名", "staff_in_charge")}
              <input
                type="text"
                value={formData.staff_in_charge}
                onChange={(e) => onChangeField("staff_in_charge", e.target.value)}
                placeholder="担当スタッフ名"
                className={getFieldInputClass("staff_in_charge")}
              />
            </div>
            <div>
              {renderLabel("送迎（迎え）", "transport_pickup")}
              <button
                type="button"
                onClick={() => handleSelectToggle("transport_pickup", formData.transport_pickup, ["", "〇", "×"])}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  isExtracted("transport_pickup") ? "ring-2 ring-indigo-400/40 font-bold " : ""
                }${
                  formData.transport_pickup === "〇"
                    ? "bg-green-950/40 border-green-500/50 text-green-300"
                    : formData.transport_pickup === "×"
                    ? "bg-red-950/40 border-red-500/50 text-red-300"
                    : "bg-slate-900 border-slate-700 text-slate-400"
                }`}
              >
                {formData.transport_pickup || "選択なし (クリックで変更)"}
              </button>
            </div>
            <div>
              {renderLabel("送迎（送り）", "transport_dropoff")}
              <button
                type="button"
                onClick={() => handleSelectToggle("transport_dropoff", formData.transport_dropoff, ["", "〇", "×"])}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  isExtracted("transport_dropoff") ? "ring-2 ring-indigo-400/40 font-bold " : ""
                }${
                  formData.transport_dropoff === "〇"
                    ? "bg-green-950/40 border-green-500/50 text-green-300"
                    : formData.transport_dropoff === "×"
                    ? "bg-red-950/40 border-red-500/50 text-red-300"
                    : "bg-slate-900 border-slate-700 text-slate-400"
                }`}
              >
                {formData.transport_dropoff || "選択なし (クリックで変更)"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                {renderLabel("登所時刻", "entry_time")}
                <input
                  type="time"
                  value={formData.entry_time}
                  onChange={(e) => onChangeField("entry_time", e.target.value)}
                  className={getFieldInputClass("entry_time")}
                />
              </div>
              <div>
                {renderLabel("退所時刻", "exit_time")}
                <input
                  type="time"
                  value={formData.exit_time}
                  onChange={(e) => onChangeField("exit_time", e.target.value)}
                  className={getFieldInputClass("exit_time")}
                />
              </div>
            </div>
          </div>
        </div>

        {/* セクション 2: バイタル */}
        <div className="glass-panel p-6 glow-border">
          <h3 className="text-lg font-bold text-indigo-300 border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
            💓 バイタル
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              {renderLabel("体温 AM (℃)", "kt_am")}
              <input
                type="number"
                step="0.1"
                value={formData.kt_am}
                onChange={(e) => onChangeField("kt_am", e.target.value === "" ? "" : parseFloat(e.target.value))}
                className={getFieldInputClass("kt_am", "w-full premium-input px-3 py-2.5 rounded-xl text-sm")}
              />
            </div>
            <div>
              {renderLabel("体温 PM (℃)", "kt_pm")}
              <input
                type="number"
                step="0.1"
                value={formData.kt_pm}
                onChange={(e) => onChangeField("kt_pm", e.target.value === "" ? "" : parseFloat(e.target.value))}
                className={getFieldInputClass("kt_pm", "w-full premium-input px-3 py-2.5 rounded-xl text-sm")}
              />
            </div>
            <div>
              {renderLabel("心拍 HR (bpm)", "hr")}
              <input
                type="number"
                value={formData.hr}
                onChange={(e) => onChangeField("hr", e.target.value === "" ? "" : parseInt(e.target.value))}
                className={getFieldInputClass("hr", "w-full premium-input px-3 py-2.5 rounded-xl text-sm")}
              />
            </div>
            <div>
              {renderLabel("SpO2 (%)", "spo2")}
              <input
                type="number"
                value={formData.spo2}
                onChange={(e) => onChangeField("spo2", e.target.value === "" ? "" : parseInt(e.target.value))}
                className={getFieldInputClass("spo2", "w-full premium-input px-3 py-2.5 rounded-xl text-sm")}
              />
            </div>
            <div>
              {renderLabel("血圧 BP", "bp")}
              <input
                type="text"
                placeholder="未入力"
                value={formData.bp}
                onChange={(e) => onChangeField("bp", e.target.value)}
                className={getFieldInputClass("bp", "w-full premium-input px-3 py-2.5 rounded-xl text-sm")}
              />
            </div>
            <div>
              {renderLabel("呼吸数 RR (回/分)", "rr")}
              <input
                type="number"
                value={formData.rr}
                onChange={(e) => onChangeField("rr", e.target.value === "" ? "" : parseInt(e.target.value))}
                className={getFieldInputClass("rr", "w-full premium-input px-3 py-2.5 rounded-xl text-sm")}
              />
            </div>
          </div>
        </div>

        {/* セクション 3: 食事・水分 */}
        <div className="glass-panel p-6 glow-border">
          <h3 className="text-lg font-bold text-indigo-300 border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
            🍲 食事・水分
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col justify-between">
              {renderLabel("主菜摂取量 (0〜10)", "food_main")}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStep("food_main", -1)}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-xl shrink-0"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.food_main}
                  onChange={(e) => onChangeField("food_main", e.target.value === "" ? "" : Math.min(10, Math.max(0, parseInt(e.target.value))))}
                  className={getFieldInputClass("food_main", "flex-1 premium-input px-3 py-2.5 rounded-xl text-center text-sm")}
                />
                <button
                  type="button"
                  onClick={() => handleStep("food_main", 1)}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-xl shrink-0"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div className="flex flex-col justify-between">
              {renderLabel("副菜摂取量 (0〜10)", "food_side")}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStep("food_side", -1)}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-xl shrink-0"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.food_side}
                  onChange={(e) => onChangeField("food_side", e.target.value === "" ? "" : Math.min(10, Math.max(0, parseInt(e.target.value))))}
                  className={getFieldInputClass("food_side", "flex-1 premium-input px-3 py-2.5 rounded-xl text-center text-sm")}
                />
                <button
                  type="button"
                  onClick={() => handleStep("food_side", 1)}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-xl shrink-0"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div>
              {renderLabel("水分記録", "fluid_log")}
              <textarea
                value={formData.fluid_log}
                onChange={(e) => onChangeField("fluid_log", e.target.value)}
                placeholder="例: 10:00 麦茶 100ml"
                rows={2}
                className={getFieldInputClass("fluid_log", "w-full premium-input px-3 py-2 rounded-xl text-sm resize-none")}
              />
            </div>
          </div>
        </div>

        {/* セクション 4: 排泄・ケア */}
        <div className="glass-panel p-6 glow-border">
          <h3 className="text-lg font-bold text-indigo-300 border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
            🚽 排泄・ケア
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="flex flex-col justify-between">
              {renderLabel("尿回数 (回)", "urine_count")}
              <div className="flex items-center gap-1 min-w-0">
                <button type="button" onClick={() => handleStep("urine_count", -1)} className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-lg shrink-0"><Minus size={14} /></button>
                <input type="number" value={formData.urine_count} onChange={(e) => onChangeField("urine_count", e.target.value === "" ? "" : parseInt(e.target.value))} className={getFieldInputClass("urine_count", "w-full min-w-0 premium-input py-2 px-1 rounded-xl text-center text-sm")} />
                <button type="button" onClick={() => handleStep("urine_count", 1)} className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-lg shrink-0"><Plus size={14} /></button>
              </div>
            </div>
            <div className="flex flex-col justify-between">
              {renderLabel("便回数 (回)", "stool_count")}
              <div className="flex items-center gap-1 min-w-0">
                <button type="button" onClick={() => handleStep("stool_count", -1)} className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-lg shrink-0"><Minus size={14} /></button>
                <input type="number" value={formData.stool_count} onChange={(e) => onChangeField("stool_count", e.target.value === "" ? "" : parseInt(e.target.value))} className={getFieldInputClass("stool_count", "w-full min-w-0 premium-input py-2 px-1 rounded-xl text-center text-sm")} />
                <button type="button" onClick={() => handleStep("stool_count", 1)} className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-lg shrink-0"><Plus size={14} /></button>
              </div>
            </div>
            <div className="flex flex-col justify-between">
              {renderLabel("リハビリ実施", "rehab_status")}
              <button
                type="button"
                onClick={() => handleSelectToggle("rehab_status", formData.rehab_status, ["", "〇"])}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  isExtracted("rehab_status") ? "ring-2 ring-indigo-400/40 font-bold " : ""
                }${
                  formData.rehab_status === "〇"
                    ? "bg-indigo-950/40 border-indigo-500/50 text-indigo-300"
                    : "bg-slate-900 border-slate-700 text-slate-400"
                }`}
              >
                {formData.rehab_status || "未実施"}
              </button>
            </div>
            <div className="flex flex-col justify-between">
              {renderLabel("入浴実施", "bath_status")}
              <button
                type="button"
                onClick={() => handleSelectToggle("bath_status", formData.bath_status, ["", "〇"])}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  isExtracted("bath_status") ? "ring-2 ring-indigo-400/40 font-bold " : ""
                }${
                  formData.bath_status === "〇"
                    ? "bg-indigo-950/40 border-indigo-500/50 text-indigo-300"
                    : "bg-slate-900 border-slate-700 text-slate-400"
                }`}
              >
                {formData.bath_status || "未入浴"}
              </button>
            </div>
            <div className="flex flex-col justify-between">
              {renderLabel("吸引回数 (回)", "suction_count")}
              <div className="flex items-center gap-1 min-w-0">
                <button type="button" onClick={() => handleStep("suction_count", -1)} className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-lg shrink-0"><Minus size={14} /></button>
                <input type="number" value={formData.suction_count} onChange={(e) => onChangeField("suction_count", e.target.value === "" ? "" : parseInt(e.target.value))} className={getFieldInputClass("suction_count", "w-full min-w-0 premium-input py-2 px-1 rounded-xl text-center text-sm")} />
                <button type="button" onClick={() => handleStep("suction_count", 1)} className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-lg shrink-0"><Plus size={14} /></button>
              </div>
            </div>
          </div>
        </div>

        {/* セクション 5: 看護・特記 */}
        <div className="glass-panel p-6 glow-border">
          <h3 className="text-lg font-bold text-indigo-300 border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
            🩺 看護・特記
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              {renderLabel("発作記録", "seizure_log")}
              <textarea
                value={formData.seizure_log}
                onChange={(e) => onChangeField("seizure_log", e.target.value)}
                placeholder="発作の状況、持続時間等..."
                rows={3}
                className={getFieldInputClass("seizure_log", "w-full premium-input px-3.5 py-2.5 rounded-xl text-sm")}
              />
            </div>
            <div>
              {renderLabel("投薬・処置", "medication_status")}
              <textarea
                value={formData.medication_status}
                onChange={(e) => onChangeField("medication_status", e.target.value)}
                placeholder="与薬、吸入、処置の具体的な記録..."
                rows={3}
                className={getFieldInputClass("medication_status", "w-full premium-input px-3.5 py-2.5 rounded-xl text-sm")}
              />
            </div>
            <div>
              {renderLabel("備考", "remarks")}
              <textarea
                value={formData.remarks}
                onChange={(e) => onChangeField("remarks", e.target.value)}
                placeholder="その他の様子、連絡事項など..."
                rows={3}
                className={getFieldInputClass("remarks", "w-full premium-input px-3.5 py-2.5 rounded-xl text-sm")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* kintone 保存アクション */}
      <button
        onClick={onSave}
        disabled={isSaving || !formData.user_name || !formData.record_date}
        className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 active:scale-[0.99] text-white rounded-2xl font-bold text-xl shadow-[0_0_30px_rgba(99,102,241,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2 transition-all duration-300"
      >
        <Save size={24} />
        {isSaving ? "kintoneに登録しています..." : "この内容でkintoneに登録する"}
      </button>
    </div>
  );
};
