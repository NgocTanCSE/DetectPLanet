---
name: AgriScan AI
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3c4a42'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6c7a71'
  outline-variant: '#bbcabf'
  surface-tint: '#006c49'
  primary: '#006c49'
  on-primary: '#ffffff'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#4edea3'
  secondary: '#006c4a'
  on-secondary: '#ffffff'
  secondary-container: '#82f5c1'
  on-secondary-container: '#00714e'
  tertiary: '#a43a3a'
  on-tertiary: '#ffffff'
  tertiary-container: '#fc7c78'
  on-tertiary-container: '#711419'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#85f8c4'
  secondary-fixed-dim: '#68dba9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3af'
  on-tertiary-fixed: '#410005'
  on-tertiary-fixed-variant: '#842225'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
  canvas-white: '#F8FAFC'
  pure-surface: '#FFFFFF'
  muted-slate: '#64748B'
  status-healthy: '#22C55E'
  status-warning: '#F59E0B'
  status-danger: '#EF4444'
  whisper-border: '#E2E8F0'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
  metric-confidence:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

# Design System: AgriScan AI - Chẩn đoán sâu bệnh cây trồng

## 1. Visual Theme & Atmosphere
Giao diện ứng dụng di động công nghệ nông nghiệp thông minh, hiện đại, thân thiện và tươi sáng. Cảm hứng từ thiên nhiên sống động kết hợp AI công nghệ cao: tinh gọn, sạch sẽ, trực quan, bố cục chuẩn mobile-first (390px viewport) tối ưu hóa trải nghiệm một tay với Bottom Navigation Bar chuẩn hóa.

## 2. Color Palette & Roles
- **Forest Green Primary** (#006c49) — Màu nhận diện thương hiệu, nút CTA chính, active navigation
- **Emerald Accent** (#10b981) — Màu nhấn bổ trợ, typography điểm nhấn
- **Canvas White** (#F8FAFC) — Màu nền ứng dụng (Slate 50 nhẹ nhàng làm nổi bật hình ảnh lá cây)
- **Pure Surface** (#FFFFFF) — Nền các card, container, bottom sheet
- **Charcoal Text** (#131b2e) — Chữ tiêu đề và nội dung chính
- **Muted Slate** (#64748B) — Chữ phụ, nhãn, timestamp (Slate 500)
- **Status Healthy** (#22C55E) — Cây khỏe mạnh, an toàn
- **Status Warning** (#F59E0B) — Cảnh báo nhẹ, mức độ trung bình (Hổ phách)
- **Status Danger** (#EF4444) — Bệnh nặng, nguy hiểm (Đỏ)
- **Whisper Border** (rgba(226, 232, 240, 0.8)) — Đường viền mảnh 1px tinh tế

## 3. Typography Rules
- **Display & Headlines:** Geist — sans-serif hiện đại, nét đậm rõ ràng, tạo sự tin cậy cao
- **Body:** Plus Jakarta Sans — sans-serif tròn trịa, dễ đọc ngoài trời nắng (dành cho người làm nông)
- **Numbers/Confidence:** Plus Jakarta Sans Bold — hiển thị tỷ lệ % độ tin cậy AI rõ ràng

## 4. Component Stylings
- **Bottom Navigation Bar:** Cố định đáp footer, 5 tab chuẩn mực với nút quét Camera tròn nổi bề ở chính giữa với hiệu ứng đổ bóng emerald
- **Cards & Banners:** Bo tròng 24px (1.5rem), đổ bóng nhẹ nhàng êm ái, tương phản cao trên nền #F8FAFC
- **Tags & Badges:** Bo tròng pill đầy đủ với màu nền pastel nhạt cùng chữ màu tương ứng
- **Viewfinder & Scan Line:** Khung chữ nhật bo góc với góc định vị, hiệu ứng laser quét đốm bệnh
