# API Integration — BrsApi.ir

> خوانده‌شده در ۲۰۲۶-۱۰-۰۹. هیچ schemaای حدس زده نشده؛ موارد تاییدنشده با ⚠️ مشخص‌اند.

## منبع رسمی

- خانه: https://brsapi.ir/
- پنل/داک: https://api.brsapi.ir/Panel/panel.html
- کلید رایگان: https://brsapi.ir/tsetmc-exchange-free-bourse-api-key-request/
- نمونه AllSymbols: https://brsapi.ir/Api/Tsetmc/Sample/Api_FreeBourseWebService.json

## الگوی پایه (تاییدشده ✅)

```
https://Api.BrsApi.ir/Tsetmc/AllSymbols.php?key=YOUR_KEY&type=1
```

| پارامتر | توضیح |
|---|---|
| `key` | اجباری — `VITE_BRSAPI_KEY` |
| `type` | `1` سهام+ETF+حق‌تقدم (پیش‌فرض) • `2` کالا • `3` آتی • `4` اوراق بدهی • `5` تسهیلات مسکن |

فیلدهای پاسخ AllSymbols دقیقاً هم‌نام متغیرهای فیلتر TSETMC هستند
(`l18, l30, isin, id, py, pf, pl, plc, plp, pc, pcc, pcp, tno, tvol, tval, Buy_I_Volume, …` —
جدول کامل در صفحه اصلی brsapi.ir). تایپ `TsetmcSymbol` در `src/types/market.ts` همین‌ها را پوشش می‌دهد.

مثال Python/Go/PHP در صفحه اصلی داک آمده؛ هدر `User-Agent` مرورگری توصیه شده (فایروال 6G یوزرایجنت پیش‌فرض پایتون را بلاک می‌کند).

## اندپوینت‌ها

### ✅ تاییدشده با پاسخ زنده (کلید شخصی، ۲۰۲۶-۱۰-۰۹)

**`Tsetmc/AllSymbols.php?key=&type=1..5`** — آرایه JSON سطح‌بالا (نمونه زنده: ۱۶۳۹ رکورد)،
اعداد واقعی، `z/mv/eps/pe` قابل null، `id` عددی. نرمالایزر: `normalizeSymbol` در
`src/services/api/tsetmc.ts` (تست‌شده روی کل پاسخ زنده: ۰ رکورد خراب).

**`Tsetmc/Symbol.php?key=&l18=خودرو`** — **یک آبجکت** (نه آرایه). تاریخ‌ها شمسی (`1405-07-15`)،
اعداد منفی واقعی (eps/pe)، `z_issued` قابل null، `assembly[]` (نمونه زنده: ۱۵ مجمع با
title/date_send/time_send/date_publish/content). فیلدهای اضافه نسبت به AllSymbols:
`state, l30_en, code_12/5/4, m, m_board(+_id/_code), cs_sub(+_id), z_issued, ff,
g_pe, ps, pmin/pmax_1w, pmin/pmax_1y, tvol_avg_1m`. تایپ: `TsetmcSymbolDetail`،
نرمالایزر: `normalizeSymbolDetail` (۱۴ چک روی پاسخ زنده خودرو: همه PASS).
صفحه جزئیات نماد (`/stocks/:symbol`) با کلید معتبر، خودکار داده زنده می‌گیرد و
وضعیت/تابلو/شناوری/بازه هفته‌وسال/P-S/شناسنامه/مجامع را نمایش می‌دهد.

**`Tsetmc/Index.php?key=&type=1|2|3`** — پارامتر `type` **اجباری** است.
- `type=1` (بورس): **یک آبجکت** `{date,time,state,index,index_change,index_equalWeight,
index_equalWeight_change,mv,tno,tval,tvol}` — درصد ندارد، محاسبه می‌شود
(`indexChangePercent`: ‏change ÷ (value − change)؛ راستی‌آزمایی: ۱٫۹۳٪ و ۱٫۷۳٪
مطابق type=3).
- `type=2` (فرابورس): **یک آبجکت** `{date,time,state,index,index_change,mv_main,
mv_base,tno,tval,tvol}`.
- `type=3` (منتخب): **آرایه** (نمونه زنده: ۷ مورد) `{name,time,index,index_change,
index_change_percent,min,max}`.
تایپ‌ها: `BourseIndexSnapshot/IfbIndexSnapshot/IndexMeta`؛ ترکیب هر سه با تحمل خطای
جزئی: `fetchMarketIndices` (حداقل یک موفقیت لازم است). استور `indexMeta/indexIsMock`
جدا از نمادها نگه می‌دارد تا خرابی شاخص، سهام زنده را پاک نکند. صفحه شاخص‌ها متای
زنده (تاریخ/ساعت/وضعیت)، آمار کل بازار و کف/سقف روز را نشان می‌دهد.

**`Tsetmc/Nav.php?key=&l18=`** — پارامتر `l18` **اجباری** است (بدون آن: HTTP 400
`missing_param`)؛ **نسخه bulk ندارد**. پاسخ **یک آبجکت** `{date,time,psubtran
(صدور),predtran (ابطال)}` بدون تکرار l18 — نمونه زنده اهرم: صدور ۹۷٬۳۱۸ / ابطال
۹۵٬۹۵۱. تایپ `FundNav`، فشر `fetchFundNav` (کش ۲ دقیقه‌ای + localStorage).
صفحه صندوق‌ها ۴۳۸ ETF زنده را از AllSymbols جدا می‌کند (تطابق دقیق
`cs == «صندوق سرمایه‌گذاری قابل معامله»` — گروه «بیمه و صندوق بازنشستگی» جدا شد)
و NAV هر صندوق را فقط با دکمه on-demand می‌گیرد (حباب = قیمت ÷ NAV ابطال؛ حباب
مثبت قرمز، تخفیف سبز). توجه: پاسخ‌های خطا هم سهمیه مصرف می‌کنند؛ شناسه‌های
غیرصندوقی را به Nav نفرستید.

**`Tsetmc/Option.php`** — بدون پارامتر؛ **کل بازار آپشن در یک درخواست**
(نمونه زنده: ۱٬۶۲۵ قرارداد — ۸۴۲ خرید، ۷۸۳ فروش). هر رکورد تابلوی کامل دارد:
`base_l18, l18, l30, type (call|put), date_begin/end (شمسی), day_remain,
size_contract, price_strike, interest_open, base_py/pl/plp/pc/pcp, OHLCV کامل،
tno/tvol/tval, nval (ارزش مفهومی)، حقیقی/حقوقی، دفتر سفارش ۵ سطری`.
تایپ `OptionContractLive`، فشر `fetchOptionContracts` (کش ۶۰ ثانیه‌ای).
صفحه آپشن: تب خرید/فروش، جستجوی پایه، مرتب‌سازی (موقعیت باز/ارزش مفهومی/حجم/مانده)،
فیلتر ITM، وضعیت درسود/نزدیک/بی‌پول از `base_pc` و `price_strike`، و آمار کل
(تعداد، موقعیت باز، ارزش مفهومی). آپشن بورس کالا (`Ime/Option.php`) هنوز متصل نشده.

**`Tsetmc/Transaction.php?key=&l18=&date=`** — `l18` اجباری، `date` شمسی
(‏YYYY-MM-DD‏) اختیاری (بدون آن: آخرین روز معاملاتی). پاسخ **آرایه تیک‌ها**
`{row, time (HH:MM:SS), volume, price, canceled: 0|1}` — نمونه زنده اهرم:
۱۷٬۰۷۰ تیک (~۱٫۲MB). تایپ `TickTrade`، فشر `fetchTransactions(l18, date?)` با کش
۵ دقیقه‌ای (payload سنگین). صفحه جزئیات نماد بخش «ریزمعاملات آخرین روز» را
on-demand (دکمه، جدیدترین اول، میانگین موزون، نشان ابطال‌شده، صفحه‌بندی) نشان
می‌دهد تا بازدید معمولی صفحه سهمیه/پهنای‌باند مصرف نکند.

**`Tsetmc/History.php?key=&type=0&l18=`** — `l18` اجباری. پاسخ **آرایه روزانه،
جدیدترین اول** `{date (شمسی), time, tno, tvol, tval, pmin, pmax, py, pf, pl,
plc, plp, pc, pcc, pcp}` — نمونه زنده فملی: ۴٬۶۷۰ روز (~۲۰ سال، ~۰٫۹MB).
تایپ `DailyHistory`، فشر `fetchPriceHistory` (کش ۳۰ دقیقه‌ای). فقط `type=0`
(معاملات و قیمت) مستند/پیاده‌سازی شده است. نمودارها: `historyToCandles`
(‏open=pf/high=pmax/low=pmin/close=pc‏) با محور زمانی میلادی (`jalaliToGregorianIso`)
و نمایش شمسی در جدول/راهنما. صفحه سوابق (بازه ۳/۶/۱۲ ماهه + کامل، بازده دوره،
سقف/کف، میانگین حجم، جدول + صفحه‌بندی) و نمودار صفحه جزئیات (۱ ساله زنده) هر دو
از همین دیتا تغذیه می‌شوند؛ بدون کلید، نمودار نمایشی قبلی باقی است.

**`Tsetmc/Candlestick.php?key=&type=&l18=`** — پاسخ **آبجکت پوششی**
`{l18, type, count, candle_*}` با کلید متفاوت هر نوع (نمونه زنده فملی):
- `type=1` (امروز، ۲دقیقه‌ای): `candle_intraday` — ۱۰۵ رکورد `{time: HH:MM, ohlc, volume}` جدیدترین اول؛
- `type=2` (تعدیل‌نشده روزانه): `candle_daily` — `{date, ohlc, volume}`؛
- `type=3` (تعدیل‌شده روزانه): `candle_daily_adjusted` — ۴٬۳۰۳ رکورد (اثر تعدیل مشهود:
  close قدیمی ۴ در برابر ۳٬۷۰۴ خام).
تاریخ‌ها شمسی‌اند (در داک گاهی با `/` — هر دو نرمال می‌شود). تایپ `DailyCandle`،
فشرهای `fetchDailyCandles(kind)` (کش ۳۰ دقیقه‌ای) و `fetchIntradayCandles` (کش ۶۰
ثانیه‌ای). نمودار صفحه جزئیات سه‌حالته شد (تعدیل‌شده/تعدیل‌نشده/امروز)؛ حالت امروز
با محور UTCTimestamp (ساعت تهران UTC+3:30) رسم می‌شود. صفحه سوابق همچنان از
History.php (جدول + حجم) استفاده می‌کند.

**`Tsetmc/Shareholder.php?key=&l18=&date=`** — `l18` اجباری، `date` شمسی اختیاری
(بدون آن: آخرین وضعیت). پاسخ **آرایه سهامداران عمده** `{id, name, volume,
percent, change}` — نمونه زنده شتران: ۲۰ سهامدار (~۳KB، سبک). تایپ
`ShareholderRow` (‏volume → ‏shares)، فشر `fetchShareholders(l18, date?)`.
جدول سهامداران صفحه جزئیات خودکار زنده می‌شود (ستون تغییر روز با نشان
افزایش/کاهش/بدون‌تغییر) و بدون کلید به نمونه نمایشی برمی‌گردد.

**`Codal/Announcement.php?key=&l18=&category=&...&page=`** — مسیر پایه **`Codal/`**
است (نه `Tsetmc/`)؛ **همه پارامترها جز key اختیاری‌اند** (پیش‌فرض page=1 و
فیلترهای boolean=true). گروه‌ها ۱..۱۱ (صورت مالی، افشا، ماهانه، …، اوراق بدهی).
پاسخ **پوششی** `{count_announcement, count_page, announcement: [...~۲۰ در صفحه]}` —
نمونه زنده: ۶۲۶٬۴۳۰ اطلاعیه / ۳۱٬۳۲۲ صفحه؛ فیلتر خودرو+گروه افشا: ۲۲۶ مورد / ۱۲
صفحه. تاریخ‌ها شمسی با ارقام فارسی، لینک مستقیم کدال (متن/PDF/Excel/پیوست —
Excel و پیوست اختیاری‌اند). تایپ‌ها `CodalAnnouncement/CodalPage/CodalQuery`،
فشر `fetchCodalPage` (کش ۵ دقیقه‌ای). صفحه کدال: جستجوی نماد، ۱۱ گروه، فیلتر
تاریخ آغاز، صفحه‌بندی کامل با شمارش کل، و دکمه‌های لینک کدال؛ حالت نمایشی حفظ شده.

## ✅ پوشش کامل IME (هر ۵ اندپوینت با پاسخ زنده راستی‌آزمایی شد)

**`Ime/Futures.php` ✅** — بدون پارامتر؛ پوشه `{code_http, successful, status,
message_error, data: [...19 قرارداد]}` (~۱۹KB). فیلدها مطابق داک (کد/شرح قرارداد،
سررسید متنی و تاریخی، مانده روز، وجوه تضمین، OI، تسویه روز قبل/لحظه‌ای، OHLC،
حجم/ارزش، حقیقی/حقوقی، دفتر ۳سطری). دام‌ها: `date_end='0000-00-00'` و
`day_remain=null` برای بدون‌سررسیدها (حذف می‌شوند)، و `tval_unit=«هزار ریال»`
(ارزش ×۱۰۰۰ به تومان نمایش داده می‌شود). تایپ `ImeFuture`، فشر `fetchImeFutures`
(کش ۲ دقیقه‌ای). صفحه طلا/ارز/کالا تب «آتی کالا» دارد (lazy-load، آخرین/تغییر/
تسویه لحظه‌ای/OI/حجم/ارزش/تضمین، retry).

**`Ime/Option.php` ✅** — بدون پارامتر؛ **۱۵۱ ردیف جفتی** (هر ردیف = یک اعمال با
دو لگ `call_*` و `put_*`)، همان پوشه استاندارد IME. لگ‌های فروش کم‌نقدشونده
null-heavy هستند (نمونه زنده: ۱۲۲ قیمت خرید در برابر فقط ۱۰ قیمت فروش).
`contract_category` شامل تب و متن سررسید است (trim می‌شود). تایپ‌ها
`ImeOptionPair/ImeOptionLeg`، فشر `fetchImeOptions` (کش ۲ دقیقه‌ای). صفحه آپشن
بخش «آپشن بورس کالا» دارد: جدول جفتی (گروه/کالا/اعمال + قیمت/تغییر/OI هر دو لگ)،
جستجو، صفحه‌بندی، و lazy-load با دکمه برای حفظ سهمیه.

**`Ime/Fund.php` ✅** — بدون پارامتر؛ **۶۶ ردیف** = ۵۲ صندوق کالایی فعال + ۱۴
ردیف «شبح» با پسوند «۲» (‏pc=1، ‏pcp≈-100، غیرفعال) که فیلتر می‌شوند. فیلدها
مشتق TSETMC‌اند (l18/l30/isin/id، OHLC، حجم/ارزش، حقیقی/حقوقی، دفتر ۵سطری) پس
`normalizeSymbol` مستقیم استفاده شد. فشر `fetchImeFunds` (کش ۲ دقیقه‌ای).
صفحه صندوق‌ها بخش «صندوق‌های کالایی بورس کالا» دارد (lazy-load با دکمه، جدول
قیمت/تغییر/حجم/ارزش، صفحه‌بندی).

**`Ime/Physical.php?key=&date_start=&date_end=` ✅** — هر دو تاریخ شمسی و اختیاری
(پیش‌فرض: امروز؛ برای یک روز خاص هر دو را یکسان بفرستید). **شکل دوگانه:**
تعطیلات → پوشه `{successful:true, status:'no_data'}` بدون کلید data (حالت خالی
دوستانه، نه خطا)؛ روزهای معاملاتی → **آرایه مستقیم** (نمونه 1405-07-15: ۱۲۹
معامله). ردیف‌ها آمار کامل‌اند و ۱۷ ردیف قیمت null دارند («—» نمایش داده
می‌شود)؛ ارزش به هزار ریال است. تایپ‌ها `ImePhysicalTrade/ImePhysicalResult`،
فشر `fetchImePhysical` (کش ۵ دقیقه‌ای). تب «فیزیکی» صفحه کالا: ورودی بازه، جمع
ارزش کل، جدول + صفحه‌بندی، پیام «روز تعطیل».

**`Ime/Certificate.php` ✅** — بدون پارامتر؛ **۱۱ گواهی** (~۹KB)، همان پوشه IME.
مظنه لحظه‌ای `{commodity, contract_code/description, py/pf/pl (+تغییرات)،
pmax/pmin, tno/tvol/tval (هزار ریال)، دفتر ۳سطری}`. تایپ `ImeCertificate`، فشر
`fetchImeCertificates` (کش ۲ دقیقه‌ای). صفحه طلا/ارز/کالا تب «گواهی سپرده» دارد
(lazy-load، آخرین/تغییر/سقف/کف/پایانی دیروز/حجم/ارزش تومانی، retry).

**Market (رایگان، ~۱۵۰۰ درخواست/روز) ✅** — هر سه با مسیر دقیق داک تایید زنده شد
(توجه: `Gold_Currency.php` با آندرلاین است؛ حدس‌های قبلی `GoldCurrency/Crypto` غلط بود):
- `Market/Commodity.php` — پوشه `{metal_precious[4], metal_base[5], energy[5]}`؛
- `Market/Gold_Currency.php` — پوشه `{gold[9], currency[28], cryptocurrency[19]}`؛
- `Market/Cryptocurrency.php` — **آرایه ۲٬۹۹۹ رمزارز** (~۱MB).
آیتم‌ها `{date, time, time_unix, symbol?, name(_en)?, price, price_toman?,
change_value?, change_percent, market_cap?, link_icon?, unit?}`؛ دام‌ها: قیمت‌های
کریپتو **رشته** می‌آیند (coerce می‌شود)، تاریخ‌ها با `/`، و `name` کریپتو فارسی
است (`name_en` انگلیسی). تایپ `MarketQuote`، فشرهای `fetchCommodityMarket /
fetchGoldCurrencyMarket / fetchCryptoMarket` (کش ۵ دقیقه‌ای). استور جدا
`useMarketQuotesStore` (تروتل ۵ دقیقه، تحمل خطای جزئی، snapshot طلا/ارز برای
داشبورد)؛ صفحه طلا/ارز/کالا کارت‌محور و رمزارز جدول ۱۰۰تایی با آیکون، قیمت
دلاری+تومانی، ارزش بازار و جستجو (فهرست کامل ۲٬۹۹۹ فقط در تب رمزارز گرفته می‌شود).

ارزش کل، جدول + صفحه‌بندی، پیام «روز تعطیل».

## ✅ پوشش ۱۰۰٪ — هر ۱۷ اندپوینت مستند با پاسخ زنده راستی‌آزمایی شد

## امنیت کلید و سقف درخواست

1. کلید فقط در `.env` (`VITE_BRSAPI_KEY`) — هرگز کامیت نشود (`.gitignore`).
2. در production حتماً **backend proxy** بگذارید و `VITE_USE_PROXY=true` کنید؛
   `vite.config.ts` نمونه dev-proxy (`/api/brsapi → https://Api.BrsApi.ir`) را دارد.
3. احترام به quota: کش + throttle به‌روزرسانی (استور `market` هر ۴۵ث)،
   خطای 429 با پیام فارسی مدیریت می‌شود، و بدون کلید اپ به mock برچسب‌دار می‌افتد.
4. کش مقاوم (`client.ts`): payloadهای سنگین (تیک، تاریخچه، کندل، آپشن، کریپتو کامل)
   فقط در حافظه نگه داشته می‌شوند تا سهمیه ~۵MB لوکال‌استوریج برای دیتای حیاتی
   (نمادها، شاخص‌ها، مظنه‌ها) بماند؛ نوشتن با تخلیه قدیمی‌ترین‌ها در برابر
   QuotaExceeded محافظت می‌شود؛ و هنگام خطای شبکه/سهمیه، آخرین snapshot منقضی
   (stale-while-revalidate) نمایش داده می‌شود تا صفحه هیچ‌وقت خالی نماند.

## چک‌لیست اتصال زنده

- [x] `.env` با کلید واقعی + تمام ۱۷ اندپوینت با پاسخ زنده راستی‌آزمایی شد
- [x] همه صفحات با داده زنده + fallback نمایشی برچسب‌دار
- [ ] ساخت backend proxy در production و چرخش کلید در صورت لو رفتن
