import os
import requests
from dotenv import load_dotenv

load_dotenv()

domain = os.getenv("KINTONE_DOMAIN")
if domain:
    domain = domain.replace("https://", "").replace("http://", "").strip("/")

app_id_38 = int(os.getenv("KINTONE_USER_MASTER_APP_ID", "38").strip())
app_id_51 = int(os.getenv("KINTONE_APP_ID", "51").strip())

token_38 = os.getenv("KINTONE_USER_MASTER_API_TOKEN", "").strip()
token_51 = os.getenv("KINTONE_API_TOKEN", "").strip()

print("=== kintone 最終疎通確認 ===")

def test_kintone_get(label, app_id, token):
    url = f"https://{domain}/k/v1/records.json"
    headers = {
        "X-Cybozu-API-Token": token
    }
    params = {"app": app_id, "query": "limit 1"}
    try:
        res = requests.get(url, headers=headers, params=params)
        print(f"[{label}] HTTP {res.status_code}")
        if res.status_code == 200:
            records = res.json().get("records", [])
            print(f"  -> 疎通成功! 取得レコード数: {len(records)}件")
            if records:
                print(f"  -> レコードサンプル: {list(records[0].keys())[:3]}...")
        else:
            print(f"  -> 疎通失敗: {res.text}")
    except Exception as e:
        print(f"  -> エラー: {e}")

test_kintone_get("利用者マスタ (ID: 38)", app_id_38, token_38)
test_kintone_get("日誌・看護記録 (ID: 51)", app_id_51, token_51)
