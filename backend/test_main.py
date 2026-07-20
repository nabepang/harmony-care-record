import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# 環境変数のダミー設定
os.environ["GEMINI_API_KEY"] = "dummy_key"
os.environ["KINTONE_DOMAIN"] = "dummy.cybozu.com"
os.environ["KINTONE_APP_ID"] = "51"
os.environ["KINTONE_API_TOKEN"] = "dummy_token"

from main import app

client = TestClient(app)

def test_get_user_master_fallback():
    """kintone接続に失敗、または未設定の場合にダミーマスタデータを返すかテスト"""
    # 接続エラーになるようにモック
    with patch("requests.get") as mock_get:
        mock_get.side_effect = Exception("Connection error")
        response = client.get("/api/user-master")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert data[0]["full_name"] == "大隅 太郎"

@patch("main.try_gemini_analysis")
def test_analyze_text_gemini_success(mock_try_analysis):
    """Gemini APIによる構造化解析が成功するパターン"""
    mock_try_analysis.return_value = {
        "record_date": "2026-07-08",
        "user_name": "大隅 太郎",
        "staff_in_charge": "佐藤",
        "transport_pickup": "〇",
        "transport_dropoff": "×",
        "kt_am": 36.5,
        "fluid_log": "水分 100ml",
        "rehab_status": "〇"
    }

    payload = {
        "text": "大隅さんが登所。熱は36.5度。リハビリも頑張りました。",
        "model_name": "gemini-3.5-flash",
        "user_master": [
            {"full_name": "大隅 太郎", "aliases": ["大隅", "大隅さん"]}
        ]
    }
    response = client.post("/api/analyze-text", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["user_name"] == "大隅 太郎"
    assert data["transport_pickup"] == "〇"
    assert data["kt_am"] == 36.5

@patch("main.try_gemini_analysis")
def test_analyze_text_fallback(mock_try_analysis):
    """Gemini APIが失敗した場合にルールベースのフォールバックパーサーが機能するかテスト"""
    mock_try_analysis.return_value = None  # APIエラーを模倣

    payload = {
        "text": "大隅さんが登所。熱は36.8度。お風呂にも入りました。",
        "model_name": "gemini-3.5-flash",
        "user_master": [
            {"full_name": "大隅 太郎", "aliases": ["大隅", "大隅さん"]}
        ]
    }
    response = client.post("/api/analyze-text", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["user_name"] == "大隅 太郎"
    assert data["transport_pickup"] == "〇"
    assert data["kt_am"] == 36.8
    assert data["bath_status"] == "〇"

@patch("requests.get")
@patch("requests.post")
def test_save_to_kintone_new_record(mock_post, mock_get):
    """kintoneに既存レコードがない場合、新規登録 (POST) されるかテスト"""
    # 既存レコード検索結果：空リスト
    mock_get_resp = MagicMock()
    mock_get_resp.json.return_value = {"records": []}
    mock_get_resp.raise_for_status = MagicMock()
    mock_get.return_value = mock_get_resp

    # 新規登録結果：ID 123
    mock_post_resp = MagicMock()
    mock_post_resp.json.return_value = {"id": "123"}
    mock_post_resp.raise_for_status = MagicMock()
    mock_post.return_value = mock_post_resp

    payload = {
        "record_date": "2026-07-08",
        "user_name": "大隅 太郎",
        "fluid_log": "麦茶 100ml"
    }
    response = client.post("/api/save-to-kintone", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["mode"] == "create"
    assert data["id"] == "123"

@patch("requests.get")
@patch("requests.put")
def test_save_to_kintone_existing_record_merge(mock_put, mock_get):
    """kintoneに既存レコードがある場合、複数行テキストがマージされて更新 (PUT) されるかテスト"""
    # 既存レコード検索結果：ID 999 のレコードが存在
    mock_get_resp = MagicMock()
    mock_get_resp.json.return_value = {
        "records": [
            {
                "$id": {"value": "999"},
                "fluid_log": {"value": "10:00 麦茶 100ml"},
                "remarks": {"value": "元気に過ごす。"}
            }
        ]
    }
    mock_get_resp.raise_for_status = MagicMock()
    mock_get.return_value = mock_get_resp

    # 更新結果
    mock_put_resp = MagicMock()
    mock_put_resp.raise_for_status = MagicMock()
    mock_put.return_value = mock_put_resp

    payload = {
        "record_date": "2026-07-08",
        "user_name": "大隅 太郎",
        "fluid_log": "14:00 スポーツドリンク 150ml",
        "remarks": "帰宅前少し眠そう。"
    }
    response = client.post("/api/save-to-kintone", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["mode"] == "update"
    assert data["id"] == "999"

    # PUTされたデータがマージされているか確認
    # mock_put.call_args[1]['json']['record'] で送信データを確認
    called_args = mock_put.call_args[1]['json']
    record = called_args["record"]
    assert record["fluid_log"]["value"] == "10:00 麦茶 100ml\n14:00 スポーツドリンク 150ml"
    assert record["remarks"]["value"] == "元気に過ごす。\n帰宅前少し眠そう。"
