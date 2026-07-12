# ExWHYZ-Timeline コードクリーンアップ 変更提案書（v3.51）

## 📋 変更要件の整理

### v3.51 での変更要件

1. **クリーンアップ**: 現在のコードベースで未使用のインポート・関数を削除する

---

## 1. 現状（v3.50）と問題の詳細

### 現状

Highlights 関連コンポーネントを調査した結果、以下の未使用インポートが発見された：

| ファイル | 行 | 未使用インポート |
|---------|---|-----------------|
| `YearSection.tsx` | L3 | `Children`, `isValidElement`, `cloneElement` |

これらは `YearSection.tsx` のコード内で全く参照されていない死にコードである。

---

## 2. 変更詳細

### 2.1 YearSection.tsx

未使用の `Children`, `isValidElement`, `cloneElement` をインポートから削除。

```typescript
// 変更前
import { useState, Children, isValidElement, cloneElement } from 'react';

// 変更後
import { useState } from 'react';
```

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.51.md` | **新規** | 本変更提案書 |
| `components/Highlights/YearSection.tsx` | **修正** | 未使用インポート削除 |

---

## 4. 修正の影響範囲

| 項目 | 影響 | 備考 |
|------|------|------|
| ハイライト表示 | ✅ 変更なし | 動作に全く影響しない |
| タイムライン画面 | ✅ 変更なし | |
| `page.tsx` | ✅ 変更なし | |