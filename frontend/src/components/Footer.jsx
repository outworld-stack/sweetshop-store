import { Link } from "react-router";
import { Truck, Headphones } from 'reicon-react';

export default function Footer() {
  return (
    <footer className="border-t border-base-300 bg-base-100">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="grid gap-10 md:grid-cols-4">

          <div>
            <h3 className="text-sm font-samimBold uppercase tracking-wider text-base-content/50">
              شرکت
            </h3>
            <p className="mt-3 text-sm font-samim text-base-content/65">
              ساخته شده برای تیم‌هایی که به مشخصات دقیق، تحویل سریع و پشتیبانی انسانی در مواقع ضروری اهمیت می‌دهند.
            </p>
          </div>


          <div>
            <h3 className="text-xs font-samimBold uppercase tracking-wider text-base-content/50">
              پشتیبانی
            </h3>
            <ul className="mt-3 space-y-2 text-sm  text-base-content/70">
              <li className="flex items-start gap-2">
                <Headphones className="mt-0.5 size-5 text-justify font-samim shrink-0 text-primary" aria-hidden />
                <span>چت اختصاصی پس از پرداخت سفارش؛ لینک‌های ویدیویی در تاپیک به اشتراک گذاشته می‌شوند.</span>
              </li>
            </ul>
          </div>


          <div>
            <h3 className="text-xs font-samimBold tracking-wider text-base-content/50">
              فروشگاه
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/" className="link font-samim link-hover text-base-content/80">
                  تمام محصولات
                </Link>
              </li>
              <li>
                <Link to="/cart" className="link font-samim link-hover text-base-content/80">
                  سبدخرید
                </Link>
              </li>
              <li>
                <Link to="/orders" className="link font-samim link-hover text-base-content/80">
                  سفارشات
                </Link>
              </li>
            </ul>
          </div>


          <div>
            <div className="flex items-center font-samimBold gap-2 font-semibold text-base-content">
              <Truck className="size-8 text-primary" aria-hidden />
              پخش سوئیت شاپ
            </div>
            <p className="mt-3 text-sm font-samim text-justify leading-relaxed text-base-content/65">
              سخت‌افزارها و ابزارهای فضای کاری منتخب. سفارش‌های پرداخت‌شده شامل پشتیبانی اولویت‌دار می‌شوند؛ با تیم ما چت کنید و وقتی لینکی را به اشتراک می‌گذاریم، به یک تماس ویدیویی بپیوندید.
            </p>
          </div>

        </div>

        <div className="mt-10 space-y-4 border-t border-base-300 pt-6">
          <p className="text-center text-xs text-base-content/50">
            © {new Date().getFullYear()} SweetShop Supply · All prices Unfortunately in poor usd
          </p>
        </div>
      </div>
    </footer>
  );
}