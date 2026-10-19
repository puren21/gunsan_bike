# 군산시 자전거도로 지도 — GitHub Pages 배포판

원본: https://github.com/puren21/gyeongju_road
복제 기준 커밋: 88d5b3c3c33b3026fb4feb99ea9d799aca5711e0

## 배포
1. GitHub에서 새 공개 저장소 `gunsan_bike`를 만듭니다.
2. 이 ZIP을 압축 해제합니다. **index.html이 저장소 최상위에 위치하도록 폴더 안의 파일과 road_width 폴더를 업로드**하고 main 브랜치에 커밋합니다. ZIP 자체를 업로드하지 마세요.
3. Settings → Pages → Build and deployment → Source에서 Deploy from a branch를 선택합니다.
4. Branch는 main, 폴더는 /(root)를 선택한 뒤 Save를 누릅니다.
5. 게시 완료 후 `https://사용자명.github.io/gunsan_bike/`에 접속합니다. puren21 계정이라면 `https://puren21.github.io/gunsan_bike/`입니다.

공식 안내: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 카카오 지도 설정
기존 사이트의 JavaScript 앱 키를 유지했습니다. 기존 앱 소유자가 아닌 경우 본인 앱 키로 바꾸세요.
카카오 개발자사이트에서 JavaScript SDK 도메인에 `https://사용자명.github.io`를 등록해야 합니다. 같은 puren21.github.io 도메인에서 기존 키가 허용되어 있다면 그 설정을 이용할 수 있습니다.
다른 키를 쓰면 index.html에서 `appkey=` 뒤의 기존 키를 **2곳 모두** 교체합니다(메인 지도와 로드뷰).
로컬 확인에는 웹 서버가 필요하며, 해당 localhost 도메인도 카카오 앱에 등록되어 있어야 합니다. HTML 파일을 직접 더블클릭하는 방식은 지원하지 않습니다.
공식 안내: https://apis.map.kakao.com/web/guide/

## 변경 내역
- 제목: 군산시 자전거도로 현황, 기본 중심: 위도 35.9677 / 경도 126.7366.
- 초기 개요 화면은 기존 동작처럼 제공된 경계 전체를 화면에 맞춥니다(도서 지역 포함).
- roads.geojson: 업로드 원본과 동일한 내용. 비응항로1R / 비응항로1L의 2개 지물입니다. 군산시 전체 자전거도로 데이터가 아닙니다.
- 기존 노선번호 대신 `자전도로명`을 읽어 목록·검색·지도 라벨에 표시합니다.
- Township Boundary.geojson: 업로드 동경계 63개 지물을 EPSG:5179에서 EPSG:4326 경위도로 변환했습니다. 원본 속성은 유지했습니다.
- City Boundary.geojson: 제공된 동경계를 통합한 파생 경계입니다. 별도로 제공된 공식 시경계 자료는 아닙니다.
- 경주시 엠블럼은 자전거 기호로 교체했습니다.
- 기존 지도/스카이뷰, 로드뷰, 검색, 목록, 경계 선택, 스타일, 측정, 편집, 메모 기능 코드를 유지했습니다.
- 같은 도메인의 기존 경주시 지도와 저장 설정·편집내용이 섞이지 않도록 브라우저 저장 키를 분리했습니다.
- GitHub 저장 기능은 현재 GitHub Pages 주소의 계정·저장소를 대상으로 합니다(main 브랜치). 사용자 지정 도메인 또는 로컬에서는 index.html의 GYEONGJU_GITHUB 설정을 직접 조정해야 합니다.

## 제공되지 않은 데이터와 표시 주의
- 경주시 시도·리경계·실폭도로 데이터는 포함하지 않았습니다. city_roads.geojson 및 Ri Boundary.geojson은 빈 레이어이며, road_width/index.json도 빈 색인입니다. 메뉴는 유지되지만 군산시 자료를 넣기 전까지 해당 데이터 표시는 나오지 않습니다. 실폭도로를 이용한 자동 폭 보정도 제공할 수 없습니다.
- 자전거도로 원본에 개설상태·폭·차선 정보가 없습니다. 농어촌도로용 차선/폭 자동판정은 이 데이터에 적용하지 않으며 기본 선 스타일로 표시합니다. 기존 개설상태 범례·상세창 문구는 군산시의 검증된 상태정보를 뜻하지 않습니다. 상태 분류와 상세 입력 양식은 다음 수정 단계의 조정 대상입니다.
- 도로를 보기 쉽게 확대하거나 도로목록에서 비응항로1R/1L을 선택하세요. 전체 경계 개요 축척에서는 기존 축척 규칙에 따라 노선/라벨이 숨겨질 수 있습니다.

## 검증
- GeoJSON 형식, 좌표 범위, 경계 63개/도로 2개, 노선명 속성 연결 및 JavaScript 구문을 검사했습니다.
- 로컬 브라우저에서 제목과 기본 화면을 확인했으나 카카오 SDK가 응답하지 않아 실제 지도·로드뷰·편집 기능의 통합 검증은 완료하지 못했습니다. 배포 후 위 도메인 설정을 적용하여 확인해야 합니다.
- 원본 SHA256 및 좌표변환 내역은 DATA_INFO.json에 기록했습니다.
