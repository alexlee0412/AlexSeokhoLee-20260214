## 🚀 배포 링크

- Frontend (Netlify): https://ainutritionistmvp.netlify.app
- Backend (Render): https://ainutritionistmvp.onrender.com

## 🧪 로컬 실행

### Backend
cd backend
npm install
node server.js

### Frontend
cd frontend
npm install
npm run dev

## ⚠️ 데이터 및 AI 처리 관련 안내

### 1. 크롤링

초기에는 실제 제품 페이지를 크롤링하여 데이터를 수집하려 했으나,
상용 사이트의 봇 차단 정책(HTTP 403)으로 인해 개발 환경에서 접근이 제한되었습니다.

따라서 MVP 단계에서는
가격, 소프트젤 개수, 1회 섭취량, EPA/DHA/총 오메가3 함량을
공식 제품 페이지에서 직접 확인 후 코드에 수동 입력하였습니다.

향후 실제 크롤링 또는 API 연동으로 확장 가능하도록 구조는 유지되어 있습니다.

### 2. OpenAI 및 Fallback 로직

추천 문장은 OpenAI ChatGPT API를 통해 생성됩니다.

다만,
- API quota 초과
- Billing 미등록
- Rate limit
- JSON 형식 오류

등의 외부 요인으로 응답이 실패할 수 있습니다.

이를 대비하여 정량 지표 기반의 Fallback 모델을 구현하였습니다.

- Price per 1000mg Omega-3
- EPA/DHA 함량
- 가중치 기반 점수 모델

OpenAI 호출이 실패하거나 JSON 파싱이 불가능한 경우,
자동으로 Fallback 모드로 전환되어 추천을 제공합니다.

UI에서는 OpenAI 기반 결과인지,
Fallback 기반 결과인지 명확히 구분하여 표시합니다.