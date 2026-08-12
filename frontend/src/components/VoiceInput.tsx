import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, AlertCircle, User } from "lucide-react";

// Web Speech API の型定義を補う
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface UserMasterEntry {
  full_name: string;
  aliases: string[];
}

interface VoiceInputProps {
  text: string;
  onChangeText: (text: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  selectedUser: string;
  onSelectUser: (userName: string) => void;
  userMaster: UserMasterEntry[];
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  text,
  onChangeText,
  onAnalyze,
  isAnalyzing,
  selectedUser,
  onSelectUser,
  userMaster,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>("");

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg("お使いのブラウザは音声認識をサポートしていません。Google Chrome等のモダンブラウザをご利用ください。");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "ja-JP";

    rec.onstart = () => {
      setIsListening(true);
      setErrorMsg(null);
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error", event);
      if (event.error === "not-allowed") {
        setErrorMsg("マイクの使用が許可されていません。ブラウザの設定をご確認ください。");
      } else {
        setErrorMsg(`音声認識エラー: ${event.error}`);
      }
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      const currentText = finalTranscriptRef.current + interimTranscript;
      onChangeText(currentText);
    };

    recognitionRef.current = rec;
  }, [onChangeText]);

  // テキストクリア関数（ボタン等から呼び出し）
  const handleClearText = () => {
    finalTranscriptRef.current = "";
    onChangeText("");
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // 新規録音開始時は認識バッファと表示テキストを完全クリア
      finalTranscriptRef.current = "";
      onChangeText("");
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Speech recognition start failed", err);
      }
    }
  };

  const handleManualAnalyze = () => {
    if (isListening) {
      recognitionRef.current.stop();
    }
    if (text.trim()) {
      onAnalyze();
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* エラー表示 */}
      {errorMsg && (
        <div className="w-full p-4 bg-red-950/40 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-red-200 text-sm">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 対象利用者選択エリア */}
      <div className="w-full bg-slate-900/80 border border-indigo-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
            <User size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">記録対象の利用者</span>
              {selectedUser && (
                <span className="bg-indigo-950 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded text-[11px] font-semibold">
                  本日キープ中
                </span>
              )}
            </div>
            <p className="text-base font-bold text-slate-100 mt-0.5">
              {selectedUser ? `${selectedUser} さんの記録` : "利用者を選択してください"}
            </p>
          </div>
        </div>

        <div className="w-full sm:w-64">
          <select
            value={selectedUser}
            onChange={(e) => onSelectUser(e.target.value)}
            className="w-full premium-input px-3.5 py-2.5 rounded-xl text-sm font-semibold border-indigo-500/30 focus:border-indigo-400"
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

      {/* テキスト入力エリア */}
      <div className="w-full relative glass-panel p-1.5 glow-border">
        <textarea
          value={text}
          onChange={(e) => {
            finalTranscriptRef.current = e.target.value;
            onChangeText(e.target.value);
          }}
          placeholder="ここをタップして直接キーボード入力するか、下のマイクボタンを押して声で入力してください..."
          className="w-full h-64 bg-transparent border-0 resize-none text-slate-100 placeholder-slate-500 focus:ring-0 focus:outline-none p-4 text-lg leading-relaxed"
          disabled={isAnalyzing}
        />
        {text && (
          <button
            onClick={handleClearText}
            className="absolute top-4 right-4 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded transition-colors"
          >
            クリア
          </button>
        )}
      </div>

      {/* 音声入力ボタン / 操作エリア */}
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center mt-2">
        {/* 録音ボタン */}
        <button
          onClick={toggleListening}
          disabled={isAnalyzing}
          className={`relative flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 ${
            isListening
              ? "bg-red-500 text-white pulse-mic"
              : "bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]"
          }`}
        >
          {isListening ? <MicOff size={36} /> : <Mic size={36} />}
        </button>

        {/* 確定・解析ボタン */}
        <button
          onClick={handleManualAnalyze}
          disabled={isAnalyzing || !text.trim()}
          className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 active:scale-98 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-indigo-500/25 transition-all duration-200"
        >
          {isAnalyzing ? "AIで記録を解析中..." : "記録を解析する"}
        </button>
      </div>

      {isListening && (
        <span className="text-sm font-semibold text-indigo-400 animate-pulse">
          音声を認識しています。話し終わったらマイクをもう一度タップするか、「解析する」ボタンを押してください。
        </span>
      )}
    </div>
  );
};
