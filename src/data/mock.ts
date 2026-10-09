import type {
  CandlePoint,
  CodalAnnouncement,
  CommodityPrice,
  EtfFund,
  MarketIndex,
  OptionContract,
  ShareholderRow,
  TsetmcSymbol,
} from '@/types/market'

/**
 * Realistic SAMPLE data for UI previews only.
 * Every consumer must surface `isMock: true` via <MockBadge /> until live API is wired.
 * Numbers are plausible TSE-scale figures, not live quotes.
 */

export const MOCK_SYMBOLS: TsetmcSymbol[] = [
  { l18: 'فولاد', l30: 'فولاد مبارکه اصفهان', isin: 'IRO1FOLD0001', id: '46342955745252989', cs: 'فلزات اساسی', py: 5120, pf: 5180, pl: 5310, plc: 190, plp: 3.71, pc: 5285, pcc: 165, pcp: 3.22, pmin: 5160, pmax: 5325, tmin: 4864, tmax: 5376, tno: 8421, tvol: 48210355, tval: 2548123456789, eps: 1120, pe: 4.72, mv: 458000000000000, z: 88000000000, bvol: 35200000, Buy_CountI: 2140, Buy_CountN: 31, Sell_CountI: 1680, Sell_CountN: 22, Buy_I_Volume: 30120000, Buy_N_Volume: 18090000, Sell_I_Volume: 28900000, Sell_N_Volume: 19310000, market: 'tse', time: '12:30:00' },
  { l18: 'شتران', l30: 'پالایش نفت تهران', isin: 'IRO1PTEH0001', id: '51617145873056483', cs: 'فراورده‌های نفتی', py: 4437, pf: 4500, pl: 4499, plc: 62, plp: 1.4, pc: 4529, pcc: 92, pcp: 2.07, pmin: 4470, pmax: 4594, tmin: 4216, tmax: 4658, tno: 5953, tvol: 174743191, tval: 791481204551, eps: 908, pe: 4.98, mv: 124547500000000, z: 27500000000, bvol: 27485112, Buy_CountI: 2068, Buy_CountN: 19, Sell_CountI: 1473, Sell_CountN: 17, Buy_I_Volume: 143033919, Buy_N_Volume: 31709272, Sell_I_Volume: 113322786, Sell_N_Volume: 61420405, market: 'tse', time: '12:30:01' },
  { l18: 'فملی', l30: 'ملی صنایع مس ایران', isin: 'IRO1MSMI0001', id: '35425587644337414', cs: 'فلزات اساسی', py: 7890, pf: 7950, pl: 8120, plc: 230, plp: 2.91, pc: 8080, pcc: 190, pcp: 2.41, pmin: 7900, pmax: 8150, tmin: 7496, tmax: 8284, tno: 6110, tvol: 32500410, tval: 2621000000000, eps: 1450, pe: 5.57, mv: 485000000000000, z: 60000000000, bvol: 24000000, Buy_CountI: 1890, Buy_CountN: 27, Sell_CountI: 1510, Sell_CountN: 19, Buy_I_Volume: 21000000, Buy_N_Volume: 11500000, Sell_I_Volume: 19800000, Sell_N_Volume: 12700000, market: 'tse', time: '12:29:44' },
  { l18: 'شبندر', l30: 'پالایش نفت بندرعباس', isin: 'IRO1PNBO0001', id: '37653276112359548', cs: 'فراورده‌های نفتی', py: 9120, pf: 9050, pl: 8980, plc: -140, plp: -1.54, pc: 9015, pcc: -105, pcp: -1.15, pmin: 8940, pmax: 9120, tmin: 8664, tmax: 9576, tno: 4320, tvol: 28900110, tval: 2605000000000, eps: 1980, pe: 4.55, mv: 124000000000000, z: 13800000000, bvol: 13800000, Buy_CountI: 1210, Buy_CountN: 14, Sell_CountI: 1390, Sell_CountN: 18, Buy_I_Volume: 17000000, Buy_N_Volume: 11900000, Sell_I_Volume: 19500000, Sell_N_Volume: 9400000, market: 'tse', time: '12:29:51' },
  { l18: 'خودرو', l30: 'ایران خودرو', isin: 'IRO1IKCO0001', id: '45766784491409582', cs: 'خودرو و ساخت قطعات', py: 2980, pf: 3010, pl: 3120, plc: 140, plp: 4.7, pc: 3095, pcc: 115, pcp: 3.86, pmin: 2990, pmax: 3130, tmin: 2831, tmax: 3129, tno: 12480, tvol: 512000000, tval: 1580000000000, eps: -320, pe: -9.67, mv: 93000000000000, z: 30000000000, bvol: 30000000, Buy_CountI: 5100, Buy_CountN: 25, Sell_CountI: 4300, Sell_CountN: 30, Buy_I_Volume: 380000000, Buy_N_Volume: 132000000, Sell_I_Volume: 350000000, Sell_N_Volume: 162000000, market: 'tse', time: '12:30:00' },
  { l18: 'وبملت', l30: 'بانک ملت', isin: 'IRO1BMLT0001', id: '778253364357513', cs: 'بانک‌ها و موسسات اعتباری', py: 4210, pf: 4230, pl: 4190, plc: -20, plp: -0.48, pc: 4200, pcc: -10, pcp: -0.24, pmin: 4170, pmax: 4250, tmin: 4000, tmax: 4420, tno: 5210, tvol: 98000000, tval: 411000000000, eps: 890, pe: 4.72, mv: 150000000000000, z: 35700000000, bvol: 35700000, Buy_CountI: 1980, Buy_CountN: 21, Sell_CountI: 2050, Sell_CountN: 20, Buy_I_Volume: 60000000, Buy_N_Volume: 38000000, Sell_I_Volume: 62000000, Sell_N_Volume: 36000000, market: 'tse', time: '12:28:12' },
  { l18: 'شپنا', l30: 'پالایش نفت اصفهان', isin: 'IRO1PNES0001', id: '5814727455945764', cs: 'فراورده‌های نفتی', py: 6240, pf: 6300, pl: 6480, plc: 240, plp: 3.85, pc: 6440, pcc: 200, pcp: 3.21, pmin: 6280, pmax: 6500, tmin: 5928, tmax: 6552, tno: 4980, tvol: 67200000, tval: 432000000000, eps: 1210, pe: 5.32, mv: 172000000000000, z: 26700000000, bvol: 26700000, Buy_CountI: 1760, Buy_CountN: 23, Sell_CountI: 1420, Sell_CountN: 16, Buy_I_Volume: 45000000, Buy_N_Volume: 22200000, Sell_I_Volume: 41000000, Sell_N_Volume: 26200000, market: 'tse', time: '12:29:02' },
  { l18: 'خساپا', l30: 'سایپا', isin: 'IRO1SSAP0001', id: '11214569921546211', cs: 'خودرو و ساخت قطعات', py: 2450, pf: 2420, pl: 2380, plc: -70, plp: -2.86, pc: 2395, pcc: -55, pcp: -2.24, pmin: 2370, pmax: 2440, tmin: 2328, tmax: 2572, tno: 8930, tvol: 410000000, tval: 980000000000, eps: -410, pe: -5.84, mv: 47000000000000, z: 19600000000, bvol: 19600000, Buy_CountI: 3200, Buy_CountN: 12, Sell_CountI: 3900, Sell_CountN: 15, Buy_I_Volume: 280000000, Buy_N_Volume: 130000000, Sell_I_Volume: 310000000, Sell_N_Volume: 100000000, market: 'tse', time: '12:30:00' },
  { l18: 'اهرم', l30: 'صندوق اهرمی کاریزما', isin: 'IRO1AHRM0001', id: '71345218900621457', cs: 'صندوق سرمایه‌گذاری', py: 21340, pf: 21500, pl: 22480, plc: 1140, plp: 5.34, pc: 22210, pcc: 870, pcp: 4.08, pmin: 21400, pmax: 22500, tmin: 20273, tmax: 22407, tno: 3120, tvol: 18400000, tval: 408000000000, eps: null, pe: null, mv: 11000000000000, z: 500000000, bvol: 500000, Buy_CountI: 1450, Buy_CountN: 8, Sell_CountI: 1100, Sell_CountN: 6, Buy_I_Volume: 14000000, Buy_N_Volume: 4400000, Sell_I_Volume: 13200000, Sell_N_Volume: 5200000, market: 'etf', time: '12:29:30' },
  { l18: 'طلا', l30: 'صندوق طلای لوتوس', isin: 'IRO1TLOT0001', id: '61129874550023114', cs: 'صندوق سرمایه‌گذاری', py: 182400, pf: 183100, pl: 185900, plc: 3500, plp: 1.92, pc: 185200, pcc: 2800, pcp: 1.54, pmin: 182800, pmax: 186300, tmin: 173280, tmax: 191520, tno: 2210, tvol: 3200000, tval: 594000000000, eps: null, pe: null, mv: 9200000000000, z: 50000000, bvol: 50000, Buy_CountI: 980, Buy_CountN: 11, Sell_CountI: 860, Sell_CountN: 9, Buy_I_Volume: 2100000, Buy_N_Volume: 1100000, Sell_I_Volume: 2000000, Sell_N_Volume: 1200000, market: 'etf', time: '12:29:15' },
  { l18: 'دارایکم', l30: 'صندوق واسطه‌گری مالی یکم', isin: 'IRO1DAR10001', id: '12245678900031245', cs: 'صندوق سرمایه‌گذاری', py: 14890, pf: 14950, pl: 14720, plc: -170, plp: -1.14, pc: 14780, pcc: -110, pcp: -0.74, pmin: 14650, pmax: 14980, tmin: 14146, tmax: 15634, tno: 1870, tvol: 9100000, tval: 134000000000, eps: null, pe: null, mv: 15000000000000, z: 1000000000, bvol: 1000000, Buy_CountI: 760, Buy_CountN: 7, Sell_CountI: 890, Sell_CountN: 8, Buy_I_Volume: 6000000, Buy_N_Volume: 3100000, Sell_I_Volume: 6800000, Sell_N_Volume: 2300000, market: 'etf', time: '12:27:40' },
  { l18: 'نوری', l30: 'پتروشیمی نوری', isin: 'IRO1NOOR0001', id: '44123456789012345', cs: 'محصولات شیمیایی', py: 115600, pf: 116200, pl: 118900, plc: 3300, plp: 2.85, pc: 118200, pcc: 2600, pcp: 2.25, pmin: 115800, pmax: 119200, tmin: 109820, tmax: 121380, tno: 1980, tvol: 2400000, tval: 283000000000, eps: 21400, pe: 5.52, mv: 355000000000000, z: 3000000000, bvol: 3000000, Buy_CountI: 640, Buy_CountN: 13, Sell_CountI: 580, Sell_CountN: 10, Buy_I_Volume: 1500000, Buy_N_Volume: 900000, Sell_I_Volume: 1400000, Sell_N_Volume: 1000000, market: 'tse', time: '12:26:55' },
]

export const MOCK_INDICES: MarketIndex[] = [
  { code: 'TEDPIX', name: 'شاخص کل', value: 2845120, change: 42310, changePercent: 1.51, time: '12:30:00' },
  { code: 'TEPIX30', name: 'شاخص ۳۰ شرکت بزرگ', value: 198450, change: 2890, changePercent: 1.48, time: '12:30:00' },
  { code: 'IFX', name: 'شاخص فرابورس (آیفکس)', value: 26480, change: -85, changePercent: -0.32, time: '12:30:00' },
  { code: 'TEDPIX_EQ', name: 'شاخص هم‌وزن', value: 812340, change: 5120, changePercent: 0.63, time: '12:30:00' },
  { code: 'FREEFLOAT', name: 'شاخص شناور آزاد', value: 3561200, change: 48900, changePercent: 1.39, time: '12:30:00' },
  { code: 'MARKET1', name: 'شاخص بازار اول', value: 2140800, change: 31200, changePercent: 1.48, time: '12:30:00' },
]

export const MOCK_FUNDS: EtfFund[] = [
  { symbol: 'اهرم', name: 'صندوق اهرمی کاریزما', price: 22480, nav: 21890, premiumDiscountPercent: 2.7, changePercent: 5.34, volume: 18400000, marketValue: 11000000000000, type: 'اهرمی' },
  { symbol: 'طلا', name: 'صندوق طلای لوتوس', price: 185900, nav: 185150, premiumDiscountPercent: 0.4, changePercent: 1.92, volume: 3200000, marketValue: 9200000000000, type: 'طلا' },
  { symbol: 'دارایکم', name: 'واسطه‌گری مالی یکم', price: 14720, nav: 15210, premiumDiscountPercent: -3.22, changePercent: -1.14, volume: 9100000, marketValue: 15000000000000, type: 'سهامی' },
  { symbol: 'پالایش', name: 'صندوق پالایشی یکم', price: 98450, nav: 101200, premiumDiscountPercent: -2.72, changePercent: 0.85, volume: 4300000, marketValue: 18000000000000, type: 'سهامی' },
  { symbol: 'یاقوت', name: 'صندوق درآمد ثابت یاقوت آگاه', price: 1023400, nav: 1023350, premiumDiscountPercent: 0.0, changePercent: 0.06, volume: 120000, marketValue: 25000000000000, type: 'درآمد ثابت' },
  { symbol: 'عیار', name: 'صندوق طلای عیار مفید', price: 128700, nav: 128250, premiumDiscountPercent: 0.35, changePercent: 2.1, volume: 8700000, marketValue: 14000000000000, type: 'طلا' },
]

export const MOCK_OPTIONS: OptionContract[] = [
  { symbol: 'ضفولا۷۱۲', underlying: 'فولاد', strike: 5500, expiryFa: '۱۴۰۵/۰۷/۱۲', expiryDays: 42, callPrice: 320, openInterest: 18400, volume: 5210, changePercent: 12.4, market: 'بورس' },
  { symbol: 'طفولا۷۱۲', underlying: 'فولاد', strike: 5500, expiryFa: '۱۴۰۵/۰۷/۱۲', expiryDays: 42, callPrice: 180, putPrice: 180, openInterest: 9200, volume: 2100, changePercent: -4.2, market: 'بورس' },
  { symbol: 'ضخود۷۱۰', underlying: 'خودرو', strike: 3200, expiryFa: '۱۴۰۵/۰۷/۱۰', expiryDays: 40, callPrice: 210, openInterest: 45200, volume: 18900, changePercent: 22.8, market: 'بورس' },
  { symbol: 'ضشتر۹۰۵', underlying: 'شتران', strike: 4800, expiryFa: '۱۴۰۵/۰۹/۰۵', expiryDays: 96, callPrice: 265, openInterest: 12300, volume: 3400, changePercent: 6.1, market: 'بورس' },
  { symbol: 'گطلا۱۲', underlying: 'صندوق طلا', strike: 190000, expiryFa: '۱۴۰۵/۰۸/۲۰', expiryDays: 80, callPrice: 8400, openInterest: 6700, volume: 1450, changePercent: 3.4, market: 'کالا' },
  { symbol: 'آتی نقره', underlying: 'نقره', strike: 620000, expiryFa: '۱۴۰۵/۰۶/۳۱', expiryDays: 21, callPrice: 18500, openInterest: 3100, volume: 890, changePercent: -1.8, market: 'کالا' },
]

export const MOCK_CODAL: CodalAnnouncement[] = [
  { symbol: 'فولاد', company: 'فولاد مبارکه اصفهان', title: 'افشای اطلاعات بااهمیت — کسب مجوز افزایش سرمایه ۲۵ درصدی', code: 'ن-۷', categoryLabel: 'افشای اطلاعات بااهمیت', date_publish: '۱۴۰۵/۰۷/۱۷', time_publish: '۱۰:۲۴', link: 'https://codal.ir' },
  { symbol: 'شتران', company: 'پالایش نفت تهران', title: 'صورت‌های مالی میان‌دوره‌ای ۶ ماهه حسابرسی‌نشده', code: 'ن-۱۰', categoryLabel: 'صورت‌های مالی', date_publish: '۱۴۰۵/۰۷/۱۷', time_publish: '۰۹:۱۲', link: 'https://codal.ir' },
  { symbol: 'فملی', company: 'ملی صنایع مس ایران', title: 'آگهی دعوت به مجمع عمومی فوق‌العاده', code: 'م-۱۰', categoryLabel: 'مجمع', date_publish: '۱۴۰۵/۰۷/۱۶', time_publish: '۱۵:۴۰', link: 'https://codal.ir' },
  { symbol: 'نوری', company: 'پتروشیمی نوری', title: 'گزارش فعالیت ماهانه — شهریور ماه', code: 'م-۱۲', categoryLabel: 'گزارش فعالیت ماهانه', date_publish: '۱۴۰۵/۰۷/۱۶', time_publish: '۱۳:۰۵', link: 'https://codal.ir' },
  { symbol: 'خودرو', company: 'ایران خودرو', title: 'افشای اطلاعات بااهمیت — انعقاد قرارداد فروش عمده', code: 'ن-۷', categoryLabel: 'افشای اطلاعات بااهمیت', date_publish: '۱۴۰۵/۰۷/۱۵', time_publish: '۱۶:۲۰', link: 'https://codal.ir' },
  { symbol: 'وبملت', company: 'بانک ملت', title: 'تصمیمات مجمع عمومی عادی سالیانه', code: 'م-۱۰', categoryLabel: 'مجمع', date_publish: '۱۴۰۵/۰۷/۱۵', time_publish: '۱۱:۳۲', link: 'https://codal.ir' },
  { symbol: 'شبندر', company: 'پالایش نفت بندرعباس', title: 'توضیحات در خصوص نوسان قیمت سهام', code: 'ن-۶', categoryLabel: 'شفاف‌سازی', date_publish: '۱۴۰۵/۰۷/۱۴', time_publish: '۱۴:۱۰', link: 'https://codal.ir' },
  { symbol: 'خساپا', company: 'سایپا', title: 'گزارش کنترل‌های داخلی', code: 'ن-۱۱', categoryLabel: 'سایر', date_publish: '۱۴۰۵/۰۷/۱۴', time_publish: '۱۰:۰۲', link: 'https://codal.ir' },
]

export const MOCK_COMMODITIES: CommodityPrice[] = [
  { name: 'سکه امامی', unit: 'تومان', price: 985000000, change: 5200000, changePercent: 0.53, market: 'طلا', updatedFa: '۱۴۰۵/۰۷/۱۷ ۱۲:۳۰' },
  { name: 'طلای ۱۸ عیار (گرم)', unit: 'تومان', price: 98250000, change: 640000, changePercent: 0.66, market: 'طلا', updatedFa: '۱۴۰۵/۰۷/۱۷ ۱۲:۳۰' },
  { name: 'انس جهانی طلا', unit: 'دلار', price: 3912, change: 18, changePercent: 0.46, market: 'طلا', updatedFa: '۱۴۰۵/۰۷/۱۷ ۱۲:۳۰' },
  { name: 'دلار آزاد', unit: 'تومان', price: 1124500, change: -3200, changePercent: -0.28, market: 'ارز', updatedFa: '۱۴۰۵/۰۷/۱۷ ۱۲:۳۰' },
  { name: 'یورو آزاد', unit: 'تومان', price: 1318000, change: 4500, changePercent: 0.34, market: 'ارز', updatedFa: '۱۴۰۵/۰۷/۱۷ ۱۲:۳۰' },
  { name: 'درهم امارات', unit: 'تومان', price: 306200, change: -800, changePercent: -0.26, market: 'ارز', updatedFa: '۱۴۰۵/۰۷/۱۷ ۱۲:۳۰' },
  { name: 'بیت‌کوین', unit: 'دلار', price: 121450, change: 1820, changePercent: 1.52, market: 'رمزارز', updatedFa: '۱۴۰۵/۰۷/۱۷ ۱۲:۳۰' },
  { name: 'اتریوم', unit: 'دلار', price: 4520, change: -64, changePercent: -1.4, market: 'رمزارز', updatedFa: '۱۴۰۵/۰۷/۱۷ ۱۲:۳۰' },
  { name: 'مس جهانی', unit: 'دلار/تن', price: 10240, change: 95, changePercent: 0.94, market: 'کالا', updatedFa: '۱۴۰۵/۰۷/۱۷ ۱۲:۳۰' },
  { name: 'نفت برنت', unit: 'دلار/بشکه', price: 68.4, change: -0.5, changePercent: -0.73, market: 'کالا', updatedFa: '۱۴۰۵/۰۷/۱۷ ۱۲:۳۰' },
]

export function mockCandles(base: number, days = 90, seed = 7): CandlePoint[] {
  // Deterministic pseudo-random walk so charts look stable across reloads.
  let x = seed
  const rnd = () => {
    x = (x * 1103515245 + 12345) % 2147483648
    return x / 2147483648
  }
  const out: CandlePoint[] = []
  let price = base * 0.82
  const start = new Date()
  start.setDate(start.getDate() - days)
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const drift = (rnd() - 0.46) * base * 0.03
    const open = price
    const close = Math.max(base * 0.4, open + drift)
    const high = Math.max(open, close) + rnd() * base * 0.008
    const low = Math.min(open, close) - rnd() * base * 0.008
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    out.push({ time: iso, open: Math.round(open), high: Math.round(high), low: Math.round(low), close: Math.round(close), volume: Math.round(2_000_000 + rnd() * 30_000_000) })
    price = close
  }
  // anchor last candle near base
  const last = out[out.length - 1]
  if (last) last.close = Math.round(base)
  return out
}

export function mockShareholders(symbol: string): ShareholderRow[] {
  void symbol
  return [
    { name: 'شرکت سرمایه‌گذاری توسعه معادن و فلزات', shares: 4200000000, percent: 14.2, change: 0.1 },
    { name: 'صندوق بازنشستگی کشوری', shares: 3100000000, percent: 10.5, change: 0 },
    { name: 'شرکت سرمایه‌گذاری غدیر', shares: 2650000000, percent: 8.9, change: -0.2 },
    { name: 'سازمان تامین اجتماعی', shares: 1980000000, percent: 6.7, change: 0.05 },
    { name: 'سایر سهامداران حقیقی', shares: 17700000000, percent: 59.7, change: 0.05 },
  ]
}
