import os
import uvicorn
import datetime
import json
import logging
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import google.generativeai as genai
from google.generativeai.types import RequestOptions
import requests
from dotenv import load_dotenv

# ログ設定
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# .env ファイルの読み込み
load_dotenv()

app = FastAPI(title="介護記録音声入力システム API")

# CORS設定（フロントエンドからの接続を許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini API の初期化
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    logger.info("Gemini API configured successfully.")
else:
    logger.warning("GEMINI_API_KEY is not set. API calls will fail or run in fallback mode.")

# --- スキーマ定義 ---

class UserMasterEntry(BaseModel):
    full_name: str
    aliases: List[str]

class AnalyzeRequest(BaseModel):
    text: str
    model_name: str = "gemini-3.5-flash"  # デフォルトは実在するモデル名にする（呼び出しエラー回避用）
    user_master: List[UserMasterEntry]

# Gemini 構造化出力用の Pydantic モデル
class CareRecordSchema(BaseModel):
    record_date: str = Field(description="記録日。YYYY-MM-DD形式。テキストに日付指定がない限り、指定された本日日付を使用する。")
    user_name: str = Field(description="利用者氏名。利用者マスタから特定された正式氏名。")
    staff_in_charge: Optional[str] = Field(None, description="担当者名。")
    transport_pickup: Optional[str] = Field(None, description="送迎（迎え）。事業所が迎えに行った場合は「〇」、保護者送りの場合は「×」、判断不能は null。")
    transport_dropoff: Optional[str] = Field(None, description="送迎（送り）。帰りに事業所が送る場合は「〇」、保護者迎えの場合は「×」、判断不能は null。")
    entry_time: Optional[str] = Field(None, description="登所時刻。HH:MM形式。")
    exit_time: Optional[str] = Field(None, description="退所時刻。HH:MM形式。")
    kt_am: Optional[float] = Field(None, description="体温(AM)。単位は℃。")
    kt_pm: Optional[float] = Field(None, description="体温(PM)。単位は℃。")
    hr: Optional[int] = Field(None, description="心拍(HR)。単位はbpm。")
    spo2: Optional[int] = Field(None, description="SpO2。単位は%。")
    bp: Optional[str] = Field(None, description="血圧(BP)。テキストに血圧の具体的な言及がない場合は必ず null にしてください。言及がある場合のみ「120/80」などの形式で出力します。")
    rr: Optional[int] = Field(None, description="呼吸数(RR)。単位は回/分。")
    food_main: Optional[int] = Field(None, description="主菜摂取量。0から10の10段階評価。")
    food_side: Optional[int] = Field(None, description="副菜摂取量。0から10の10段階評価。")
    fluid_log: Optional[str] = Field(None, description="水分記録。水分摂取の内容や量。")
    urine_count: Optional[int] = Field(None, description="尿回数。")
    stool_count: Optional[int] = Field(None, description="便回数。")
    rehab_status: Optional[str] = Field(None, description="リハビリ実施。実施した文脈があれば「〇」、なければ null。")
    bath_status: Optional[str] = Field(None, description="入浴実施。実施した文脈があれば「〇」、なければ null。")
    suction_count: Optional[int] = Field(None, description="吸引回数。")
    seizure_log: Optional[str] = Field(None, description="発作記録。常体（〜である、〜を行う）で記述。")
    medication_status: Optional[str] = Field(None, description="投薬・処置。常体（〜である、〜を行う）で記述。")
    remarks: Optional[str] = Field(None, description="備考。常体（〜である、〜を行う）で記述。")

class SaveRequest(BaseModel):
    record_date: str
    user_name: str
    staff_in_charge: Optional[str] = None
    transport_pickup: Optional[str] = None
    transport_dropoff: Optional[str] = None
    entry_time: Optional[str] = None
    exit_time: Optional[str] = None
    kt_am: Optional[float] = None
    kt_pm: Optional[float] = None
    hr: Optional[int] = None
    spo2: Optional[int] = None
    bp: Optional[str] = None
    rr: Optional[int] = None
    food_main: Optional[int] = None
    food_side: Optional[int] = None
    fluid_log: Optional[str] = None
    urine_count: Optional[int] = None
    stool_count: Optional[int] = None
    rehab_status: Optional[str] = None
    bath_status: Optional[str] = None
    suction_count: Optional[int] = None
    seizure_log: Optional[str] = None
    medication_status: Optional[str] = None
    remarks: Optional[str] = None
    force: Optional[bool] = False

# --- ダミーマスタデータ ---
DUMMY_USERS = [
    {"full_name": "大隅 太郎", "aliases": ["大隅", "大隅さん", "おおすみ"]},
    {"full_name": "山田 花子", "aliases": ["山田", "花子さん", "はなこ"]},
    {"full_name": "佐藤 一郎", "aliases": ["佐藤", "佐藤さん", "いちろう"]},
    {"full_name": "鈴木 智子", "aliases": ["鈴木", "鈴木さん", "ともこ", "スーちゃん"]}
]

# --- ヘルパー関数 ---

def get_kintone_headers(token: str, has_body: bool = True) -> Dict[str, str]:
    headers = {
        "X-Cybozu-API-Token": token
    }
    if has_body:
        headers["Content-Type"] = "application/json"
    return headers

def try_gemini_analysis(text: str, model_name: str, system_instruction: str, schema: Any) -> Optional[Dict[str, Any]]:
    """指定されたモデル名でGemini APIを呼び出す。失敗した場合は None を返す。"""
    if not GEMINI_API_KEY:
        return None
    try:
        logger.info(f"Attempting Gemini analysis with model: {model_name}")
        
        # schema が Pydantic モデルの場合、JSON Schema に変換して "default" や "anyOf" キーを調整する
        if hasattr(schema, "model_json_schema"):
            schema_dict = schema.model_json_schema()
            
            def clean_schema_recursive(d):
                if isinstance(d, dict):
                    # default と title の除外
                    d.pop("default", None)
                    d.pop("title", None)
                    
                    # anyOf を単一型かつ nullable=True にフラット化
                    if "anyOf" in d:
                        any_of_list = d.pop("anyOf")
                        non_null_types = [item for item in any_of_list if item.get("type") != "null"]
                        if non_null_types:
                            first_type = non_null_types[0]
                            d["type"] = first_type.get("type")
                            d["nullable"] = True
                            # $ref や properties などその他の属性をマージ
                            for k, v in first_type.items():
                                if k != "type":
                                    d[k] = v
                        else:
                            d["type"] = "string"
                            d["nullable"] = True
                            
                    for k, v in list(d.items()):
                        clean_schema_recursive(v)
                elif isinstance(d, list):
                    for item in d:
                        clean_schema_recursive(item)
            
            clean_schema_recursive(schema_dict)
        else:
            schema_dict = schema
        
        # 構造化出力の設定
        model = genai.GenerativeModel(
            model_name=model_name,
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": schema_dict,
                "temperature": 0.1,
            },
            system_instruction=system_instruction
        )
        
        response = model.generate_content(text)
        return json.loads(response.text)
    except Exception as e:
        logger.error(f"Gemini analysis failed for model {model_name}: {str(e)}")
        return None

def fallback_rule_based_parser(text: str, user_master: List[UserMasterEntry], current_date: str) -> Dict[str, Any]:
    """Gemini APIが失敗した場合、または利用不可の場合のルールベース・フォールバック・パーサー。"""
    logger.info("Running rule-based fallback parser.")
    result = {
        "record_date": current_date,
        "user_name": "",
        "staff_in_charge": None,
        "transport_pickup": None,
        "transport_dropoff": None,
        "entry_time": None,
        "exit_time": None,
        "kt_am": None,
        "kt_pm": None,
        "hr": None,
        "spo2": None,
        "bp": None,
        "rr": None,
        "food_main": None,
        "food_side": None,
        "fluid_log": None,
        "urine_count": None,
        "stool_count": None,
        "rehab_status": None,
        "bath_status": None,
        "suction_count": None,
        "seizure_log": None,
        "medication_status": None,
        "remarks": text  # 解析できない場合は、テキスト全体を備考に入れる
    }

    # 1. 利用者名寄せ
    for user in user_master:
        for alias in user.aliases:
            if alias in text:
                result["user_name"] = user.full_name
                break
        if result["user_name"]:
            break
    
    # 2. 送迎判断
    if "迎え" in text or "登所" in text or "来所" in text:
        if "保護者" in text or "親" in text or "送り" in text:
            result["transport_pickup"] = "×"
        else:
            result["transport_pickup"] = "〇"
            
    if "送り" in text or "帰宅" in text or "退所" in text:
        if "保護者" in text or "お迎え" in text:
            result["transport_dropoff"] = "×"
        else:
            result["transport_dropoff"] = "〇"

    # 3. 体温抽出（簡易正規表現風）
    import re
    temp_match = re.search(r"(\d{2}\.\d)度", text)
    if temp_match:
        val = float(temp_match.group(1))
        # 時間帯による簡易振り分け
        if "午後" in text or "PM" in text or "夕方" in text:
            result["kt_pm"] = val
        else:
            result["kt_am"] = val
            
    # 4. 水分量抽出
    fluid_match = re.search(r"(\d+)ml", text)
    if fluid_match:
        result["fluid_log"] = f"水分摂取 {fluid_match.group(1)}ml"

    # 5. リハビリ・入浴
    if "リハビリ" in text or "訓練" in text:
        result["rehab_status"] = "〇"
    if "入浴" in text or "お風呂" in text:
        result["bath_status"] = "〇"

    return result

# --- エンドポイント実装 ---

@app.post("/api/analyze-text")
async def analyze_text(request: AnalyzeRequest):
    current_date = datetime.date.today().strftime("%Y-%m-%d")
    
    # 利用者マスタを文字列化してプロンプトに埋め込む
    user_master_str = "\n".join([
        f"- 正式氏名: {u.full_name}, 呼び名(aliases): {', '.join(u.aliases)}"
        for u in request.user_master
    ])
    
    system_instruction = f"""あなたは介護記録の分析と構造化を行うAIアシスタントです。
入力された音声テキストと利用者マスタ情報（氏名と呼び名のリスト）に基づいて、介護記録用の構造化データ（JSON）を抽出・変換してください。

【抽出・変換ルール】
1. `user_name`: 利用者マスタの aliases（呼び名）を入力テキストから探し、合致した利用者の full_name（正式氏名）を特定して出力してください。近い呼び名や文脈から推測してもよいです。
2. `record_date`: テキスト内に明示的な日付指定がない限り、一律で「当日の日付（{current_date}）」を出力してください。
3. `entry_time` (登所時刻) / `exit_time` (退所時刻): 「朝9時半」「15時10分」などの口語表現を、厳密な24時間制の「HH:MM」形式（例: "09:30", "15:10"）に変換して抽出してください。
4. `transport_pickup` (送迎・迎え): 朝の来所（登所）の文脈から論理的に判断してください。「事業所が迎えに行った/お迎え」の場合は「〇」、「保護者が送ってきた/親御さんの送り」の場合は「×」を出力してください。判断不能な場合は null にしてください。
5. `transport_dropoff` (送迎・送り): 夕方の退所（帰宅）の文脈から論理的に判断してください。「事業所の車で送る/お送りする」の場合は「〇」、「保護者が迎えに来る/お迎え」の場合は「×」を出力してください。判断不能な場合は null にしてください。
6. `food_main` (主菜摂取量) / `food_side` (副菜摂取量): 食事の様子や摂取量の文脈を判断し、0から10の10段階の整数で評価してください。
   - 「完食」「全部食べた」「10割」 ➔ 10
   - 「ほぼ完食」「9割」 ➔ 9
   - 「半分食べた」「5割」 ➔ 5
   - 「3分の1食べた」 ➔ 3
   - 「全く食べなかった」「全残」 ➔ 0
7. `fluid_log` (水分記録): テキスト中の水分摂取（お茶、水分、ココアなど）に関する時間・内容・量を抽出し、「HH:MM 内容 量」（例: "10:00 お茶 200ml"）の書式に統一して出力してください。単位が「cc」の場合は「ml」に変換してください。複数回ある場合は改行で繋いでください。
8. `rehab_status` (リハビリ実施): 実施の文脈（頑張った、実施した等）があれば「〇」を出力してください。それ以外は null。
9. `bath_status` (入浴実施): 実施の文脈（お風呂に入った、入浴した等）があれば「〇」を出力してください。それ以外は null。
10. `seizure_log` (発作記録) / `medication_status` (投薬処置) / `remarks` (備考): 福祉・看護の公的記録にふさわしい専門的な文章（常体：「〜である」「〜を行う」）として個別に文章を抽出してください。

【利用者マスタ情報】
{user_master_str}

【当日日付】
{current_date}
"""

    # 1. ユーザー指定モデルでの解析を試行
    parsed_data = try_gemini_analysis(request.text, request.model_name, system_instruction, CareRecordSchema)
    
    # 2. 失敗した場合、公式の標準モデルでフォールバック試行
    if parsed_data is None and request.model_name != "gemini-3.5-flash":
        logger.info("Retrying analysis with fallback model: gemini-3.5-flash")
        parsed_data = try_gemini_analysis(request.text, "gemini-3.5-flash", system_instruction, CareRecordSchema)
    if parsed_data is None and request.model_name != "gemini-3.1-pro":
        logger.info("Retrying analysis with fallback model: gemini-3.1-pro")
        parsed_data = try_gemini_analysis(request.text, "gemini-3.1-pro", system_instruction, CareRecordSchema)
        
    # 3. それでもダメな場合、またはAPIキーがない場合はルールベースの簡易解析でフォールバック
    if parsed_data is None:
        parsed_data = fallback_rule_based_parser(request.text, request.user_master, current_date)
        
    return parsed_data


@app.post("/api/save-to-kintone")
async def save_to_kintone(record: SaveRequest):
    # kintone設定のロード
    domain = os.getenv("KINTONE_DOMAIN")
    if domain:
        domain = domain.replace("https://", "").replace("http://", "").strip("/")
    app_id = os.getenv("KINTONE_APP_ID", "51")
    api_token = os.getenv("KINTONE_API_TOKEN")
    
    if not domain or not api_token:
        # 環境変数が設定されていない場合は、ダミーの成功レスポンスを返す（ローカル検証用）
        logger.warning("KINTONE_DOMAIN or KINTONE_API_TOKEN is not configured. Running in Mock Save mode.")
        return {
            "status": "success",
            "mode": "mock",
            "message": "kintone接続設定がないため、擬似保存を行いました。",
            "data": record.model_dump()
        }
        
    url_records = f"https://{domain}/k/v1/records.json"
    url_record = f"https://{domain}/k/v1/record.json"
    headers = get_kintone_headers(api_token, has_body=False)
    
    # 1. 既存レコードの高速検索 (limit 1)
    # キー: record_date & user_name
    query = f'record_date = "{record.record_date}" and user_name = "{record.user_name}" limit 1'
    params = {
        "app": app_id,
        "query": query
    }
    
    try:
        response = requests.get(url_records, headers=headers, params=params)
        response.raise_for_status()
        search_result = response.json()
        records = search_result.get("records", [])
        
        # 保存データをkintone形式のフィールド値に変換する関数
        def to_kintone_fields(data_dict: Dict[str, Any]) -> Dict[str, Any]:
            fields = {}
            for k, v in data_dict.items():
                if v is not None:
                    fields[k] = {"value": v}
                else:
                    fields[k] = {"value": ""}
            return fields

        if records:
            # 既存レコードあり -> 更新 (PUT)
            existing_record = records[0]
            record_id = existing_record["$id"]["value"]
            logger.info(f"Existing record found (ID: {record_id}). Merging and updating...")
            
            # マージ対象の複数行テキストフィールド
            merge_fields = ["fluid_log", "seizure_log", "medication_status", "remarks"]
            # 数値加算（プラス）対象のフィールド
            add_fields = ["urine_count", "stool_count", "suction_count"]
            exclude_fields = ["record_date", "user_name", "force"]
            
            update_data = record.model_dump()
            force_save = update_data.get("force", False)
            
            conflicts = {}
            payload_fields = {}
            
            # 日本語の項目名マッピング
            field_names = {
                "staff_in_charge": "担当者名",
                "transport_pickup": "送迎（迎え）",
                "transport_dropoff": "送迎（送り）",
                "entry_time": "登所時刻",
                "exit_time": "退所時刻",
                "kt_am": "体温 (AM)",
                "kt_pm": "体温 (PM)",
                "hr": "心拍 (HR)",
                "spo2": "SpO2",
                "bp": "血圧 (BP)",
                "rr": "呼吸数 (RR)",
                "food_main": "主菜摂取量",
                "food_side": "副菜摂取量",
                "rehab_status": "リハビリ実施",
                "bath_status": "入浴実施"
            }
            
            # 全てのフィールドを処理
            for field_code, val in update_data.items():
                if field_code in exclude_fields:
                    continue
                    
                if field_code in merge_fields:
                    # 既存値の取得
                    existing_val = existing_record.get(field_code, {}).get("value", "")
                    new_val = val if val is not None else ""
                    
                    # 綺麗にマージ（改行で結合）
                    if existing_val and new_val:
                        merged_val = f"{existing_val}\n{new_val}"
                    else:
                        merged_val = existing_val if existing_val else new_val
                        
                    payload_fields[field_code] = {"value": merged_val}
                elif field_code in add_fields:
                    # 数値加算（プラス）マージ
                    existing_val_raw = existing_record.get(field_code, {}).get("value", None)
                    try:
                        existing_num = int(existing_val_raw) if existing_val_raw not in (None, "") else 0
                    except (ValueError, TypeError):
                        existing_num = 0
                        
                    try:
                        new_num = int(val) if val not in (None, "") else 0
                    except (ValueError, TypeError):
                        new_num = 0
                        
                    total_num = existing_num + new_num
                    if total_num > 0:
                        payload_fields[field_code] = {"value": total_num}
                    else:
                        payload_fields[field_code] = {"value": ""}
                else:
                    # それ以外
                    existing_val = existing_record.get(field_code, {}).get("value", None)
                    if existing_val == "":
                        existing_val = None
                        
                    # 今回の送信値が空（None または ""）の場合 ➔ 既存の値を保持（上書き消去しない）
                    if val is None or val == "":
                        payload_fields[field_code] = {"value": existing_val if existing_val is not None else ""}
                    else:
                        # 今回の送信値がある場合 ➔ 既存値があり、かつ値が異なる場合は競合
                        if existing_val is not None and str(existing_val) != str(val):
                            conflicts[field_code] = {
                                "name": field_names.get(field_code, field_code),
                                "existing": existing_val,
                                "new": val
                            }
                        payload_fields[field_code] = {"value": val}
                        
            # 競合が存在し、かつ強制フラグがない場合は競合ステータスを返す
            if conflicts and not force_save:
                logger.info(f"Conflict detected for record {record_id}: {conflicts}")
                return {
                    "status": "conflict",
                    "message": "すでに値が登録されている項目があります。上書きしますか？",
                    "conflicts": conflicts
                }
                        
            # PUTリクエストの送信
            put_payload = {
                "app": app_id,
                "id": record_id,
                "record": payload_fields
            }
            put_response = requests.put(url_record, headers=headers, json=put_payload)
            put_response.raise_for_status()
            logger.info(f"Record {record_id} updated successfully.")
            return {"status": "success", "mode": "update", "id": record_id}
            
        else:
            # 既存レコードなし -> 新規登録 (POST)
            logger.info("No existing record found. Creating new record...")
            post_payload = {
                "app": app_id,
                "record": to_kintone_fields(record.model_dump())
            }
            post_response = requests.post(url_record, headers=headers, json=post_payload)
            post_response.raise_for_status()
            post_result = post_response.json()
            new_id = post_result.get("id")
            logger.info(f"New record created with ID: {new_id}")
            return {"status": "success", "mode": "create", "id": new_id}
            
    except requests.exceptions.RequestException as e:
        logger.error(f"kintone API Error: {str(e)}")
        if e.response is not None:
            logger.error(f"Response: {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail=f"kintone API Error: {e.response.text}")
        raise HTTPException(status_code=500, detail=f"kintone Connection Failed: {str(e)}")


@app.get("/api/user-master")
async def get_user_master():
    domain = os.getenv("KINTONE_DOMAIN")
    if domain:
        domain = domain.replace("https://", "").replace("http://", "").strip("/")
    app_id = os.getenv("KINTONE_USER_MASTER_APP_ID", "38")
    api_token = os.getenv("KINTONE_USER_MASTER_API_TOKEN")
    
    if not domain or not api_token:
        # 環境変数がない場合はダミーデータを返す（検証用）
        logger.warning("KINTONE_DOMAIN or KINTONE_USER_MASTER_API_TOKEN is not configured. Returning Dummy User Master.")
        return DUMMY_USERS
        
    url = f"https://{domain}/k/v1/records.json"
    headers = get_kintone_headers(api_token, has_body=False)
    
    # 利用者マスタアプリから全件取得 (簡易的にlimit 500)
    # フィールドコード: full_name (正式氏名), aliases (呼び名 - 複数行テキストまたは文字列)
    # ※ aliasesはカンマ区切り、または改行区切りの文字列と想定し、リストに変換して返します
    params = {
        "app": app_id,
        "query": "limit 500"
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        records = response.json().get("records", [])
        
        users = []
        for r in records:
            full_name = r.get("full_name", {}).get("value", "")
            aliases_raw = r.get("aliases", {}).get("value", "")
            
            # aliasesのパース（改行やカンマ区切りの文字列をリストにする）
            aliases = []
            if aliases_raw:
                # 改行かカンマで分割
                separators = [",", "、", "\n"]
                temp_aliases = [aliases_raw]
                for sep in separators:
                    new_temp = []
                    for item in temp_aliases:
                        new_temp.extend(item.split(sep))
                    temp_aliases = new_temp
                aliases = [a.strip() for a in temp_aliases if a.strip()]
                
            if full_name:
                users.append({
                    "full_name": full_name,
                    "aliases": aliases
                })
                
        if not users:
            # 取得結果が空ならフォールバックでダミーを返す
            return DUMMY_USERS
            
        return users
        
    except Exception as e:
        logger.error(f"Failed to fetch user master from kintone: {str(e)}. Returning Dummy User Master.")
        return DUMMY_USERS

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
