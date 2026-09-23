import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
export function mediaPermissionGuide({ mobile = false, resource = "microphone" } = {}) {
  const label = resource === "camera" ? ko["audio.camera"] : ko["app.microphone"];
  const refresh = mobile
    ? ko["audio.closeThisMessageThenPullDownAndReleaseToRefresh"]
    : ko["audio.closeThisMessageThenRefreshYourBrowser"];
  return formatMessage(ko["audio.value1AccessWasDeniedValue2TurnOnValue3AgainAndChooseAllow"], { value1: label, value2: refresh, value3: label, value4: label });
}
