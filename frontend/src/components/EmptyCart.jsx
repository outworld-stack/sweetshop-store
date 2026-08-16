import {  Package, ArrowRight5 , CartShop } from 'reicon-react';

import { Link } from "react-router";

export default function EmptyCart() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-base-300 bg-linear-to-b from-base-200/50 to-base-100 px-6 py-12 text-center sm:px-10 sm:py-16">
      <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-base-300/60 text-primary/80 ring-4 ring-base-200/80">
        <CartShop className="size-10" aria-hidden />
      </div>
      <h2 className="text-xl font-samimBold tracking-tight text-base-content sm:text-2xl">
        سبد خرید خالی است
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-base-content/65">
        بعد از اضافه کردن محصول&apos;اینجا نمایش داده می شود
      </p>
      <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
        <Link to="/#catalog" className="btn btn-primary gap-2 shadow-md">
          جستجو محصولات
          <ArrowRight5 className="size-4" aria-hidden />
        </Link>
        <Link
          to="/orders"
          className="btn btn-ghost gap-2 border border-white bg-base-100 hover:border-primary/35 hover:bg-base-200/50"
        >
          <Package className="size-4" aria-hidden />
          سفارشات
        </Link>
      </div>
    </div>
  );
}