import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'dashboard', component: () => import('@/pages/Dashboard.vue'), meta: { title: 'داشبورد بازار', subtitle: 'نمای کلی بورس تهران، طلا، ارز و کالا' } },
  { path: '/stocks', name: 'stocks', component: () => import('@/pages/Stocks.vue'), meta: { title: 'سهام', subtitle: 'فهرست قابل جستجو و فیلتر نمادها' } },
  { path: '/stocks/:symbol', name: 'stock-details', component: () => import('@/pages/StockDetails.vue'), meta: { title: 'جزئیات نماد', subtitle: 'نمودار، آمار معاملات و سهامداران' } },
  { path: '/stocks/:symbol/analysis', name: 'stock-analysis', component: () => import('@/pages/Analysis.vue'), meta: { title: 'تحلیل تکنیکال', subtitle: 'کارگاه نمودار، اندیکاتورها و ابزارهای ترسیم' } },
  { path: '/indices', name: 'indices', component: () => import('@/pages/Indices.vue'), meta: { title: 'شاخص‌های بازار', subtitle: 'شاخص کل، هم‌وزن، فرابورس و…' } },
  { path: '/funds', name: 'funds', component: () => import('@/pages/EtfFunds.vue'), meta: { title: 'صندوق‌ها و ETF', subtitle: 'قیمت، NAV و حباب صندوق‌ها' } },
  { path: '/options', name: 'options', component: () => import('@/pages/Options.vue'), meta: { title: 'بازار آپشن', subtitle: 'قراردادهای اختیار بورس و کالا' } },
  { path: '/history', name: 'history', component: () => import('@/pages/History.vue'), meta: { title: 'سوابق معاملات', subtitle: 'داده تاریخی و کندل‌های روزانه' } },
  { path: '/codal', name: 'codal', component: () => import('@/pages/Codal.vue'), meta: { title: 'اطلاعیه‌های کدال', subtitle: 'افشاها، صورت‌های مالی و مجامع' } },
  { path: '/commodities', name: 'commodities', component: () => import('@/pages/Commodities.vue'), meta: { title: 'طلا، ارز و کالا', subtitle: 'سکه، دلار، رمزارز و کامودیتی' } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/pages/NotFound.vue'), meta: { title: 'صفحه یافت نشد', subtitle: '' } },
]

export const router = createRouter({
  // BASE_URL comes from vite.config `base` ("/" locally,
  // "/stock-market-analytics/" on GitHub Pages) so routes resolve
  // under the deployment sub-path instead of the domain root.
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})
