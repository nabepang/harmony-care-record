import React, { useState } from "react";
import axios from "axios";
import { Calendar, Clock, HeartPulse, Utensils, CheckCircle2, AlertCircle } from "lucide-react";

interface UserMasterEntry {
  full_name: string;
  aliases: string[];
}

interface TodayRecordViewerProps {
  userMaster: UserMasterEntry[];
  apiBaseUrl: string;
}

export const TodayRecordViewer: React.FC<TodayRecordViewerProps> = ({ userMaster, apiBaseUrl }) => {
  const [selectedUser, setSelectedUser] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recordData, setRecordData] = useState<any>(null);

  const handleSelectUser = async (userName: string) => {
    setSelectedUser(userName);
    if (!userName) {
      setRecordData(null);
      return;
    }

    setIsLoading(true);

    try {
      const res = await axios.get(`${apiBaseUrl}/api/get-record`, {
        params: { user_name: userName }
      });
      if (res.data.status === "success") {
        if (res.data.found) {
          setRecordData(res.data.record);
        } else {
          setRecordData(null);
        }
      }
    } catch (error) {
      console.error("登録データの取得に失敗しました", error);
      setRecordData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full glass-panel p-6 glow-border mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            🔍 本日の kintone 登録状況を確認
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            利用者名を選択すると、本日すでに kintone に登録されているデータを閲覧できます。
          </p>
        </div>

        {/* 利用者選択ドロップダウン */}
        <div className="w-full sm:w-64">
          <select
            value={selectedUser}
            onChange={(e) => handleSelectUser(e.target.value)}
            className="w-full premium-input px-3.5 py-2 rounded-xl text-sm"
          >
            <option value="">-- 利用者を選択してください --</option>
            {userMaster.map((u) => (
              <option key={u.full_name} value={u.full_name}>
                {u.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* コンテンツエリア */}
      {isLoading ? (
        <div className="py-6 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
          kintone から最新データを読み込んでいます...
        </div>
      ) : !selectedUser ? (
        <div className="py-4 text-center text-slate-500 text-xs">
          上のリストから利用者名を選択してください。
        </div>
      ) : !recordData ? (
        <div className="py-6 text-center text-slate-400 text-xs flex flex-col items-center gap-1.5">
          <AlertCircle size={20} className="text-slate-500" />
          <span>【{selectedUser}】さんの本日の登録データはまだありません。</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3 animate-fade-in">
          {/* ヘッダーバッジ */}
          <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-xs">
            <span className="font-bold text-indigo-300 flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-green-400" /> {recordData.user_name} さんの登録済みデータ
            </span>
            <span className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Calendar size={13} /> {recordData.record_date}
            </span>
          </div>

          {/* グリッドカード表示 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 基本・送迎・時間 */}
            <div className="bg-slate-900/50 p-3.5 rounded-xl border border-slate-800/80 flex flex-col gap-1.5">
              <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1">
                <Clock size={13} /> 時間・送迎・担当
              </h4>
              <div className="text-xs text-slate-300 flex flex-col gap-1 mt-0.5">
                <div>登所: <span className="font-semibold text-slate-100">{recordData.entry_time || "--:--"}</span> / 退所: <span className="font-semibold text-slate-100">{recordData.exit_time || "--:--"}</span></div>
                <div>迎え送迎: <span className="font-semibold text-slate-100">{recordData.transport_pickup || "未設定"}</span></div>
                <div>送り送迎: <span className="font-semibold text-slate-100">{recordData.transport_dropoff || "未設定"}</span></div>
                <div>担当者: <span className="font-semibold text-slate-100">{recordData.staff_in_charge || "未設定"}</span></div>
              </div>
            </div>

            {/* バイタル */}
            <div className="bg-slate-900/50 p-3.5 rounded-xl border border-slate-800/80 flex flex-col gap-1.5">
              <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1">
                <HeartPulse size={13} /> バイタル
              </h4>
              <div className="text-xs text-slate-300 flex flex-col gap-1 mt-0.5">
                <div>体温 AM: <span className="font-semibold text-slate-100">{recordData.kt_am ? `${recordData.kt_am}℃` : "--"}</span> / PM: <span className="font-semibold text-slate-100">{recordData.kt_pm ? `${recordData.kt_pm}℃` : "--"}</span></div>
                <div>心拍: <span className="font-semibold text-slate-100">{recordData.hr ? `${recordData.hr} bpm` : "--"}</span> / SpO2: <span className="font-semibold text-slate-100">{recordData.spo2 ? `${recordData.spo2}%` : "--"}</span></div>
                <div>血圧: <span className="font-semibold text-slate-100">{recordData.bp || "--"}</span> / 呼吸数: <span className="font-semibold text-slate-100">{recordData.rr ? `${recordData.rr}回` : "--"}</span></div>
              </div>
            </div>

            {/* 食事・水分・排泄 */}
            <div className="bg-slate-900/50 p-3.5 rounded-xl border border-slate-800/80 flex flex-col gap-1.5">
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <Utensils size={13} /> 食事・ケア・回数
              </h4>
              <div className="text-xs text-slate-300 flex flex-col gap-1 mt-0.5">
                <div>主菜: <span className="font-semibold text-slate-100">{recordData.food_main !== "" && recordData.food_main !== null ? `${recordData.food_main}/10` : "--"}</span> / 副菜: <span className="font-semibold text-slate-100">{recordData.food_side !== "" && recordData.food_side !== null ? `${recordData.food_side}/10` : "--"}</span></div>
                <div className="flex gap-1.5 my-0.5">
                  <span className="px-2 py-0.5 bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 rounded text-[11px]">尿: {recordData.urine_count || 0}回</span>
                  <span className="px-2 py-0.5 bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 rounded text-[11px]">便: {recordData.stool_count || 0}回</span>
                  <span className="px-2 py-0.5 bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 rounded text-[11px]">吸引: {recordData.suction_count || 0}回</span>
                </div>
                <div>リハビリ: <span className="font-semibold text-slate-100">{recordData.rehab_status || "未"}</span> / 入浴: <span className="font-semibold text-slate-100">{recordData.bath_status || "未"}</span></div>
              </div>
            </div>
          </div>

          {/* テキスト記述項目 */}
          {(recordData.fluid_log || recordData.seizure_log || recordData.medication_status || recordData.remarks) && (
            <div className="bg-slate-900/50 p-3.5 rounded-xl border border-slate-800/80 flex flex-col gap-1.5 text-xs">
              {recordData.fluid_log && (
                <div><span className="font-bold text-slate-400">水分記録:</span> <span className="text-slate-200 whitespace-pre-wrap">{recordData.fluid_log}</span></div>
              )}
              {recordData.seizure_log && (
                <div><span className="font-bold text-slate-400">発作記録:</span> <span className="text-slate-200 whitespace-pre-wrap">{recordData.seizure_log}</span></div>
              )}
              {recordData.medication_status && (
                <div><span className="font-bold text-slate-400">投薬・処置:</span> <span className="text-slate-200 whitespace-pre-wrap">{recordData.medication_status}</span></div>
              )}
              {recordData.remarks && (
                <div><span className="font-bold text-slate-400">備考:</span> <span className="text-slate-200 whitespace-pre-wrap">{recordData.remarks}</span></div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
