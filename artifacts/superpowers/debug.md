# Bug Report — /fix

## Symptom
Trong response có trả về message (final text) nhưng không render lên giao diện sau khi stream kết thúc.

## Repro Steps
1. Mở web UI (`web/`).
2. Gửi một prompt.
3. Quan sát công cụ chạy (tool events hiển thị), nhưng câu trả lời cuối của agent không xuất hiện thành bubble sau khi streaming xong.

## Root Cause
- Backend (`internal/server/server.go:174`) gửi câu trả lời cuối trong sự kiện SSE `final`: `{"text": answer}`.
- Client hook `web/hooks/useChatThreads.ts` trong vòng lặp `send()` chỉ gom text từ sự kiện `stream` loại `text` (`evt.data.type === "text"`), và **bỏ qua text từ sự kiện `final`**.
- Khi stream chỉ emit `tool` (stream) + `final` (text), biến `assistantText` rỗng → assistant message không được append vào thread store → không render bubble.

## Fix
- File: `web/hooks/useChatThreads.ts`
- Thay đổi: gom `evt.text` từ sự kiện `final` thành `assistantText` (final là nguồn chính xác/quyền lực); vẫn cộng dồn text từ `stream`/`text` cho trường hợp streaming từng phần.

## Regression Protection
- Verification bằng typecheck + lint + test suite (existing) sau khi đổi logic gom text.
- (Flight) chờ thêm hook test nếu cần.

## Verification
- Command: `npx tsc --noEmit`, `npx eslint hooks/useChatThreads.ts`, `npx vitest run`
- Expected: tất cả PASS
- Result: PASS (typecheck + lint + 56 tests/6 files)