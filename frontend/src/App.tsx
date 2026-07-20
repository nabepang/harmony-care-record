import { useState, useEffect } from "react";
import axios from "axios";
import { Settings, CheckCircle2, AlertTriangle, FileText, RefreshCw } from "lucide-react";
import { VoiceInput } from "./components/VoiceInput";
import { RecordForm } from "./components/RecordForm";
import type { CareRecordData } from "./components/RecordForm";
import { GearModal } from "./components/GearModal";
import { ConflictModal } from "./components/ConflictModal";
import { TodayRecordViewer } from "./components/TodayRecordViewer";

// バックエンドのURL (開発時は http://127.0.0.1:8000, 本番Vercelでは相対パス "")
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://127.0.0.1:8000" : "");

interface UserMasterEntry {
  full_name: string;
  aliases: string[];
}

const initialFormData: CareRecordData = {
  record_date: new Date().toISOString().split("T")[0],
  user_name: "",
  staff_in_charge: "",
  transport_pickup: "",
  transport_dropoff: "",
  entry_time: "",
  exit_time: "",
  kt_am: "",
  kt_pm: "",
  hr: "",
  spo2: "",
  bp: "",
  rr: "",
  food_main: "",
  food_side: "",
  fluid_log: "",
  urine_count: "",
  stool_count: "",
  rehab_status: "",
  bath_status: "",
  suction_count: "",
  seizure_log: "",
  medication_status: "",
  remarks: "",
};

function App() {
  const [phase, setPhase] = useState<"input" | "form">("input");
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash");
  const [userMaster, setUserMaster] = useState<UserMasterEntry[]>([]);
  const [formData, setFormData] = useState<CareRecordData>(initialFormData);
  const [isGearOpen, setIsGearOpen] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflicts, setConflicts] = useState<Record<string, { name: string; existing: any; new: any }>>({});
  
  // APIキー登録状態
  const [hasServerApiKey, setHasServerApiKey] = useState(false);
  const [hasCustomApiKey, setHasCustomApiKey] = useState(false);
  
  // 通知ステート
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // 初期読み込み: AIモデルと利用者マスタのキャッシュロード
  useEffect(() => {
    // 1. モデルの復元
    const savedModel = localStorage.getItem("care_record_selected_model");
    if (savedModel) {
      setSelectedModel(savedModel);
    }

    // 2. 利用者マスタの復元とフェッチ
    const cachedMaster = localStorage.getItem("care_record_user_master_cache");
    if (cachedMaster) {
      setUserMaster(JSON.parse(cachedMaster));
    }

    fetchUserMaster();
    checkApiKeyStatus();
  }, []);

  const checkApiKeyStatus = async () => {
    let customKey = localStorage.getItem("care_record_gemini_api_key");

    try {
      const res = await axios.get(`${API_BASE_URL}/api/config-status`);
      if (res.data.status === "success") {
        setHasServerApiKey(!!res.data.has_gemini_key);
        // localStorage にキーがまだ登録されていない場合は .env のデフォルトキーを自動セット
        if ((!customKey || customKey.trim().length === 0) && res.data.default_gemini_api_key) {
          localStorage.setItem("care_record_gemini_api_key", res.data.default_gemini_api_key);
          customKey = res.data.default_gemini_api_key;
        }
      }
    } catch (e) {
      console.error("Failed to fetch config status", e);
    }

    setHasCustomApiKey(!!customKey && customKey.trim().length > 0);
  };

  const hasApiKey = hasServerApiKey || hasCustomApiKey;

  const showNotification = (type: "success" | "error" | "info", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const fetchUserMaster = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/user-master`);
      setUserMaster(res.data);
      // ローカルキャッシュに保存
      localStorage.setItem("care_record_user_master_cache", JSON.stringify(res.data));
    } catch (error) {
      console.error("利用者マスタの取得に失敗しました", error);
      // キャッシュがあればそれを利用、無ければ擬似的な初期データをセット
      if (!localStorage.getItem("care_record_user_master_cache")) {
        const dummyMaster = [
          { full_name: "大隅 太郎", aliases: ["大隅", "大隅さん", "おおすみ"] },
          { full_name: "山田 花子", aliases: ["山田", "花子さん", "はなこ"] }
        ];
        setUserMaster(dummyMaster);
        localStorage.setItem("care_record_user_master_cache", JSON.stringify(dummyMaster));
      }
    }
  };

  const handleSelectModel = (model: string) => {
    setSelectedModel(model);
    localStorage.setItem("care_record_selected_model", model);
  };

  // テキストのAI解析リクエスト
  const handleAnalyzeText = async () => {
    setIsAnalyzing(true);
    showNotification("info", "AIがテキストを解析しています。しばらくお待ちください...");
    
    try {
      const startTime = performance.now();
      const customApiKey = localStorage.getItem("care_record_gemini_api_key");
      const res = await axios.post(`${API_BASE_URL}/api/analyze-text`, {
        text: inputText,
        model_name: selectedModel,
        user_master: userMaster,
        api_key: customApiKey || undefined,
      });
      const endTime = performance.now();
      console.log(`AI解析時間: ${(endTime - startTime).toFixed(1)}ms`);

      // 解析結果の反映
      const analyzedData: Partial<CareRecordData> = res.data;
      
      // null や undefined の値をクリアしつつマージ
      const mergedData = { ...initialFormData };
      
      // 日付はデフォルト本日だが、解析結果があれば上書き
      if (analyzedData.record_date) mergedData.record_date = analyzedData.record_date;
      
      Object.keys(initialFormData).forEach((k) => {
        const key = k as keyof CareRecordData;
        const val = analyzedData[key];
        if (val !== undefined && val !== null) {
          (mergedData as any)[key] = val;
        }
      });

      setFormData(mergedData);
      setPhase("form");
      showNotification("success", "解析が完了しました。内容をご確認ください。");
    } catch (error) {
      console.error("AI解析に失敗しました", error);
      showNotification("error", "AI解析に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // kintone 保存リクエスト
  const handleSaveToKintone = async (forceInput: any = false) => {
    const force = typeof forceInput === "boolean" ? forceInput : false;
    setIsSaving(true);
    showNotification("info", "kintoneにデータを送信しています...");
    try {
      // 数値項目で空文字列のものを null に変換してから送信する
      const cleanedData = { ...formData };
      const numericFields: (keyof CareRecordData)[] = [
        "kt_am", "kt_pm", "hr", "spo2", "rr", "food_main", "food_side", 
        "urine_count", "stool_count", "suction_count"
      ];
      numericFields.forEach((field) => {
        if (cleanedData[field] === "") {
          (cleanedData as any)[field] = null;
        }
      });

      const payload = {
        ...cleanedData,
        force: force
      };

      const res = await axios.post(`${API_BASE_URL}/api/save-to-kintone`, payload);
      
      if (res.data.status === "conflict") {
        setConflicts(res.data.conflicts);
        setConflictModalOpen(true);
        showNotification("error", "すでに登録されている項目があります。内容を確認してください。");
        return;
      }

      if (res.data.status === "success") {
        if (res.data.mode === "update") {
          showNotification("success", `既存レコード（ID: ${res.data.id}）を更新・追記マージしました。`);
        } else {
          showNotification("success", `新規レコード（ID: ${res.data.id}）をkintoneに登録しました。`);
        }
        // フォームリセット
        setInputText("");
        setFormData(initialFormData);
        setPhase("input");
        setConflictModalOpen(false);
        setConflicts({});
      }
    } catch (error) {
      console.error("kintone保存に失敗しました", error);
      showNotification("error", "kintoneへの登録に失敗しました。接続設定を確認してください。");
    } finally {
      setIsSaving(true); // kintone登録完了後にスピナーを消す
      setIsSaving(false);
    }
  };

  const handleFieldChange = (field: keyof CareRecordData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* 通知 */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3.5 rounded-2xl shadow-xl border animate-slide-in ${
          notification.type === "success"
            ? "bg-green-950/90 border-green-500/30 text-green-300"
            : notification.type === "error"
            ? "bg-red-950/90 border-red-500/30 text-red-300"
            : "bg-indigo-950/90 border-indigo-500/30 text-indigo-300"
        }`}>
          {notification.type === "success" && <CheckCircle2 size={18} />}
          {notification.type === "error" && <AlertTriangle size={18} />}
          {notification.type === "info" && <RefreshCw className="animate-spin" size={18} />}
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* ヘッダー */}
      <header className="w-full py-5 px-6 flex items-center justify-between border-b border-slate-900 bg-slate-950/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/10 rounded-xl border border-indigo-500/20 text-indigo-400">
            <FileText size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 leading-tight">はぁもにぃ</h1>
            <p className="text-xs text-slate-400">日誌・看護記録音声入力システム</p>
          </div>
        </div>

        {/* APIキー ステータス & 設定ボタン */}
        <div className="flex items-center gap-3">
          {hasApiKey ? (
            <div
              onClick={() => setIsGearOpen(true)}
              className="cursor-pointer inline-flex items-center gap-2 bg-slate-900/80 border border-green-500/30 text-green-300 px-3.5 py-1.5 rounded-full text-xs hover:bg-slate-800 transition-all shadow-sm"
              title="クリックして設定を開く"
            >
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              <span className="font-medium text-slate-300">
                Gemini API キー: <span className="text-green-400 font-semibold">登録済み</span>
              </span>
            </div>
          ) : (
            <div
              onClick={() => setIsGearOpen(true)}
              className="cursor-pointer inline-flex items-center gap-2 bg-amber-950/60 border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-full text-xs hover:bg-amber-900/80 transition-all shadow-sm animate-pulse"
              title="クリックして設定を開く"
            >
              <AlertTriangle size={14} className="text-amber-400 shrink-0" />
              <span className="font-medium text-amber-200">
                Gemini API キー: <span className="text-amber-400 font-bold">未登録</span>
              </span>
            </div>
          )}

          {/* 設定ボタン */}
          <button
            onClick={() => setIsGearOpen(true)}
            className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-100 border border-transparent hover:border-slate-700 transition-all duration-200"
            title="設定"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 md:py-12">
        {phase === "input" ? (
          <div className="flex flex-col gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">
                音声でかんたん介護記録
              </h2>
              <p className="mt-2 text-slate-400 text-sm md:text-base">
                マイクボタンを押して話すだけで、AIが項目ごとに自動でデータを抽出します。
              </p>
            </div>
            
            <VoiceInput
              text={inputText}
              onChangeText={setInputText}
              onAnalyze={handleAnalyzeText}
              isAnalyzing={isAnalyzing}
            />

            {/* 本日の kintone 登録データ閲覧ビューアー */}
            <TodayRecordViewer
              userMaster={userMaster}
              apiBaseUrl={API_BASE_URL}
            />
          </div>
        ) : (
          <RecordForm
            formData={formData}
            onChangeField={handleFieldChange}
            onSave={handleSaveToKintone}
            onBack={() => setPhase("input")}
            isSaving={isSaving}
            userMaster={userMaster}
          />
        )}
      </main>

      {/* フッター */}
      <footer className="w-full py-4 text-center border-t border-slate-900/60 text-xs text-slate-500">
        &copy; {new Date().getFullYear()} はぁもにぃ 日誌・看護記録音声入力システム. All rights reserved.
      </footer>

      {/* 設定モーダル */}
      <GearModal
        isOpen={isGearOpen}
        onClose={() => {
          setIsGearOpen(false);
          checkApiKeyStatus();
        }}
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
        apiBaseUrl={API_BASE_URL}
      />

      {/* 競合上書き確認モーダル */}
      <ConflictModal
        isOpen={conflictModalOpen}
        onClose={() => {
          setConflictModalOpen(false);
          setConflicts({});
        }}
        onConfirm={() => handleSaveToKintone(true)}
        conflicts={conflicts}
      />
    </div>
  );
}

export default App;
