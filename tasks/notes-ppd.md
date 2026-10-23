# Ghi chú khảo sát ppd.gov.vn (G3-01)

Khảo sát: 2026-10-23 · Nguồn: `https://ppd.gov.vn` (Cục Trồng trọt & BVTV)

## Kết luận ngắn

| Câu hỏi | Kết quả |
|---|---|
| `robots.txt` cho phép? | ✅ `User-agent: *` / `Allow: /` |
| Có RSS/JSON/sitemap? | ❌ `sitemap.xml` → 404, không thấy RSS |
| Có mục "Cảnh báo SVGH" cập nhật? | ❌ Chỉ 6 bài, mới nhất **2017** |
| Có mục "Công bố dịch" cập nhật? | ⚠️ Có nhưng thưa, chủ yếu 2013–2021 |
| "Tin mới nhất" có tin dịch hại? | ⚠️ Cập nhật 2026 nhưng phần lớn là tin hành chính, xuất khẩu, danh sách vùng trồng |

**Quyết định:** không thể coi ppd.gov.vn là nguồn cảnh báo dịch bệnh realtime.
Pipeline GĐ3 vì vậy chạy ở chế độ **đề xuất cho người duyệt** (`official_ingest.status='pending'`),
mặc định **không tự đăng**. Đường nhập tay/URL cho admin là đường dùng thực tế chính.

Lý do không tự đăng: nếu bật tự động, hệ thống sẽ đẩy tin 2015–2017 hoặc tin xuất khẩu
sang người nông dân → sai lệch và mất uy tín.

## Cấu trúc HTML (đã kiểm chứng bằng fixture)

Fixture lưu tại `api/tests/fixtures/ppd/`:

| File | Nội dung |
|---|---|
| `listing-cong-bo-dich.html` | Trang danh mục "Công bố dịch" |
| `listing-tin-moi-nhat.html` | Trang "Tin mới nhất" |
| `article-tay-ninh.html` | Bài "Tỉnh Tây Ninh công bố hết dịch rệp sáp bột hồng trên cây sắn" (10/08/2021) |
| `article-son-la.html` | Bài "Công bố hết dịch chổi rồng hại sắn trên địa bàn tỉnh Sơn La" |

Selector dùng trong `api/services/official_feed.php`:

| Dữ liệu | Selector / cách lấy |
|---|---|
| Tiêu đề | `//h1` (fallback `og:title`, `<title>`) |
| Ngày đăng | `//div[contains(@class,"date")]` → regex `dd/mm/yyyy`; fallback `article:published_time` |
| Nội dung | `//article[contains(@class,"article-detail")]`; fallback `//div[contains(@class,"page-content")]` |
| Link bài | `<a href>` cùng host, path kết thúc `.html`, ≥ 2 đoạn path |
| Tiền tố hợp lệ | `/cong-bo-dich/`, `/tin-moi-nhat/`, `/canh-bao-svgh/`, `/trong-trot-va-bao-ve-thuc-vat/` |

Ghi chú: nội dung bài không có `<p>` — dùng `textContent` của `article.article-detail`
sau khi bỏ `script/style/noscript`. Tiêu đề + dòng "Ngày đăng" nằm trong cùng khối nên
phải cắt bỏ trước khi lấy tóm tắt.

## Chạy thật ngày 2026-10-23

```
OFFICIAL_ENABLED=1 php jobs/run.php official-feed
→ trang lỗi=0, ứng viên=9, xử lý=8, thêm chờ duyệt=0, bỏ qua=8, lỗi tải bài=1
```

Toàn bộ ứng viên bị loại vì **cũ hơn 2 năm** hoặc thiếu tỉnh/bệnh → đúng như dự đoán.
Không có tin dịch hại mới nào trên site trong ngày chạy.

## Nguồn thay thế nên cân nhắc (chưa làm)

1. **Cổng thông tin tỉnh / Chi cục Trồng trọt & BVTV tỉnh** — sát thực tế hơn nhưng 34 site,
   mỗi site một cấu trúc → chi phí cao, dễ vỡ.
2. **Công văn/PDF** — cần OCR hoặc nhập tay; phù hợp với luồng admin hiện có
   (`POST /admin/ingest` hoặc `POST /admin/ingest/fetch` với URL bài).
3. **Báo cáo cộng đồng (GĐ4)** — tín hiệu sớm nhất, nhưng phải kiểm duyệt.
4. **Rủi ro thời tiết (GĐ2)** — nguồn tự động duy nhất đang chạy thật.

## Lưu ý pháp lý

- Chỉ lưu **tiêu đề, tóm tắt ≤ 500 ký tự, ngày đăng, link nguồn**; không sao chép toàn văn.
- Luôn hiển thị "Nguồn: Cục Trồng trọt & BVTV" + link bài gốc trên `AlertScreen`.
- Tôn trọng `robots.txt` (`Allow: /`) và giãn cách 2 giây/request, UA có tên app.
- Tin do cán bộ nhập tay phải ghi rõ nguồn trong `source_url`.
- Không biến tin "hết dịch" thành cảnh báo: `isResolvedOutbreak()` chặn và job bỏ qua.
