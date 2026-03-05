# Goki-Room — ドローン配送空域管理システム

多数の利用者からのドローン配送依頼を自動処理し、空域上の衝突回避とポートへの安全着陸を実現するシステム。

## アーキテクチャ

```
┌─────────────┐     REST / WS     ┌──────────────┐
│  Frontend    │ ◄──────────────► │   Backend     │
│  React+TS    │                   │   FastAPI     │
│  Leaflet Map │                   │               │
└─────────────┘                   ├──────────────┤
                                   │  Services     │
                                   │  ├ Airspace   │  ← 衝突回避 (4Dグリッド予約)
                                   │  ├ Routing    │  ← 経路・高度計算
                                   │  ├ Fleet      │  ← ドローン自動割当
                                   │  └ PortSched  │  ← 着陸スロット管理
                                   ├──────────────┤
                                   │  SQLite DB    │
                                   └──────────────┘
```

## コア機能

| 機能 | 説明 |
|------|------|
| 配送依頼 API | ユーザーがピックアップ/配送ポートと荷物重量を指定して依頼 |
| ドローン自動割当 | 距離・バッテリー・積載量を考慮して最適なドローンを選択 |
| 衝突回避 | 4D空間グリッド (x, y, z, t) の予約テーブルで飛行経路の競合を検出・解消 |
| 高度レイヤリング | 飛行方位に基づく高度帯の自動分離 (4層: 50-200m) |
| 着陸スロット管理 | 各ポートの着陸パッド容量に基づくスロット予約制 |
| リアルタイム追跡 | WebSocket でドローン位置をリアルタイム配信 |
| シミュレーション | Tick 方式でドローンの移動・配送完了をシミュレーション |

## セットアップ

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

ブラウザで http://localhost:5173 を開く。

## 開発コマンド

```bash
# Backend lint
cd backend && ruff check .

# Backend tests
cd backend && pytest tests/ -v

# Frontend lint
cd frontend && pnpm lint

# Frontend type check
cd frontend && npx tsc -b --noEmit

# Frontend build
cd frontend && pnpm build
```

## API

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/api/health` | ヘルスチェック |
| GET/POST | `/api/ports` | ポート一覧 / 作成 |
| GET/POST | `/api/drones` | ドローン一覧 / 作成 |
| GET/POST | `/api/deliveries` | 配送依頼一覧 / 作成 (自動割当) |
| GET | `/api/deliveries/{id}/flight` | フライトプラン取得 |
| POST | `/api/simulation/seed` | デモデータ生成 |
| POST | `/api/simulation/tick` | シミュレーション1ステップ進行 |
| GET | `/api/simulation/stats` | システム統計 |
| WS | `/ws` | リアルタイムイベント配信 |

## 衝突回避アルゴリズム

1. **高度レイヤリング**: 飛行方位を4分割し、方位ごとに異なる高度帯を割当
2. **4Dグリッド予約**: 各フライトプランのウェイポイントを (x_cell, y_cell, z_layer, time_window) で予約
3. **衝突検出**: 新規フライトプラン承認前に既存予約との時間的重複をチェック
4. **自動解消**: 競合発生時、別の高度レイヤーへの移行を試行

## 技術スタック

- **Backend**: Python 3.12, FastAPI, SQLAlchemy, SQLite
- **Frontend**: React 18, TypeScript, Vite, Leaflet, TailwindCSS
- **Testing**: pytest, ruff, ESLint
