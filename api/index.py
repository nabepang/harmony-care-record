import sys
import os

# バックエンドモジュールをロードできるようにsys.pathへ追加
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from main import app
