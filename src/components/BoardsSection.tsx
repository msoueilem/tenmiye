import { getBoards } from '@/features/boards/api.client';
import type { Board } from '@/types/boards';

function BoardCard({ board }: { board: Board }) {
  const isActive = board.status === 'active';
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {board.logoUrl && (
        <img
          src={board.logoUrl}
          alt={board.name}
          className="h-12 w-12 rounded-full object-cover"
        />
      )}
      <h3 className="text-primary font-semibold text-lg">{board.name}</h3>
      {board.description && (
        <p className="line-clamp-3 text-sm text-slate-500 dark:text-slate-400">
          {board.description}
        </p>
      )}
      <div className="mt-auto flex items-center gap-2 pt-2 text-xs text-slate-400">
        <span>
          {board.termStartDate.slice(0, 4)} – {board.termEndDate.slice(0, 4)}
        </span>
        {isActive && (
          <span className="rounded-full bg-green-700/30 px-2 py-0.5 text-green-400">
            نشط
          </span>
        )}
      </div>
    </div>
  );
}

export async function BoardsSection() {
  let boards: Board[] = [];
  try {
    boards = await getBoards();
  } catch {
    return null;
  }

  if (boards.length === 0) return null;

  const active = boards.filter((b) => b.status === 'active');
  const rest = boards.filter((b) => b.status !== 'active');
  const sorted = [...active, ...rest];

  return (
    <section className="py-4" dir="rtl">
      <div className="mb-6 flex items-center gap-2">
        <span className="bg-primary h-[2px] w-8"></span>
        <h2 className="text-primary font-bold">مجالس الإدارة</h2>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((board) => (
          <BoardCard key={board.id} board={board} />
        ))}
      </div>
    </section>
  );
}
