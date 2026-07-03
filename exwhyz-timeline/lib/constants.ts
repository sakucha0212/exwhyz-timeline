/**
 * クライアント・サーバー共通の定数
 * ※ このファイルはブラウザバンドルに含まれるため、サーバー専用ライブラリを import しないこと
 */

/**
 * アーカイブ検索の開始日時（ExWHYZ活動開始月）
 * 環境変数 NEXT_PUBLIC_ARCHIVE_START_DATE で上書き可能（クライアント側）
 * サーバー側は TWITTER_ARCHIVE_START_DATE を使用（lib/twitter-api.ts）
 */
export const ARCHIVE_START_DATE_CLIENT: string =
  process.env.NEXT_PUBLIC_ARCHIVE_START_DATE ?? '2022-06-01T00:00:00Z';

/**
 * アーカイブ検索の終了日時（ExWHYZ活動終了日）
 * 環境変数 NEXT_PUBLIC_ARCHIVE_END_DATE で上書き可能（クライアント側）
 */
export const ARCHIVE_END_DATE_CLIENT: string =
  process.env.NEXT_PUBLIC_ARCHIVE_END_DATE ?? '2026-09-30T23:59:59Z';
