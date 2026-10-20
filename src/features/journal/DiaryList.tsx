import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { IconChevron } from "../../components/icons";
import { formatDayTime } from "../../lib/datetime";
import { findTree } from "../../lib/trees";
import { useStore } from "../../store";
import { EmptyCard } from "../../components/ui";
import { diaryRows, rowTitle, useDiary } from "./diary";
import { moodById } from "../mood/mood";

const formatAt = formatDayTime;

/** 我的日記：跟樹的每一次互動（打卡、摸摸樹、回報、樹洞）和當時的心情，新到舊 */
export function DiaryList() {
  const whispers = useStore((s) => s.whispers);
  const checkins = useStore((s) => s.checkins);
  const reports = useStore((s) => s.reports);
  const entries = useDiary().entries;
  const rows = useMemo(
    () => diaryRows({ checkins, whispers, reports, entries }),
    [checkins, whispers, reports, entries],
  );
  const ids = useMemo(() => [...new Set(rows.map((r) => r.treeId))], [rows]);
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    Promise.all(ids.map((id) => findTree(id))).then((trees) => {
      if (!alive) return;
      const next: Record<string, string> = {};
      trees.forEach((t, i) => {
        if (t) next[ids[i]] = `${t.district}・${t.species}`;
      });
      setLabels(next);
    });
    return () => {
      alive = false;
    };
  }, [ids]);

  if (rows.length === 0)
    return (
      <EmptyCard
        art="journal-empty"
        title="日記還是空白的"
        testId="journal-empty"
        action={
          <Link className="btn primary" to="/" data-testid="journal-empty-go">
            去地圖找一棵樹
          </Link>
        }
      >
        走到樹旁掃樹牌，跟樹打個招呼、摸摸它、留一句話，都會記在這裡，也可以加上當時的心情。
      </EmptyCard>
    );
  return (
    <ul className="journal-list" data-testid="journal-list">
      {rows.map((r, i) => {
        const mood = moodById(r.mood);
        return (
          <li key={`${r.kind}:${r.treeId}:${r.at}:${i}`}>
            <section
              className="card journal-item"
              data-testid="journal-item"
              data-kind={r.kind}
            >
              <span className="muted small">
                {formatAt(r.at)}・
                {labels[r.treeId] ?? <span className="mono">{r.treeId}</span>}
              </span>
              <span className="journal-what">
                <strong>{rowTitle(r)}</strong>
                {mood && (
                  <span
                    className="journal-mood"
                    data-testid="journal-mood"
                    data-mood={mood.id}
                  >
                    <span aria-hidden="true">{mood.emoji}</span> {mood.name}
                  </span>
                )}
              </span>
              {r.text && <span className="journal-text">{r.text}</span>}
              <Link
                className="journal-more"
                to={`/tree/${r.treeId}`}
                state={{ from: "/journal" }}
                data-testid="journal-view-tree"
              >
                查看樹木
                <IconChevron />
              </Link>
            </section>
          </li>
        );
      })}
    </ul>
  );
}
