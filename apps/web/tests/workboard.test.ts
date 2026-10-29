import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseWorkboard } from '../src/lib/workboard.ts';

const source = `# 테스트 보드
- 갱신일: 2026-10-25
- 검증일: 2026-10-25
- 검증 요약: 합성 테스트

## 작업 목록

### WB01 | 로컬 개발 기반
- 상태: done
- 담당: 구현자 / 독립 검증자
- 우선순위: P0
- 내용: 테스트 작업
- 완료 기준: 검증 통과
- 선행 조건: 없음
- 검증: 테스트 결과

### WB02 | 다음 작업
- 상태: next
- 담당: 담당자
- 우선순위: P1
- 내용: 제안
- 완료 기준: 범위 정의
- 선행 조건: 사용자 결정
- 검증: 미착수
`;
test('repository Markdown is valid without fixing its future item counts or statuses', () => {
  const actual = readFileSync(new URL('../../../workboard.md', import.meta.url), 'utf8');
  const board = parseWorkboard(actual);
  assert.ok(board.items.length > 0);
  assert.equal(new Set(board.items.map(item => item.id)).size, board.items.length);
});
test('parses ordered tasks, metadata and all supported states', () => {
  const board = parseWorkboard(source);
  assert.deepEqual(board.items.map(item => [item.id, item.status]), [['WB01','done'],['WB02','next']]);
  assert.equal(board.verificationNote,'합성 테스트');
  for (const status of ['in-progress', 'decision'])
    assert.equal(parseWorkboard(source.replace('- 상태: done', `- 상태: ${status}`)).items[0].status,status);
});
test('accepts CRLF, colons in values, literal HTML and extra prose', () => {
  const board = parseWorkboard(source.replace(/\n/g,'\r\n').replace('로컬 개발 기반','로컬: <script>기반</script>') + '\r\n추가 논의 메모');
  assert.equal(board.items[0].title,'로컬: <script>기반</script>');
});
test('rejects missing fields, unknown status, duplicate fields and IDs', () => {
  for (const invalid of [
    source.replace('- 상태: done','- 상태: waiting'),
    source.replace(/- 담당: [^\r\n]+\r?\n/,''),
    source.replace('### WB02 |','### WB01 |'),
    source.replace('- 상태: done','- 상태: done\n- 상태: done'),
    source.replace('### WB01 |','### invalid |'),
    source.replace(/- 갱신일: [^\r\n]+/,'- 갱신일: yesterday'),
  ]) assert.throws(() => parseWorkboard(invalid));
});
test('ignores code examples without treating their fields or headings as tasks', () => {
  const withExample = source + '\n~~~md\n### WB99 | example\n- 상태: invalid\n~~~\n';
  assert.equal(parseWorkboard(withExample).items.length,2);
  assert.throws(() => parseWorkboard(source + '\n~~~md\n'));
});