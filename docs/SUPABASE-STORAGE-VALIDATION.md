# 운영 저장 SQL·권한 확인 및 PostgreSQL 동시 저장 검증

2026-10-23, PR #1 운영 배포 이후 수행. 운영 테이블·함수·권한·정책 변경 없음. 운영 도로 자료를 복제하거나 시험 저장하지 않음. 관리 화면에서는 카탈로그 SELECT만 실행.

## 운영 DB에서 직접 확인한 사항

앱 안 브라우저의 기존 Supabase 로그인으로 대상 프로젝트 관리 접근 가능. 이전 Safari 로그인과 달리 기존 프로젝트가 확인됨. 다음 내용을 읽기 전용으로 조회하여 실제 구현을 확인함:

- PostgreSQL **17.6**.
- `save_gunsan_bike(jsonb,bigint)`는 `SECURITY DEFINER`, `search_path=public, pg_temp`.
- 지정 편집 계정인지 확인하고 FeatureCollection·features 배열을 검사함.
- `pg_advisory_xact_lock(73194201)`와 `SELECT ... FOR UPDATE` 후 버전을 비교함. 불일치 시 SQLSTATE **40001**로 거부.
- 이전 버전을 history에 기록한 뒤 data와 revision을 하나의 트랜잭션에서 반영함.
- 원본/이력 모두 RLS 활성화. 익명·로그인 역할 모두 원본 테이블 직접 INSERT/UPDATE/DELETE 불가.
- 익명은 원본 읽기만 가능하고 저장 함수 실행 불가. 로그인 역할은 함수 실행 권한이 있지만 함수 안에서 지정 편집 UID를 재확인.
- 이력 읽기는 지정 편집 UID에만 허용. 비관리자 역할의 이력 직접 쓰기 권한 없음.
- 원본 테이블의 추가 사용자 트리거 없음. 원본·이력의 제약 조건과 실제 auth.uid() 정의도 확인.

재현 가능한 조회문: [읽기 전용 감사 SQL](../scripts/audit-storage.readonly.sql). 운영 GeoJSON 행 내용은 조회 결과에 포함하지 않음.

## 운영과 분리한 실제 PostgreSQL 검증

운영과 같은 **PostgreSQL 17.6** 서버를 임시 폴더에 실행. 같은 함수·인증 함수·테이블 열·제약 조건·읽기 정책과 anon/authenticated 권한을 재현. 실제 편집 UID만 합성 UUID로 치환했고, 도로는 합성 자료만 사용. 테스트는 로컬 새 서버를 직접 만들며 운영 접속 주소·비밀번호를 받지 않음. 종료 시 서버·임시 데이터 정리.

실제 운영 auth.users 전체나 Supabase 인증 서버를 복제하지는 않음. 로컬 auth.users는 외래키 확인용 합성 UID만 포함하며, HTTP 중계층도 테스트용임.

| 시나리오 | 결과 |
|---|---|
| 운영과 같은 DB 버전, 저장/auth SQL 정의 및 search_path 일치 | 통과 |
| 익명·로그인 역할의 테이블 직접 쓰기 금지, 잘못된 편집 계정 거부 | 통과 |
| 정상 저장 시 도형·속성 보존 및 이전 버전 이력 생성 | 통과 |
| 오래된 버전·잘못된 GeoJSON 거부 후 원본/이력 유지 | 통과 |
| 두 독립 연결을 같은 advisory 잠금에 동시에 대기시킨 후 해제 | **한 저장 성공, 한 요청 40001** |
| 빈 데이터셋을 두 연결이 동시에 최초 생성 | **한 초기화만 성공** |
| 이력 INSERT 실패 유도 | **도로 갱신도 전체 취소** |
| 기존/신규 cloud-storage 클라이언트가 실제 HTTP로 동일 SQL 호출, 캐시 재사용 | 통과 |

**8개 시나리오 모두 통과**. 상위 묶음 포함 Node 테스트 러너 집계 9개. [원시 결과](qa-evidence/postgres-storage-tests.txt).

실제 동시성 검사는 두 PostgreSQL 연결이 `pg_stat_activity`에서 동일한 advisory 잠금 대기 상태임을 확인한 다음 잠금을 해제함. 단순히 순서대로 두 번 저장하는 모의 검사가 아님.

검증 계약: [운영 카탈로그 기반 fixture](../tests/fixtures/supabase-storage-contract.json). 실제 편집 계정 UUID와 운영 도로 자료는 포함하지 않음. [실행기](../tests/postgres-storage.integration.cjs)는 함수 정의를 다시 조회하여 복사한 정의와 같음을 확인.

## 재실행

Node.js 22, npm, 해당 플랫폼의 PostgreSQL 실행 패키지 필요. 이번 실행은 macOS arm64에서 수행.

```sh
npm install --prefix /tmp/gunsan-postgres-qa embedded-postgres@17.6.0-beta.15 pg@8.16.3
node --test tests/postgres-storage.integration.cjs
```

다른 의존성 폴더를 쓸 때는 `GUNSAN_PG_DEPS`를 지정. [패키지 원문 안내](https://github.com/leinelissen/embedded-postgres)는 로컬 클러스터 생성·종료 방식을 설명함. 시스템 사용자나 전역 PostgreSQL 서비스는 생성하지 않음.

## 적용 상태와 남은 범위

이번 변경은 **검증 코드와 기록만** 추가함. 배포된 앱 코드와 운영 저장 SQL은 수정하지 않았으므로 재배포가 필요하지 않음. PR #1의 배포 커밋은 `8cb5e8e00aea3c272137b5369d921d26121d720c`.

운영 구현을 몰라 원자성을 확인할 수 없던 제한은 해소됨. 실제 Supabase의 함수·권한을 조회했고 같은 버전 PostgreSQL에서 실제 SQL의 동시성과 롤백을 실행하여 확인했음.

운영 Supabase HTTPS 저장 엔드포인트에 대한 실제 쓰기 시험, 실제 물리 컴퓨터 두 대의 조작, Supabase 인증 서버/JWT 발급 전 과정은 수행하지 않았음. 이를 수행한 것으로 간주해서는 안 됨. 운영 원본을 건드리지 않기 위한 검증 경계임.

같은 브라우저의 기존 v3 초안 키 공유 문제는 이번 검증으로 바뀌지 않음. 한 컴퓨터에서는 편집 탭 하나만 사용하고, 충돌한 작업은 내보내기로 보관할 것. 이 제한을 없애는 다중 탭 초안 설계는 별도 기능 변경임.
