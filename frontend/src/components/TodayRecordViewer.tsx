import React, { useState, useEffect } from "react";
import axios from "axios";
import { Calendar, Clock, HeartPulse, Utensils, CheckCircle2, AlertCircle, AlertTriangle, Droplets } from "lucide-react";

interface UserMasterEntry {
  full_name: string;
  aliases: string[];
}

interface TodayRecordViewerProps {
  userMaster: UserMasterEntry[];
  apiBaseUrl: string;
  selectedUser: string;
  onSelectUser: (userName: string) => void;
  refreshTrigger?: number;
}

export const TodayRecordViewer: React.FC<TodayRecordViewerProps> = ({
  userMaster,
  apiBaseUrl,
  selectedUser,
  onSelectUser,
  refreshTrigger = 0,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [recordData, setRecordData] = useState<any>(null);

  const fetchRecordData = async (userName: string) => {
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

  useEffect(() => {
    fetchRecordData(selectedUser);
  }, [selectedUser, refreshTrigger]);

  const handleSelectUser = (userName: string) => {
    onSelectUser(userName);
  };

  // 値の入力状態に応じた見やすい大文字バッジレンダラー
  const renderItemBadge = (
    value: any,
    unit: string = "",
    formatFn?: (val: any) => string
  ) => {
    const isPresent =
      value !== null &&
      value !== undefined &&
      value !== "" &&
      value !== false;

    if (!isPresent) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/40 border border-rose-500/40 shadow-sm">
          <AlertTriangle size={13} className="text-rose-400" />
          未入力
        </span>
      );
    }

    const displayVal = formatFn ? formatFn(value) : `${value}${unit}`;

    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-base font-extrabold text-emerald-300 bg-emerald-950/40 border border-emerald-500/40 shadow-sm">
        {displayVal}
      </span>
    );
  };

  return (
    <div className="w-full glass-panel p-6 glow-border mt-8">
      {/* セクションヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-extrabold text-slate-100 flex items-center gap-2.5">
            🔍 本日の kintone 登録状況を確認
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            対象者を選択すると、本日すでに kintone に登録されている全データ・未入力項目をリアルタイムで確認できます。
          </p>
        </div>

        {/* 利用者選択ドロップダウン */}
        <div className="w-full sm:w-72">
          <select
            value={selectedUser}
            onChange={(e) => handleSelectUser(e.target.value)}
            className="w-full premium-input px-4 py-3 rounded-2xl text-base font-bold border-indigo-500/40 focus:border-indigo-400 shadow-md"
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
        <div className="py-12 text-center text-slate-300 text-base font-semibold flex items-center justify-center gap-3">
          <div className="w-6 h-6 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
          kintone から最新の登録データを読み込んでいます...
        </div>
      ) : !selectedUser ? (
        <div className="py-8 text-center text-slate-400 text-sm font-semibold bg-slate-900/40 rounded-2xl border border-slate-800/60 p-6">
          ☝️ 上のドロップダウンから利用者名を選択すると、本日の登録データ状況が表示されます。
        </div>
      ) : !recordData ? (
        <div className="py-10 text-center text-slate-400 text-sm flex flex-col items-center gap-2 bg-slate-900/40 rounded-2xl border border-slate-800/60 p-6">
          <AlertCircle size={28} className="text-amber-400" />
          <span className="text-base font-bold text-slate-200">
            【{selectedUser}】さんの本日の kintone 登録データはまだありません
          </span>
          <span className="text-xs text-slate-500">
            上のマイクボタンを押して音声入力すると、自動でデータが抽出・登録されます。
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* ヘッダーバッジ */}
          <div className="flex flex-wrap items-center justify-between bg-slate-900/90 p-4 rounded-2xl border border-indigo-500/30 shadow-md gap-3">
            <span className="text-lg font-extrabold text-indigo-200 flex items-center gap-2">
              <CheckCircle2 size={22} className="text-emerald-400" />
              {recordData.user_name} さんの登録データ一覧
            </span>
            <span className="text-slate-300 flex items-center gap-1.5 text-sm font-bold bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700">
              <Calendar size={16} className="text-indigo-400" />
              {recordData.record_date}
            </span>
          </div>

          {/* 表形式データグリッド Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* セクション 1: 時間・送迎・担当 */}
            <div className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800/90 flex flex-col gap-3 shadow-lg">
              <h4 className="text-base font-bold text-indigo-300 flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <Clock size={18} /> 時間・送迎・担当
              </h4>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                  <span className="text-sm font-semibold text-slate-400">登所時刻</span>
                  {renderItemBadge(recordData.entry_time)}
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                  <span className="text-sm font-semibold text-slate-400">退所時刻</span>
                  {renderItemBadge(recordData.exit_time)}
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                  <span className="text-sm font-semibold text-slate-400">迎え送迎</span>
                  {renderItemBadge(recordData.transport_pickup)}
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                  <span className="text-sm font-semibold text-slate-400">送り送迎</span>
                  {renderItemBadge(recordData.transport_dropoff)}
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-slate-400">担当スタッフ</span>
                  {renderItemBadge(recordData.staff_in_charge)}
                </div>
              </div>
            </div>

            {/* セクション 2: バイタル */}
            <div className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800/90 flex flex-col gap-3 shadow-lg">
              <h4 className="text-base font-bold text-rose-300 flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <HeartPulse size={18} /> バイタル記録
              </h4>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                  <span className="text-sm font-semibold text-slate-400">体温 AM</span>
                  {renderItemBadge(recordData.kt_am, "℃")}
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                  <span className="text-sm font-semibold text-slate-400">体温 PM</span>
                  {renderItemBadge(recordData.kt_pm, "℃")}
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                  <span className="text-sm font-semibold text-slate-400">心拍 (HR)</span>
                  {renderItemBadge(recordData.hr, " bpm")}
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                  <span className="text-sm font-semibold text-slate-400">SpO2</span>
                  {renderItemBadge(recordData.spo2, "%")}
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                  <span className="text-sm font-semibold text-slate-400">血圧 (BP)</span>
                  {renderItemBadge(recordData.bp)}
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-slate-400">呼吸数 (RR)</span>
                  {renderItemBadge(recordData.rr, " 回/分")}
                </div>
              </div>
            </div>

            {/* セクション 3: 食事・排泄・ケア */}
            <div className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800/90 flex flex-col gap-3 shadow-lg">
              <h4 className="text-base font-bold text-amber-300 flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <Utensils size={18} /> 食事・排泄・ケア
              </h4>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                  <span className="text-sm font-semibold text-slate-400">主菜摂取量</span>
                  {renderItemBadge(recordData.food_main, "/10")}
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                  <span className="text-sm font-semibold text-slate-400">副菜摂取量</span>
                  {renderItemBadge(recordData.food_side, "/10")}
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                  <span className="text-sm font-semibold text-slate-400">尿回数</span>
                  {renderItemBadge(recordData.urine_count, " 回")}
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                  <span className="text-sm font-semibold text-slate-400">便回数</span>
                  {renderItemBadge(recordData.stool_count, " 回")}
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                  <span className="text-sm font-semibold text-slate-400">吸引回数</span>
                  {renderItemBadge(recordData.suction_count, " 回")}
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                  <span className="text-sm font-semibold text-slate-400">リハビリ</span>
                  {renderItemBadge(recordData.rehab_status)}
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-slate-400">入浴</span>
                  {renderItemBadge(recordData.bath_status)}
                </div>
              </div>
            </div>
          </div>

          {/* セクション 4: テキスト自由記述項目（水分・看護・特記） */}
          <div className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800/90 flex flex-col gap-4 shadow-lg">
            <h4 className="text-base font-bold text-cyan-300 flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <Droplets size={18} /> 水分・看護・特記事項
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  💧 水分記録
                </span>
                {recordData.fluid_log ? (
                  <p className="text-sm font-semibold text-slate-100 whitespace-pre-wrap leading-relaxed">
                    {recordData.fluid_log}
                  </p>
                ) : (
                  <span className="text-xs font-bold text-rose-300 bg-rose-950/30 px-2.5 py-1 rounded-lg w-fit border border-rose-500/30">
                    未入力
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  ⚡ 発作記録
                </span>
                {recordData.seizure_log ? (
                  <p className="text-sm font-semibold text-slate-100 whitespace-pre-wrap leading-relaxed">
                    {recordData.seizure_log}
                  </p>
                ) : (
                  <span className="text-xs font-bold text-rose-300 bg-rose-950/30 px-2.5 py-1 rounded-lg w-fit border border-rose-500/30">
                    未入力
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  💊 投薬・処置
                </span>
                {recordData.medication_status ? (
                  <p className="text-sm font-semibold text-slate-100 whitespace-pre-wrap leading-relaxed">
                    {recordData.medication_status}
                  </p>
                ) : (
                  <span className="text-xs font-bold text-rose-300 bg-rose-950/30 px-2.5 py-1 rounded-lg w-fit border border-rose-500/30">
                    未入力
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  📝 備考
                </span>
                {recordData.remarks ? (
                  <p className="text-sm font-semibold text-slate-100 whitespace-pre-wrap leading-relaxed">
                    {recordData.remarks}
                  </p>
                ) : (
                  <span className="text-xs font-bold text-rose-300 bg-rose-950/30 px-2.5 py-1 rounded-lg w-fit border border-rose-500/30">
                    未入力
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
