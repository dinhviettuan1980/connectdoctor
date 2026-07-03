# DECISIONS.md

> Mọi quyết định kỹ thuật quan trọng. Format: ngày, quyết định, lý do, trade-offs.

---

### 2026-07-03 — Migrate 3 backend (doctorapi/kinhdichapi/xsmbapi) từ Express sang NestJS + Fastify + TypeScript

**Quyết định:** viết lại cả 3 backend Express/JS thuần (`doctorapi`, `kinhdichapi`, `xsmbapi` — cả 3 đều
là project riêng của user, không nằm trong repo `connectdoctor`) sang NestJS dùng Fastify làm HTTP
adapter, viết bằng TypeScript. Thứ tự: `doctorapi` (nhỏ nhất, không state/DB) → `kinhdichapi` (có
DB+auth+SSE) → `xsmbapi` (lớn nhất, có bot Zalo session dài hạn + cron + crawler). Kế hoạch đầy đủ lưu ở
`/Users/tuandv/.claude/plans/swirling-squishing-elephant.md`.

**Lý do:** user chủ động muốn học NestJS/Fastify, tự nhận "hơi to" so với quy mô hiện tại nhưng chấp
nhận đánh đổi effort để học công nghệ mới — không phải nhu cầu kỹ thuật cấp bách.

**Quyết định kèm theo:**
- Không đổi sang ORM (TypeORM/Prisma) cho phần SQLite ở kinhdichapi/xsmbapi — bọc raw SQL hiện có trong
  1 `DatabaseService`, tránh viết lại hàng chục query chỉ vì đổi framework.
- `xsmbapi` migrate toàn bộ 1 lần kể cả bot Zalo (rủi ro cao hơn, do user chọn thay vì migrate dần theo
  domain).
- Bỏ hẳn `/storage` + `/notify` khỏi bản NestJS của `xsmbapi` — đã là duplicate của `doctorapi`; giữ 1
  tiến trình Express cũ tối giản chạy song song chỉ để phục vụ URL cũ.
- Deploy/cutover: build port mới → chạy song song bản cũ qua pm2 → verify từng route bằng `curl` → đổi
  nginx `proxy_pass` → giữ bản cũ ~1 tuần để rollback.

**Trade-offs:** effort lớn hơn nhiều so với lợi ích kỹ thuật thuần tuý (3 service hiện tại chạy ổn định);
rủi ro thật sự (đặc biệt `xsmbapi` — service đang chạy live, có bot nhắn tin thật + crawl + đặt cược mô
phỏng). Đổi lại: kiến trúc rõ ràng hơn (module/DI thay vì 1 file `index.js` hàng nghìn dòng), type-safety,
và user đạt được mục tiêu học công nghệ mới.

**Tiến độ — CẢ 3 PHASE ĐÃ XONG, ĐÃ CUTOVER PRODUCTION (2026-07-03):**
- ✅ Phase 1 (`doctorapi`) — port 8032, cutover xong. Xem `ARCHITECTURE.md` → mục backend `doctorapi`.
- ✅ Phase 2 (`kinhdichapi`) — port 8033, cutover xong. Xem `ARCHITECTURE.md` → mục backend `kinhdichapi`.
- ✅ Phase 3 (`xsmbapi`) — port 8034, cutover xong (repo mới `xsmbapi-nest`, KHÔNG viết đè lên `xsmbapi`
  cũ như 2 phase trước — xem lý do trong "Trade-offs" bên dưới). Xem `ARCHITECTURE.md` → mục `xsmbapi`.

**Kết quả thực tế Phase 3 (rủi ro cao nhất — bot Zalo session thật):**
- Đọc hết `index.js` (2995 dòng) + `bot.js` (777 dòng) trước khi viết code, phát hiện + chủ động BỎ
  dead code đã tồn tại từ lâu: `/api/specials/2-months` (cú pháp MySQL chạy trên driver sqlite, luôn lỗi
  500, không ai gọi được), `alreadySentToday`/`markSentToday`/`SCHEDULES_FILE` trong `bot.js` (định nghĩa
  nhưng không dùng), dependency `puppeteer` thừa (code thực tế chỉ dùng axios+cheerio).
- Genericize betting-sim (sim/sim2/sim4) thành 1 `BettingSimService` dùng chung qua base controller
  abstract có decorator — trước đó là 3 khối code CRUD copy-paste giống hệt nhau trong `index.js`.
- `/chat` và `/classify-two-digit` trước đây tự gọi HTTP vào chính server (`axios.get(BASE_URL+...)`) —
  đổi thành gọi thẳng service cùng process (nhanh hơn, không phụ thuộc server tự reachable).
- **Xử lý rủi ro song song bot Zalo:** session zca-js (`cred.json`) không thể sống ở 2 tiến trình cùng
  lúc → dùng `ZALO_ENABLED=false` ở bản Nest suốt giai đoạn dual-run, chỉ bật sau khi đã `pm2 stop` hẳn
  bản Express cũ (thứ tự: stop cũ → nginx cutover → enable Zalo bên mới) — tránh hoàn toàn cửa sổ 2
  session cùng sống, tránh gửi trùng tin nhắn thật.
- **2 bug thật gặp phải, đều do chính quá trình migrate gây ra (không tồn tại trước đó):**
  1. `onModuleInit()` của `LotteryService`/`ZaloBotService` chạy trước khi `DatabaseService` mở xong kết
     nối SQLite (Nest không đảm bảo thứ tự init giữa module anh em) → crash lúc khởi động. Fix: gọi các
     startup task này tường minh trong `main.ts` SAU `app.listen()`, đúng như bản gốc chạy trong callback
     `app.listen()`.
  2. `/etc/nginx/sites-enabled/api.tuandv.id.vn` hoá ra là **file thường, không phải symlink** tới
     `sites-available/` (khác các domain khác) — sửa `sites-available` hoàn toàn vô tác dụng, nginx âm
     thầm vẫn route về bản cũ. Verify ban đầu "pass" là false positive vì bản cũ/mới trả dữ liệu giống hệt
     (cùng DB) — chỉ lộ ra khi tắt hẳn bản cũ gây 502 toàn domain. Bài học: luôn `ls -la` kiểm tra
     `sites-enabled/<domain>` có đúng là symlink trước khi tin sửa `sites-available` có tác dụng.
- **Trade-off cấu trúc:** Phase 1/2 viết đè trực tiếp lên repo cũ (in-place, xoá hẳn code Express cũ sau
  khi port xong). Phase 3 KHÔNG làm vậy — tạo repo con `xsmbapi-nest` hoàn toàn tách biệt, giữ nguyên
  `xsmbapi` cũ y hệt (chỉ thêm 1 file `legacy-storage-notify.js` cho `/storage`+`/notify`). Lý do: bot
  Zalo cần khả năng rollback tức thời (chỉ cần `pm2 restart xsmbapi` cũ + đổi nginx, không cần build lại
  gì) nếu session mới có vấn đề — rủi ro cao hơn hẳn 2 phase trước nên chấp nhận cấu trúc 3 repo không
  đồng nhất để đổi lấy an toàn.
- **Việc còn lại:** theo dõi cron chu kỳ đầu trên bản mới (đánh cược 17h/19h, tổng kết quỹ 8h, health-daily
  23h30), sau ~1 tuần ổn định thì `pm2 delete` các tiến trình Express cũ (`xsmbapi`, `doctorapi`,
  `kinhdichapi`) + dọn file nginx backup thừa.

### 2026-07-03 (cùng ngày) — Hợp nhất hoàn toàn cấu trúc 3 backend, xoá hết code Express NGAY (không đợi 1 tuần)

**Quyết định:** user chủ động nói đây là dự án học tập cá nhân, không phải thương mại → không cần cửa
sổ rollback 1 tuần như đã lên kế hoạch ban đầu. Yêu cầu xoá hết code Express cũ ở cả 3 backend NGAY và
thống nhất cấu trúc. Đã thực hiện xong trong cùng phiên:
1. Port nốt `/storage`+`/notify` của `xsmbapi` thành NestJS module thật (trước đó tạm dùng 1 tiến trình
   Express tối giản `xsmbapi-legacy` để rollback tức thời) — xoá hẳn tiến trình Express cuối cùng còn
   sót lại trong toàn bộ hệ thống 3 backend.
2. Merge repo con `xsmbapi-nest` NGƯỢC LẠI vào repo `xsmbapi` gốc (xoá code Express cũ, copy code Nest
   vào, cùng cách `doctorapi`/`kinhdichapi` đã làm ở Phase 1/2) — giờ CẢ 3 REPO ĐỀU ĐỒNG NHẤT: 1 thư mục
   git duy nhất/backend, toàn bộ NestJS, không còn thư mục con "-nest" tách biệt nào.
3. Trên server: đổi tên cả 3 thư mục + pm2 process, drop hậu tố `-nest`
   (`doctorapi-nest`→`doctorapi`, `kinhdichapi-nest`→`kinhdichapi`, `xsmbapi-nest`→`xsmbapi`), di
   chuyển dữ liệu sống (uploads/knowledge, data.sqlite, cred.json, friends.json, groups.json) vào thư
   mục mới trước khi xoá thư mục cũ, `pm2 delete` toàn bộ Express cũ + `xsmbapi-legacy`.
4. nginx `api.tuandv.id.vn` rút gọn về 1 `location /` (bỏ path-split `/storage`+`/notify` sang port
   khác — không cần nữa, đã hợp nhất vào cùng tiến trình).

**Kết quả:** `pm2 list` server giờ chỉ còn đúng `doctorapi`/`kinhdichapi`/`xsmbapi` — không hậu tố,
không bản Express nào chạy ở đâu nữa trong toàn hệ thống. Đã verify lại end-to-end qua domain thật cho
cả 3 sau khi hợp nhất (không có regression).

**Trade-offs:** mất khả năng rollback tức thời về Express (chấp nhận được — đã verify kỹ qua
diff-parity trước khi xoá, dự án học tập không có SLA). Phát hiện thêm ngoài phạm vi (không phải mục
tiêu chính nhưng tiện tay dọn theo chuẩn `doctorapi`/`kinhdichapi`): `.env` của `xsmbapi` từng bị track
trong git chứa secret thật — đã `git rm --cached` + thêm `.env`/`dist/` vào `.gitignore`, nhưng secret
cũ vẫn còn trong lịch sử git, nên cân nhắc rotate (`TELEGRAM_TOKEN`, `DB_PASSWORD`, `RESEND_API_KEY`,
`NOTIFY_SECRET`, `GOOGLE_CLIENT_ID`, `FIREBASE_API_KEY`) nếu quan tâm tới việc repo từng có secret lộ
trong history. Chi tiết đầy đủ ở `xsmbapi`'s `Memo/DECISIONS.md`.

---

### 2026-07-02 — Tách backend ConnectDoctor ra repo/service riêng (`doctorapi`)

**Quyết định:** upload file (đơn thuốc, avatar, audio chat, audio knowledge) + `/notify`
(Telegram/email) chuyển từ dùng chung code với `xsmbapi` (project xổ số không liên quan) sang 1 repo +
service riêng `dinhviettuan1980/doctorapi`, deploy trên cùng VPS, port riêng (8022), subdomain riêng
(`doctorapi.tuandv.id.vn`).

**Lý do:** mọi bug hạ tầng gặp phải trong ngày 2026-07-02 (413 body size, URL localhost lộ ra ngoài,
Telegram lỗi thư viện) đều nằm trong code của `xsmbapi` — một app hoàn toàn không liên quan tới
ConnectDoctor. User yêu cầu tách ra để 2 app không còn ảnh hưởng lẫn nhau. Tiền lệ: user đã làm y hệt
với `kinhdich` → `kinhdichapi` trước đó.

**Trade-offs:** phải setup lại DNS/SSL/pm2 cho service mới (đã làm). Dữ liệu cũ (~9.8MB đơn thuốc,
~583MB audio knowledge) đã copy sang `doctorapi` để dùng cho record mới, nhưng URL cũ trong Firestore
(đơn thuốc/avatar/audio chat từ trước ngày này) vẫn trỏ về domain `api.tuandv.id.vn` cũ — phải giữ
`xsmbapi`'s storage-router chạy song song vô thời hạn (hoặc tới khi ai đó viết script migrate URL cũ)
để không vỡ link. Repo `doctorapi` private trên GitHub nhưng VPS chưa có credential để `git pull` tự
động — phải deploy bằng `scp` thủ công (giống hạn chế đã biết với `xsmbapi`, xem `BUGS.md`/`TODO.md`).

---

### 2026-07-02 — Đổi cách phân loại giờ uống thuốc (Sáng/Chiều/Tối) từ keyword sang AI (Groq)

**Quyết định:** thay vì tự suy luận buổi uống thuốc bằng regex/keyword-matching cục bộ trong app
(`detectMealTimes`), gọi Groq (`llama-3.1-8b-instant`) qua endpoint mới `doctorapi`'s `POST
/classify-meds`. Keyword-matching cũ vẫn giữ lại làm fallback khi gọi AI lỗi.

**Lý do:** user chủ động yêu cầu ("dùng AI cho nó sang") sau khi biết bước phân loại buổi trước đó chỉ
là keyword-matching thường, không phải AI như user tưởng.

**Trade-offs:** tốn thêm 1 lần gọi AI (có phí, có độ trễ) mỗi khi lưu đơn thuốc mới nhất; kết quả AI
không phải lúc nào cũng chính xác 100% (đã thấy 1 case AI xếp nhầm 1 thuốc uống 1 lần/ngày vào cả buổi
Chiều) — chấp nhận được vì đây là tính năng đang ở giai đoạn test qua Telegram, chưa tạo lịch nhắc thật.

---

### 2026-06-29 — Chuyển OCR từ Gemini/mock sang Groq vision

**Quyết định:** `lib/ocr.ts` dùng Groq vision API để nhận dạng đơn thuốc & chỉ số xét nghiệm từ ảnh,
thay cho Gemini/mock trước đó. (commit `1703993`)

**Lý do:** không ghi lại trong commit message — suy đoán hợp lý là tốc độ/chi phí/độ chính xác OCR của
Groq vision tốt hơn cho use-case này. **Cần hỏi lại người quyết định nếu cần lý do chính xác.**

**Trade-offs:** thêm 1 API key/provider mới cần quản lý (`EXPO_PUBLIC_*`, cùng vấn đề lộ key như Gemini —
xem `TODO.md`). Mất khả năng dùng chung 1 provider (Gemini) cho cả triage lẫn OCR.

---

### 2026-05-29 — Chuyển Google/Facebook sign-in trên web từ popup sang redirect

**Quyết định:** `signInWithPopup` → redirect flow cho web. (commit `87c4b83`)

**Lý do:** popup bị trình duyệt chặn (popup blocker) trong nhiều trường hợp thực tế, gây lỗi đăng nhập
không nhất quán.

**Trade-offs:** redirect flow phức tạp hơn để xử lý (cần bắt kết quả sau khi quay lại trang), UX có
chuyển trang thay vì popup mượt.

---

### 2026-05-20 → 2026-06-03 — Tách code native-only ra file `.native.ts`/`.web.ts` riêng

**Quyết định:** notifications (`5/20`), locationTracking (`5/29`), voiceNav (`6/3`) — và về sau health,
ble, FamilyMap, HealthMap, VideoCallModal, WebPortal, HomeAddressPicker — đều tách thành file platform
riêng thay vì 1 file dùng `Platform.OS` check.

**Lý do:** các thư viện native-only (`expo-notifications`, `expo-speech`, background location, BLE) khi
import vào 1 file dùng chung sẽ bị Metro bundler kéo vào bundle web dù không cần, làm bundle web nặng hơn
và có thể crash (module không tồn tại trên web).

**Trade-offs:** trùng lặp code giữa các file platform (không tránh được nếu muốn tree-shaking đúng qua
tên file); phải nhớ cập nhật cả `.native.ts` lẫn `.web.ts`/base khi sửa logic chung.

---

### 2026-05-20 — Auth persistence: AsyncStorage (native) vs IndexedDB (web)

**Quyết định:** `lib/firebase.ts` wire persistence khác nhau theo platform ngay từ đầu (không phải quyết
định giữa chừng, nằm trong scaffold ban đầu — xem `README.md`/`CLAUDE.md`).

**Lý do:** Firebase Auth JS SDK không tự động chọn đúng storage cho React Native; cần chỉ định rõ.

**Trade-offs:** không có, đây là yêu cầu bắt buộc kỹ thuật chứ không phải lựa chọn có phương án khác.

---

### 2026-06-05 (khoảng) — Xây hệ thống agent automation nội bộ (`tasks`/`repos` Firestore + scripts)

**Quyết định:** dùng chính Firestore của app này làm hàng đợi việc cho Claude Code agent
(`scripts/agent-tasks.mjs`), thay vì một hệ thống ticket riêng (Linear/Jira/GitHub Issues).

**Lý do:** tận dụng hạ tầng Firebase có sẵn, không cần thêm dependency ngoài; cho phép UI admin
(`app/(patient)/tasks.tsx`) quản lý trực tiếp trong chính app.

**Trade-offs:** hệ thống này gắn chặt vào 1 project Firebase cụ thể của ConnectDoctor dù về bản chất là
công cụ DevOps đa repo (multi-repo support) — nếu tách ra dùng cho project khác sẽ cần refactor khỏi
Firestore của app này.

---

### 2026-05-20 — Chọn Groq/Gemini (external AI API) thay vì on-device ML cho AI triage & OCR

**Quyết định:** dùng Gemini cho triage, Groq vision cho OCR — cả hai đều gọi API ngoài, có fallback mock
khi thiếu key (không phải on-device inference).

**Lý do:** on-device ML (vd. ML Kit) chỉ tốt cho OCR text thô, không đủ để suy luận triage hay trích xuất
dữ liệu có cấu trúc (tên thuốc/liều lượng) — cần LLM.

**Trade-offs:** phụ thuộc mạng + chi phí API + vấn đề lộ key phía client (xem `TODO.md`). Đã cân nhắc
ML Kit làm fallback offline nhưng chưa triển khai (low priority trong `TODO.md`).
