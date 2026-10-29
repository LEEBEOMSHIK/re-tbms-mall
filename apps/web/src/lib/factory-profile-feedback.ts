// One-use, in-memory confirmation: no personal data or credentials are persisted.
let pending: string | null = null;
export function setProfileSavedFeedback(passwordChanged: boolean) {
 pending = passwordChanged ? '프로필을 저장했습니다. 비밀번호가 변경되어 다른 기기에서는 다시 로그인해야 합니다.' : '프로필을 저장했습니다.';
}
export function takeProfileSavedFeedback() { const message = pending; pending = null; return message; }
