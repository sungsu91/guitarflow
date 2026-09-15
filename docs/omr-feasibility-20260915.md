# FRETIVA PDF → 편집 악보: 로컬 OMR 조사 및 한 페이지 프로토타입

조사·검증일: 2026-09-15. **부분적으로 가능하며, 기타 TAB을 포함한 임의 PDF 전체 자동 변환은 아직 검증되지 않았다.**

실행 가능한 브라우저 WASM 엔진을 찾았고, 깨끗한 인쇄형 단일 오선보 PDF 한 페이지에서 실제 인식 → FRETIVA v2 변환 → 기존 편집기 → 수정/저장/재생 데이터 연결을 검증했다. 결과를 미리 만들어 반환하거나 PDF 텍스트에서 음을 추출하는 방식이 아니다. PDF.js의 페이지 픽셀을 실제 모델에 입력했다.

다만 이 시험은 도·레·미·파 4분음표 한 마디이며, 실제 기타 곡 전체의 정확도 검증이 아니다. 정식 앱에 범용 ‘PDF 자동 변환’ 버튼을 추가하지 않았다. 기존 기능은 그대로 두었고, 선택 설치하는 개발용 시험 화면으로 분리했다.

## 1. 현재 코드와 데이터

| 대상 | 현재 구현 | OMR 연결 판단 |
|---|---|---|
| 편집 원본 | `src/etudes/scoreModel.js`, `format: fretiva.etude`, version 2 | 기존 형식으로 어댑터 연결 가능 |
| 식별자 | 문서/마디/event/tone 각각 id | 원본 페이지와 인식 token → id 연결 가능 |
| 음표 | onset, duration, rest, notes[] | 한 event의 여러 notes는 동시음 |
| TAB | notes의 string 1–6, fret 0–24, locked | 줄·프렛이 실제 음의 기준 |
| 음높이 | tuning[string-1] + fret → MIDI | 오선보와 재생 모두 이 값에서 파생 |
| 기타 기보 | 오선보는 실제 MIDI보다 한 옥타브 높게 표기, 8vb 음자리표 | 입력 PDF가 일반 기보인지 기타 기보인지 확인 필요 |
| 컴파일 | `compileDocumentV2`, 마디 WeakMap 캐시 | 인식 후 한 음 수정에 전체 곡 생성 규칙을 다시 실행할 필요 없음 |
| 재생 | `scorePlayback.js`의 scoreTimeline | 기존 컴파일된 음높이/길이/시점 재사용 |
| 편집기 | `ScoreEditor.jsx` | 기존 커서, TAB 입력, Undo/Redo, 음·마디·주법 편집 재사용 |
| 사용자 저장 | `scoreLibrary.js`, localStorage `fretiva.etude.library.v2` | 새 문서 id로 저장. 기존 기록 유지 |
| PDF 저장 | `pdfLibrary.js`, IndexedDB `fretiva.pdf.library.v1` | scores 메타데이터와 files.pdfBlob 분리 |
| PDF 렌더 | `pdfRenderer.js`, PDF.js 5.4.624 | 기존 로컬 PDF Worker/리소스 재사용 |

현재 제약은 분명하다. duration은 온음표~16분음표 5종, 박자표는 2·3·4·6 / 4·8, 최대 64마디이다. 점음표, 셋잇단음표, 32분음표, 독립된 여러 성부를 그대로 표현할 수 없다. OMR이 읽었다고 모두 현재 편집기에 손실 없이 넣을 수 있는 것은 아니다. H/P/S·피킹·붙임줄 필드는 있으나 인식 모델 지원과 별개이다. 벤딩 등 일부 추가 필드는 기존 컴파일러도 표시/재생 미지원 안내를 낸다.

기존 MusicXML 가져오기와 OMR 런타임은 발견하지 못했다. PDF에 이미 편집 가능한 음표 데이터가 들어 있다고 취급하지 않았다.

## 2. 후보 엔진 비교

| 후보 | 실행 / 라이선스 | TAB 및 오선보 연결 | 크기·성능 / 판단 |
|---|---|---|---|
| CrispEmbed + TrOMR GGUF | C++/WASM, Worker. 엔진 MIT, 모델 Apache-2.0 | 오선보 시스템 이미지 인식. 6줄 TAB 및 원본 운지 연결은 확인되지 않음 | 실제 Q8 파일 32,552,896 bytes. 이번 단일 오선보 시험에 사용 |
| CrispEmbed + SMT GrandStaff | 같은 WASM 경로 후보. 모델 MIT | 피아노 grand staff → bekern. 기타 TAB 모델 아님 | 다운로드 파일 25,473,440 bytes. 이번 실제 변환 벤치마크에는 사용하지 않음 |
| Guitar Tab OMR | PyTorch + 별도 디코더. HF 라이선스 `other`, 구체적 재배포 조건 확인 필요 | 잘라낸 기타 TAB 한 시스템을 대상으로 설계. 오선보와 TAB 대응까지 확인되지 않음 | best.pt 약 194MB. 공개 ONNX/WASM 배포본 미확인, iPhone 즉시 적용 불가 |
| homr | Python 3.11/3.12, AGPL-3.0 | 서양 오선보 구조 분석 + TrOMR, MusicXML 출력. 기타 TAB 지원 미확인 | 브라우저용 전체 파이프라인을 바로 재사용할 수 없음. 이번 메모리/속도 미측정 |
| oemer | Python, ONNX Runtime 기반, MIT | 오선보 segmentation + 후처리. TAB 지원 미확인 | ONNX 사용이 곧 ONNX Runtime Web 호환 전체 앱이라는 뜻은 아님. 이번 실측 없음 |
| Audiveris | Java, AGPL-3.0 | 데스크톱 OMR 참고 대상 | Java 엔진을 React/iPhone PWA에 직접 포함하지 않음. 이번 실측 없음 |

근거: [CrispEmbed](https://github.com/CrispStrobe/CrispEmbed), [공식 WASM 예제](https://github.com/CrispStrobe/CrispEmbed/tree/main/examples/wasm-ocr), [TrOMR 모델](https://huggingface.co/cstr/tromr-GGUF), [SMT 모델](https://huggingface.co/cstr/smt-grandstaff-GGUF), [TAB 모델 설명](https://huggingface.co/kk9293/guitar-tab-omr), [TAB 모델 파일](https://huggingface.co/kk9293/guitar-tab-omr/tree/main), [homr](https://github.com/liebharc/homr), [oemer](https://github.com/BreezeWhite/oemer), [Audiveris](https://github.com/Audiveris/audiveris).

Guitar Tab OMR는 깨끗하게 잘린 한 시스템의 마디·박·음표·쉼표·튜플릿·튜닝/카포·기타 기법을 토큰으로 출력한다고 명시한다. 전체 PDF용 모델이 아니며 공개 검증은 renderer 기반 200샘플이다. 이를 사용자 악보에서의 정확도나 iPhone 지원으로 해석하지 않았다. 모델별 기호는 실제 샘플별 검증이 추가로 필요하다.

## 3. 실제 구현 범위

개발 서버에서 `http://127.0.0.1:5173/experiments/omr/`를 연다.

1. PDF 선택: 20MB 이하, 한 페이지·한 오선보 시스템만 허용. 사용자가 시스템 조건을 확인한다. 자동 시스템 탐지는 없다.
2. 기존 PDF.js로 최대 1800×900 범위로 비율 유지 렌더링한다. 전체 페이지를 모델에 보낸다. 이 범위 밖의 복잡한 지면은 이번 대상이 아니다.
3. 기존 PDF 보관함에서 지문 중복 확인 후 원본 Blob을 저장한다. 이미 있는 PDF는 덮어쓰지 않는다.
4. 전용 Web Worker의 CPU WASM에서 실제 TrOMR 분석. 상태는 준비/인식/완료로 표시한다. 근거 없는 백분율은 표시하지 않는다.
5. 원시 token 문자열과 인식 시간, WASM heap을 표시한다. `confidence=0`이 반환됐지만 음별로 교정된 확률인지 검증되지 않아 신뢰도 백분율로 쓰지 않는다. 모든 음이 확인 대상이다.
6. 제한된 token 어댑터가 음·마디·리듬으로 변환한다. 인식 결과에서 누락된 박자/조표를 자동 추측하지 않는다. 이번 어댑터는 treble/C조 및 기본 길이 단음·쉼표에 한정한다.
7. 사용자가 기보 옥타브와 각 음의 실제 줄·프렛을 선택한다. **이 TAB은 인쇄된 TAB 인식 결과가 아니다.** 기존 `fingeringCandidates`를 재사용한다. 자동 운지 알고리즘을 새로 만들지 않았다.
8. 기존 `ScoreEditor`를 직접 연다. 저장 버튼은 기존 `saveLibraryDocument`를 호출한다. 편집된 결과를 일반 보관함에서도 사용할 수 있다.

취소는 Worker terminate로 처리한다. PDF.js 작업 종료 시 task.destroy, 분석 후 Worker 종료로 리소스를 해제한다. 취소 도중 이미 완료된 원본 저장은 되돌려 삭제하지 않는다. 1페이지 시험판은 다중 페이지·분석 재개를 지원하지 않는다.

### 저장 연결

- 원본: 기존 IndexedDB files의 PDF Blob, SHA-256 유지.
- 최신 원시 분석: 해당 scores 레코드의 추가 필드 `omrPrototype`에 runId/raw/unsupported/page/engine 저장. 기본 PDF 설정을 변경하지 않는다.
- 편집 문서: 기존 v2 사용자 보관함. `origin.sourcePdfId`, `origin.runId` 연결.
- 문서 `omr`에 raw, reviewed:false, octaveShift와 sourceMap 유지. sourceMap은 page/measureId/eventId/tokenIndex이며 **좌표는 null**이다. 모델이 주지 않은 음별 사각형을 꾸며내지 않는다.
- 사용자 수정은 기존 문서에 저장되며 원시 인식 문자열과 PDF는 그대로 남는다. 서로 다른 저장소 간 원자적 트랜잭션은 만들지 않았다. PDF는 성공했지만 편집본 저장이 실패하면 기존 편집기의 실패 안내를 따른다.
- 원본 재분석은 새 runId를 쓰며 저장된 사용자 편집본을 덮어쓰지 않는다. PDF 쪽에는 최신 분석만 남고 이전 편집본은 자체 raw를 보유한다.
- 분석 결과 재개 UI, 결과 이력 관리, OMR 메타데이터의 백업 복원 호환 검증, 원본 삭제 시 연결 관리, 편집 악보의 마지막 재생 위치 저장은 아직 구현하지 않았다.

## 4. 실제 시험 결과

환경: 이 PC의 Windows Chrome headless, CPU WASM 단일 Worker. 실제 iPhone이나 기타 연주 검증은 아니다.

자체 제작한 흰 배경 PDF: 높은음자리표, C조, 4/4, C4–D4–E4–F4, 4분음표 한 마디. 모델에 정답 token은 전달하지 않았다.

실제 반환:

```text
clef-G2+keySignature-CM+timeSignature-4/4+note-C4_quarter+note-D4_quarter+note-E4_quarter+note-F4_quarter+barline
```

| 검사 | 결과 |
|---|---|
| 단일 PDF 음높이·길이·박자 | 이 4음 fixture 일치 |
| 인식 계산 | 별도 반복 시험 약 1.20초, 모델 준비 약 0.56초. 기기별 보장값 아님 |
| 모델 파일 | 32,552,896 bytes; WASM 3,528,114 bytes |
| WASM heap | 441,581,568 bytes ≈ 421MiB. 프로세스 전체 RSS나 최대 메모리가 아님 |
| UI 반응 | 자동시험 20ms 타이머 122회 진행, 관찰한 최대 간격 약 64.8ms. 완전 무지연/60fps 보장은 아님 |
| 네트워크 | 브라우저 시험에서 localhost 이외 요청 차단, 외부 요청 0. 사용자 PDF 업로드 없음 |
| TAB / 오선보 / 재생 | 컴파일 MIDI [60,62,64,65]와 재생 MIDI 일치. 기존 기타 오선보 옥타브 표기 별도 검사 |
| 한 음 수정 | 첫 음 프렛 수정, 나머지 음 데이터 동일 |
| Undo / Redo / 저장 / reload | 실제 기존 편집기에서 통과 |
| 원본 보존 | 저장 전후 PDF SHA-256 일치, 원시 OMR 문자열 유지 |
| 취소 | 취소 후 결과 덮어쓰기 없이 중단 확인 |
| 어댑터 자동검사 | 4 tests 통과: 데이터 연결, 미지원 차단, 운지/옥타브 검증, 초안 보존 |
| 앱 build | 통과. 기존 큰 chunk 경고 존재 |
| 여러 페이지 처리 시간 | 미측정·미구현. 한 페이지 시간을 단순 곱해 실측처럼 보고하지 않음 |

처음에는 fixture에 앱의 dark CSS가 섞여 잘못된 인식 결과가 나왔다. 원본 생성 환경을 흰 배경으로 격리해 수정한 후 위 결과를 얻었다. 문서 전처리가 결과에 영향을 준다는 관찰이며 일반 정확도를 보장하는 자료는 아니다.

결과/화면: `artifacts/omr-prototype/results.json`, `review.png`, `existing-editor.png`, `clean-staff-one-page.pdf`. 이들은 기존 프로젝트 규칙에 따라 Git 제외 산출물이다.

## 5. iPhone·오프라인·메모리 판단

현재 CPU WASM 시험은 ONNX Runtime Web/WebGPU를 추가하지 않고 실행됐다. 실제 iOS Safari/PWA 메모리 압박, 백그라운드 전환, 발열/강제 종료, 긴 악보 메트로놈 타이밍은 아직 확인하지 않았다. iPhone 지원 완료로 표시할 수 없다.

설치 스크립트는 공개 엔진/모델을 다운로드한다. 추론은 다운로드된 로컬 파일만 사용한다. 첫 다운로드까지 인터넷 없이 되는 것은 아니다. OPFS 모델 캐시가 엔진에 존재하지만, 앱 shell 및 모델의 PWA 오프라인 배포/캐시 제거 정책까지 이번에 구현하지 않았다. 이 시험 화면은 Vite 개발 서버용이며 프로덕션 빌드에 포함되지 않는다.

대략적인 픽셀 버퍼 비용만 계산하면 A4 150dpi RGBA 한 장은 약 8.3MiB, 300dpi는 약 33.2MiB이다. 이것에 모델·중간 tensor·PDF 해석·화면 canvas가 더해진다. 이번 WASM 실측만 421MiB이므로 모든 페이지를 메모리에 동시에 두는 방식은 채택하면 안 된다. 다중 페이지를 확장한다면 한 페이지/시스템씩 처리하고 완료 결과를 저장한 뒤 버퍼를 폐기해야 한다.

## 6. 인식/변환 지원 경계

| 기호/정보 | 이번 상태 |
|---|---|
| 페이지 수 | PDF.js로 확인; 1페이지만 처리 |
| 시스템 탐지 | 없음. 한 시스템 입력을 사용자 확인 |
| 마디선·박자·C조·treble·기본 음높이 | 단순 fixture에서 확인 |
| 기본 쉼표·임시표 | 어댑터 형식 지원; 실제 이미지별 정확도 검증 아직 없음 |
| 다른 조표/음자리표 | 모델 범위와 무관하게 이번 어댑터는 차단 |
| 점음표·셋잇단음표·32분음표 | 현재 편집 모델 제약. 반올림/삭제하지 않고 차단 |
| 동시음·독립 성부 | 기존 문서에는 같은 길이 동시음 가능하지만 이번 어댑터에서는 차단 |
| 6줄 TAB·줄 번호·프렛·0·X | 이 모델로 확인 안 됨. 자동 인식 미구현 |
| 오선보+TAB 대응 | 미구현. 출력 TAB은 사용자 운지 지정으로만 생성 |
| TAB 외부 리듬 빔 | 인식 미구현. 변환 후 기존 표시 기능과 별개 |
| H/P/SL·붙임줄·피킹 | 인식/어댑터 미지원. 기존 편집기에서 직접 수정 가능 |
| BPM·튜닝 | 인식하지 않음. BPM 사용자가 설정, 현재 표준 튜닝 기준 후보 명시 |
| 음별 confidence·원본 위치 클릭 | 미구현. 전 음 대조 필요 안내만 제공 |

## 7. 현실적인 다음 단계

가장 작은 확장은 인쇄 오선보의 **사용자 지정 시스템 영역 → 로컬 인식 → 대조 → 기존 편집**이다. 현재 제한형 실행 결과가 근거다. 전체 지면의 시스템 탐지, 조표/리듬 지원, 신뢰도/좌표를 먼저 보완해야 한다.

기타 TAB 자동화를 하려면 TAB 전용 모델의 사용·재배포 조건을 확인하고, 브라우저용 encoder/decoder 변환 및 실제 기타 악보 평가가 필요하다. Python 가중치 파일만 추가하거나 일반 OCR로 숫자를 읽은 것을 음악 인식 완료라고 할 수 없다.

원본이 MusicXML 또는 기타 기보 파일로도 제공된다면 OMR을 거치지 않는 가져오기가 더 직접적이다. 다만 **FRETIVA의 MusicXML 가져오기는 현재 없으므로 별도 어댑터 작업이 필요하다.** 인식 엔진은 사용자가 자신의 데스크톱에서 실행하고 구조화된 결과를 가져오는 대안도 있지만, 이는 브라우저 내부 완전 자동 처리와 다른 흐름이다. 임의로 서버 업로드를 추가하지 않았다.

## 8. 실제 추가 파일 / 재현

- `src/omr/tromrAdapter.js`: 제한형 token → 기존 v2 어댑터.
- `experiments/omr/index.html`, `app.jsx`, `worker.js`, `prototype.css`: 기존 편집기를 재사용하는 개발용 시험 화면.
- `scripts/setup-omr-prototype.mjs`: 모델/런타임을 Git 제외 tmp에 설치. SHA-256 검증, 라이선스 사본 다운로드. upstream 변경 시 자동 수용하지 않음.
- `scripts/verify-omr-prototype.mjs`: 실제 모델 + PDF + 브라우저 + 기존 편집/저장 자동시험.
- `tests/omr-adapter.test.mjs`: 데이터 변환 경계 검사.
- 이 문서.

```powershell
node scripts/setup-omr-prototype.mjs
npm run dev -- --host 127.0.0.1
# 개발 서버 /experiments/omr/ 열기
node --test tests/omr-adapter.test.mjs
# PLAYWRIGHT_MODULE을 설치 환경에 맞게 설정한 후:
node scripts/verify-omr-prototype.mjs
npm run build
```

기존 앱 source 기능/저장 스키마 버전/편집기 내부를 이 OMR 작업 때문에 교체하지 않았다. 모델 파일을 Git에 추가하거나 배포하지 않았으며, 이번 프로토타입을 범용 OMR 완성본으로 간주하지 않는다.
