export const boardStatuses = ['in-progress', 'next', 'decision', 'done'] as const;
export type BoardStatus = typeof boardStatuses[number];
export type WorkItem = {
  id: string; title: string; status: BoardStatus; owner: string; priority: string;
  summary: string; acceptance: string; dependency: string; verification: string;
};
export type Workboard = {
  title: string; updatedAt: string; lastVerifiedAt: string; verificationNote: string; items: WorkItem[];
};
const metaLabels = { '갱신일': 'updatedAt', '검증일': 'lastVerifiedAt', '검증 요약': 'verificationNote' } as const;
const itemLabels = { '상태': 'status', '담당': 'owner', '우선순위': 'priority', '내용': 'summary',
  '완료 기준': 'acceptance', '선행 조건': 'dependency', '검증': 'verification' } as const;
export function parseWorkboard(markdown: string): Workboard {
  const meta: Record<string, string> = {};
  const items: WorkItem[] = [];
  let current: Record<string, string> | undefined;
  let title = '';
  let fence: string | undefined;
  const fail = (message: string): never => { throw new Error(message); };
  const finish = () => {
    if (!current) return;
    for (const field of Object.values(itemLabels)) if (!current[field]) fail(`${current.id}: ${field} 필수`);
    if (!boardStatuses.includes(current.status as BoardStatus)) fail(`${current.id}: 알 수 없는 상태`);
    if (!/^P[0-3]$/.test(current.priority)) fail(`${current.id}: 우선순위는 P0–P3`);
    if (items.some(item => item.id === current!.id)) fail('중복 작업 ID');
    items.push(current as WorkItem);
    current = undefined;
  };
  for (const line of markdown.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n')) {
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1];
      else if (fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = undefined;
      continue;
    }
    if (fence) continue;
    if (line.startsWith('# ')) {
      if (title) fail('문서 제목 중복');
      title = line.slice(2).trim();
      continue;
    }
    if (line.startsWith('### ')) {
      finish();
      const heading = /^### (WB\d+) \| (.+)$/.exec(line);
      if (!heading || !heading[2].trim()) fail('작업 제목 형식 오류');
      current = { id: heading![1], title: heading![2].trim() };
      continue;
    }
    if (line.startsWith('## ')) { finish(); continue; }
    const field = /^- ([^:]+):\s*(.*)$/.exec(line);
    if (!field) continue;
    const labels: Record<string, string> = current ? itemLabels : metaLabels;
    const key = labels[field[1].trim()];
    if (!key) continue;
    const target = current ?? meta;
    if (key in target) fail('필드 중복');
    target[key] = field[2].trim();
  }
  finish();
  if (fence) fail('코드 블록이 닫히지 않음');
  if (!title) fail('문서 제목 필수');
  for (const field of Object.values(metaLabels)) if (!meta[field]) fail('문서 메타데이터 필수');
  for (const field of ['updatedAt', 'lastVerifiedAt']) if (!/^\d{4}-\d{2}-\d{2}$/.test(meta[field])) fail('날짜 형식 오류');
  if (!items.length) fail('작업이 하나 이상 필요');
  return { title, updatedAt: meta.updatedAt, lastVerifiedAt: meta.lastVerifiedAt, verificationNote: meta.verificationNote, items };
}