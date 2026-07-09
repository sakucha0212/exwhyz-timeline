import EventColumn from './EventColumn';
import TweetColumn from './TweetColumn';

interface Category {
  id: string;
  label: string;
  color: string;
  icon: string;
}

interface Event {
  id: string;
  title: string;
  category: string;
  description: string;
  officialSource?: {
    type: string;
    url: string;
  };
  tags: string[];
}

interface Tweet {
  tweetId: string;
  note?: string;
}

interface DayEntryProps {
  id?: string;
  date: string;
  events: Event[];
  tweets: Tweet[];
  categories: Category[];
  loading?: boolean;
}

export default function DayEntry({ id, date, events, tweets, categories, loading = false }: DayEntryProps) {
  // 日付を日本語形式にフォーマット
  const formatDate = (dateStr: string) => {
    // "YYYY-MM-DD" を直接パースしてタイムゾーンの影響を受けないようにする
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day); // ローカル時刻として生成
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[d.getDay()];
    return `${year}年${month}月${day}日（${weekday}）`;
  };

  return (
    <div id={id} className="mb-8">
      {/* 日付ヘッダー */}
      <div className="mb-4 pb-2 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <span className="mr-2">📅</span>
          {formatDate(date)}
        </h2>
      </div>

      {/* 2カラムレイアウト（デスクトップ）/ 1カラム（モバイル） */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 左カラム: 活動情報 */}
        <EventColumn events={events} categories={categories} />

        {/* 右カラム: Tweet情報 */}
        <TweetColumn tweets={tweets} loading={loading} />
      </div>
    </div>
  );
}
