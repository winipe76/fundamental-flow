# Fundamental Flow

Nasdaq 100 기업의 주가가 아니라 펀더멘털 변화를 추적하는 Investment Conviction Engine입니다.

## Live Dashboard

[fundamental-flow-nasdaq100.winipe76.chatgpt.site](https://fundamental-flow-nasdaq100.winipe76.chatgpt.site)

모바일과 데스크톱에서 Fundamental Overview, Screener, Company Detail, 수집 업데이트 상태를 확인할 수 있습니다.

## Data Flow

FMP와 검증된 공식 IR/SEC 자료를 Monthly Snapshot으로 저장하고, 기존 Calculation Engine과 Screening Engine으로 분석합니다. 밸류에이션은 별도 Buy Engine에서 처리합니다.

## Local Development

```bash
pnpm install
pnpm dev
pnpm test
pnpm build
```

FMP 연결에는 로컬 환경 변수 `FMP_API_KEY`가 필요합니다. `.env`와 API 키는 Git에 포함되지 않습니다.

## Documentation

- `docs/FUNDAMENTAL_FLOW_ARCHITECTURE.md`
- `docs/FMP_DATA_DICTIONARY.md`
