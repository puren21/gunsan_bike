# 개발 브랜치 검증 기록 — 2026-10-23

운영 배포 없음. Supabase 조회·쓰기·삭제·스키마 변경 없음. 실제 편집 중인 도로 자료를 테스트에 사용하지 않음.
기준 main: `2401712965d4afee15eca1d570aed3b17c66e24d`.
GitHub Pages 설정을 읽기 전용으로 확인: `legacy`, `main`, `/`. 저장소 내 사용자 배포 workflow 없음. 이 PR은 병합하지 않으며 main 및 Pages 설정을 변경하지 않음.

## 1. 도로 자료

- `gunsan_bike_datasets`가 원본이라는 구조와 `save_gunsan_bike(p_data,p_revision)` 계약 유지. 마이그레이션, 원본 교체, 캐시→DB 자동 동기화 없음.
- 첫 접속: `revision,updated_at`만 no-store로 확인. 캐시가 없거나 버전이 다를 때만 data 포함 행 요청. 일치하면 로컬 캐시 사용.
- 전체 조회 중 다른 컴퓨터가 저장하면 data와 함께 받은 revision으로 기준 설정. 이전 메타데이터 버전을 붙이지 않음.
- 초기화는 한 번만 수행. 활성 편집기의 재호출은 기준 버전을 임의 갱신하지 않음. 중복 저장 차단.
- 기존 RPC에 원래 편집 기준 버전을 전달. 충돌·오프라인·인증 만료 시 작업 초안과 편집 상태 보존. 서버 확인이 없으면 저장 비활성 상태 유지.
- 저장 성공 후 캐시 삭제: 다음 방문은 서버 변환까지 포함한 원본을 새로 읽음.
- 캐시 키 `gunsan_bike:dataset-cache-v1`, schema=1. 알 수 없는 형식·손상 캐시 무시. 저장 용량 부족 시 서버 자료를 읽고 작업 가능하며, 캐시 실패가 초안 키를 건드리지 않음.
- 기존 로그인 키, v2/v3 초안 키, 속성 변환 유지. 캐시는 변환 전 자료 보관. 기존 초안의 기준이 일치하면 복원하고 미저장으로 표시; 다르면 자동 덮어쓰기 없이 이전 초안 내보내기 제공.
- 미저장 속성·도형 외에 가져오기 대기와 저장 진행 중에도 이탈 경고. 초안 저장 용량 부족 시 RPC 호출 전 중단.

## 2. 읽기 전용 행정경계

GitHub 정적 GeoJSON 원본 2개와 roads.geojson은 변경하지 않음. 별도 `data/display` 파일만 생성. 표시용 복사본은 좌표 소수 5자리 반올림과 JSON 공백 제거만 적용. 모든 지물·속성·좌표 개수 보존. 군산 위도에서 반올림에 따른 위치 오차는 약 0.8m 미만. 측량·원본 편집 용도가 아님. 꼭지점 제거에 따른 공유경계 불일치를 피하기 위해 이번 단계에서는 선 단순화하지 않음.

| 파일 | 원본 bytes | 표시용 bytes | 감소 |
|---|---:|---:|---:|
| 시경계 | 7,912,670 | 4,210,924 | 46.8% |
| 동경계 | 9,024,570 | 4,808,559 | 46.7% |

표시용 파일은 콘텐츠 해시 쿼리와 force-cache 사용. 실패 시 기존 정적 원본으로 대체하며 원본은 no-cache로 재검증. 경계 쓰기 API 추가 없음.
재생성: `python3 scripts/build-boundary-display.py`. 경계 갱신 시 출력 SHA256 앞 12자리를 index.html의 해당 표시용 파일 `?v=`에 반영해야 함.

## 3. 자동 테스트 결과

`node --test tests/cloud-storage.test.cjs tests/versioned-cache.test.cjs tests/edit-safety.test.cjs tests/boundary-display.test.cjs`

**25개 통과 / 실패 0개** (기존 저장 테스트 8개 + 신규 17개).

검증 범위: 동일 버전 캐시 재사용 및 전체 요청 생략, 변경 버전 무효화, 메타데이터/전체 조회 사이 변경, 두 독립 편집기 충돌, 초기화·저장 중복, 오프라인, 인증 갱신 실패, 캐시 손상·미래 schema·용량 부족, 비정상 원격 버전, 저장 실패 시 초안·편집 유지, 이전 v2 초안 복원/불일치, 이탈 경고, 경계 지물·속성·좌표 개수 및 오차·용량.

`node --test tests/*.test.cjs`: **63개 중 58개 통과 / 5개 실패**.
수정 전 main을 별도 임시 폴더에 추출하여 동일 실행: **46개 중 41개 통과 / 동일 5개 실패**.

기존 실패 목록 (이번 PR에서 편집 기능을 변경해 숨기지 않음):
- draw re-enables a previously disabled snap preference
- vertex re-enables a previously disabled snap preference
- merge tool opens with no selection; confirmation requires two lines
- popup contains only clicked line attributes and geometry length even with the same route name
- native marker movement updates snap preview using frames without a drag event

`node --check cloud-storage.js`, `node --check bike-tools.js`, 인라인 스크립트 구문 확인 및 `git diff --check` 통과.

## 4. 검증 한계 및 운영 전환 절차

충돌 테스트는 독립 브라우저 상태와 원자적 revision 비교를 모사한 **모의 서버** 사용. 저장 RPC의 실제 SQL 구현/원자성, 실제 두 컴퓨터의 브라우저 상호작용, 카카오 지도 시각 품질과 실제 네트워크 지연은 이번 작업에서 실증하지 않음. 기존 RPC가 모든 쓰기에서 revision을 원자적으로 비교·증가한다는 계약에 의존하며, DB 밖에서 revision 없이 수정하면 캐시 무효화도 보장할 수 없음.

운영 전환 전에 사용자에게 변경 내용·테스트 결과·위 한계를 안내하고 전환 시점을 협의해야 함. 즉시 병합/배포하지 말 것. 다음 단계는 운영 자료와 분리된 테스트 DB로 기존/신규 클라이언트 혼용 및 실제 RPC 동시 저장을 확인하고, 두 브라우저에서 편집·초안 복원·경계 시각 확인 후 기존 실패 5개를 검토하는 것. 실서비스에 테스트 도형을 저장하지 말 것.

전환 시 모든 컴퓨터는 미저장 작업을 내보내거나 저장한 뒤 새 버전을 열도록 안내. 되돌릴 경우 코드만 이전 버전으로 복원하며 DB 원본은 되돌리지 않음. 캐시·초안은 분리되어 있으므로 코드 롤백 시 초안을 삭제할 필요 없음.
