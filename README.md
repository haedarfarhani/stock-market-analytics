# تحلیل بازار سرمایه ایران 🇮🇷

🌐 **نسخه زنده:** https://haedarfarhani.github.io/stock-market-analytics/

داشبورد فارسی و راست‌چین برای بورس تهران (TSETMC)، فرابورس، بورس کالا، صندوق‌ها، آپشن، کدال، طلا/ارز/رمزارز — با **Vue 3 + TypeScript + Vite + Tailwind CSS v4 + Pinia + Vue Router + lightweight-charts**.

## شروع سریع

```bash
npm install
cp .env.example .env   # کلید BrsApi را قرار دهید
npm run dev            # http://localhost:5173
npm run build          # خروجی production + تایپ‌چک
```

کلید رایگان: https://brsapi.ir/tsetmc-exchange-free-bourse-api-key-request/

## ساختار

```
src/
  components/  AppLayout, MarketCard, DataTable, PriceChart, ChangeBadge,
               MockBadge, SearchInput, ThemeToggle
  pages/       Dashboard, Stocks, StockDetails, Indices, EtfFunds,
               Options, History, Codal, Commodities, NotFound
  stores/      market.ts (داده + کش + fallback نمایشی), theme.ts, watchlist.ts
  services/api/ client.ts (axios + کش + proxy), tsetmc.ts, extended.ts
  data/mock.ts داده نمایشی واقع‌نما (برچسب‌دار)
  utils/format.ts  اعداد فارسی، درصد، Jalali (jalaali-js)
  router/      ۹ مسیر + جزئیات نماد + ۴۰۴
```

## وضعیت API

| حوزه | اندپوینت | وضعیت |
|---|---|---|
| همه نمادها | `Tsetmc/AllSymbols.php?type=1..5` ✅ زنده | پیاده‌سازی + fallback نمایشی |
| شاخص (بورس/فرابورس/منتخب) | `Tsetmc/Index.php?type=1|2|3` ✅ زنده | ترکیب هر سه + متای بازار |
| جزئیات نماد + مجامع | `Tsetmc/Symbol.php?l18=` ✅ زنده | صفحه جزئیات با داده زنده |
| NAV صندوق‌ها (تک‌نماد) | `Tsetmc/Nav.php?l18=` ✅ زنده | ۴۳۸ ETF زنده + حباب on-demand |
| بازار آپشن بورس | `Tsetmc/Option.php` ✅ زنده | ۱٬۶۲۵ قرارداد، ITM، ارزش مفهومی |
| ریزمعاملات (تک‌نماد) | `Tsetmc/Transaction.php?l18=&date=` ✅ زنده | تیک‌های روز، on-demand در جزئیات |
| تاریخچه روزانه (تک‌نماد) | `Tsetmc/History.php?type=0&l18=` ✅ زنده | نمودار + جدول واقعی، کش ۳۰ دقیقه‌ای |
| کندل تعدیل‌شده/نشده + امروز | `Tsetmc/Candlestick.php?type=&l18=` ✅ زنده | نمودار ۳حالته جزئیات نماد |
| سهامداران عمده (تک‌نماد) | `Tsetmc/Shareholder.php?l18=&date=` ✅ زنده | جدول زنده در جزئیات نماد |
| اطلاعیه‌های کدال | `Codal/Announcement.php` ✅ زنده | ۶۲۶هزار اطلاعیه، فیلتر+صفحه‌بندی+لینک |
| طلا/ارز/کامودیتی/رمزارز | `Market/Gold_Currency,Commodity,Cryptocurrency` ✅ زنده | استور جدا + کش ۵ دقیقه‌ای |
| بورس کالا (`Ime/*`) | هر ۵ اندپوینت ✅ زنده | آتی، آپشن جفتی، گواهی، صندوق، فیزیکی |

بدون کلید (`VITE_BRSAPI_KEY` خالی) اپ با **داده نمایشی برچسب‌دار** کار می‌کند و هیچ‌وقت داده mock را به‌جای زنده جا نمی‌زند (`MockBadge` + بنر خطا). جزئیات کامل: [`API_INTEGRATION.md`](./API_INTEGRATION.md).

## نکات

- تم صورتی روشن/تیره با توکن‌های متمرکز (`src/style.css`: `base/surface/secondary/brand/ink/muted/line`) — بدون رنگ hardcoded در کامپوننت‌ها. انتخاب در `localStorage` می‌ماند و بازدید اول از ترجیح سیستم پیروی می‌کند (بدون FOUC). سبز/قرمز فقط معنای سود/زیان؛ نمودارها با MutationObserver هم‌تم می‌شوند.
- راست‌چین کامل (`dir=rtl`)، فونت **Vazirmatn**، تاریخ **شمسی**، اعداد فارسی، سبز/قرمز برای مثبت/منفی.
- سایدبار واکنش‌گرا + ناوبری موبایل، اسکلت لودینگ، حالت خالی و خطا در همه جدول‌ها.
