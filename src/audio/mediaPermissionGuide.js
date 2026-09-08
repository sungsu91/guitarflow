export function mediaPermissionGuide({ mobile = false, resource = "microphone" } = {}) {
  const label = resource === "camera" ? "카메라" : "마이크";
  const refresh = mobile
    ? "안내를 닫고 화면을 아래로 길게 당겼다 놓아 새로고침해주세요."
    : "안내를 닫고 브라우저를 새로고침해주세요.";
  return `${label} 사용이 허용되지 않았습니다.\n\n${refresh}\n다시 ${label}를 켜고 권한 창에서 ‘허용’을 선택해주세요.\n\n권한 창이 나오지 않으면 브라우저 설정에서 ${label} 권한을 허용해주세요.`;
}
