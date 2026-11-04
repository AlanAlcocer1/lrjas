import { useCallback, useEffect, useMemo, useState } from 'react';
import { FilmGrain } from '@/components/FilmGrain';
import { Hud } from '@/components/Hud';
import { JumpToBottom } from '@/components/JumpToBottom';
import { Prologue } from '@/components/Prologue';
import { MemoryChapter } from '@/components/MemoryChapter';
import { Bridge } from '@/components/Bridge';
import { AfterReel } from '@/components/AfterReel';
import { bridgeScene, fallbackMemories, scenes, type MemoryPhoto } from '@/content/capsule';
import { splitIntoChapters } from '@/lib/chapters';
import { fetchAllMemories } from '@/services/memoriesApi';

export default function App() {
  const [memories, setMemories] = useState<MemoryPhoto[]>(fallbackMemories);
  const [loading, setLoading] = useState(true);

  const loadMemories = useCallback(async () => {
    try {
      const rows = await fetchAllMemories();
      if (rows.length) {
        setMemories(
          rows.map((r) => ({
            id: r.id,
            src: r.imageUrl,
            caption: r.caption,
            side: r.side,
            authorName: r.authorName,
            memoryDate: r.memoryDate,
          })),
        );
      } else {
        setMemories(fallbackMemories);
      }
    } catch {
      setMemories(fallbackMemories);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMemories();
  }, [loadMemories]);

  const [open] = scenes;
  const shown = loading ? [] : memories;
  const chapters = useMemo(() => splitIntoChapters(shown, 12), [shown]);

  return (
    <>
      <FilmGrain />
      <Hud />
      <JumpToBottom />
      <main>
        <Prologue scene={open} photo={shown[0]} loading={loading} />
        {loading ? (
          <p className="slate" style={{ textAlign: 'center', padding: '20vh var(--gutter)' }}>
            Cargando recuerdos…
          </p>
        ) : (
          chapters.map((ch) => <MemoryChapter key={ch.roman} chapter={ch} />)
        )}
        <Bridge scene={bridgeScene} />
        <AfterReel onMemoryCreated={() => void loadMemories()} />
      </main>
    </>
  );
}
