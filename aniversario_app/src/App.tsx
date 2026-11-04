import { useCallback, useEffect, useMemo, useState } from 'react';
import { FilmGrain } from '@/components/FilmGrain';
import { Hud } from '@/components/Hud';
import { JumpToBottom } from '@/components/JumpToBottom';
import { Prologue } from '@/components/Prologue';
import { MemoryChapter } from '@/components/MemoryChapter';
import { Bridge } from '@/components/Bridge';
import { AfterReel } from '@/components/AfterReel';
import { bridgeScene, scenes, type MemoryPhoto } from '@/content/capsule';
import { splitIntoChapters } from '@/lib/chapters';
import { fetchAllMemories, fetchCover } from '@/services/memoriesApi';

function toPhoto(r: {
  id: string;
  imageUrl: string;
  caption: string;
  side: 'odd' | 'even';
  authorName: string;
  memoryDate: string;
}): MemoryPhoto {
  return {
    id: r.id,
    src: r.imageUrl,
    caption: r.caption,
    side: r.side,
    authorName: r.authorName,
    memoryDate: r.memoryDate,
  };
}

export default function App() {
  const [cover, setCover] = useState<MemoryPhoto | null>(null);
  const [memories, setMemories] = useState<MemoryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollToId, setScrollToId] = useState<string | null>(null);

  const loadMemories = useCallback(async () => {
    try {
      const [coverResult, rowsResult] = await Promise.allSettled([
        fetchCover(),
        fetchAllMemories(),
      ]);
      setCover(
        coverResult.status === 'fulfilled' && coverResult.value
          ? toPhoto(coverResult.value)
          : null,
      );
      if (rowsResult.status === 'fulfilled') {
        setMemories(rowsResult.value.map(toPhoto));
      } else {
        setMemories([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMemories();
  }, [loadMemories]);

  useEffect(() => {
    if (loading || !scrollToId) return;
    const id = scrollToId;
    const t = window.setTimeout(() => {
      document.getElementById(`memory-${id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      setScrollToId(null);
    }, 350);
    return () => window.clearTimeout(t);
  }, [loading, scrollToId, memories]);

  const [open] = scenes;
  const shown = loading ? [] : memories;
  const chapters = useMemo(() => splitIntoChapters(shown, 12), [shown]);

  const onMemoryCreated = useCallback(
    async (memoryId?: string) => {
      setLoading(true);
      await loadMemories();
      if (memoryId) setScrollToId(memoryId);
    },
    [loadMemories],
  );

  return (
    <>
      <FilmGrain />
      <Hud />
      <JumpToBottom />
      <main>
        <Prologue scene={open} photo={cover ?? undefined} loading={loading} isCover />
        {loading ? (
          <p className="slate" style={{ textAlign: 'center', padding: '20vh var(--gutter)' }}>
            Cargando recuerdos…
          </p>
        ) : (
          chapters.map((ch) => <MemoryChapter key={ch.roman} chapter={ch} />)
        )}
        <Bridge scene={bridgeScene} />
        <AfterReel
          onMemoryCreated={onMemoryCreated}
          onMemoriesChanged={() => void loadMemories()}
        />
      </main>
    </>
  );
}
