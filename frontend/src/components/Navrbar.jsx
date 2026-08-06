import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { Link } from "react-router";
import { Store, Bag2, Package, Widget, CartShop, Login4 } from 'reicon-react';
import { Show, SignInButton, UserButton } from '@clerk/react';
import { useCart } from "../store/cart";


function Navrbar() {
  const { getToken, isSignedIn } = useAuth();

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch("/api/me", { getToken }),
    enabled: isSignedIn
  })

  const role = meData?.user?.role;

  const cartCount = useCart(s => s.items.reduce((n, line) => n + line.quantity, 0));




  return (
    <header className="sticky top-0 z-50 border-b border-base-300 bg-base-100/95 shadow-sm backdrop-blur-md">
      <div className="navbar mx-auto min-h-14 max-w-7xl px-4 py-2.5 md:px-6 md:py-3">
        <div className="flex-1">
          <Link to="/" className="btn btn-ghost gap-2 px-2 font-samimBold text-lg font-semibold uppercase tracking-wide md:text-xl">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 p-1 text-primary">
              <Store className="size-8" aria-hidden>
              </Store>
            </span>
            <span className="leading-none">سوئیت شاپ</span>
          </Link>
        </div>
        <nav className="flex items-center gap-1 md:gap-1.5 font-samim">
          <Link to="/" className="btn btn-ghost gap-2 font-medium">
            <Bag2 className="size6 opacity-90" aria-hidden />
            <span className="hidden sm:inline">فروشگاه</span>
          </Link>
          <Show when={"signed-in"}>
            <Link to="/orders" className="btn btn-ghost gap-2 font-medium">
              <Package className="size-6 opacity-90" aria-hidden />
              <span className="hidden sm:inline">سفارشات</span>
            </Link>
            {
              role === "admin" ? (
                <Link to="/admin" className="btn btn-ghost gap-2 font-medium text-secondary">
                  <Widget className="size-6" aria-hidden />
                  <span className="hidden sm:inline">ادمین</span>
                </Link>
              )
                : null
            }
          </Show>
          <Link to="/cart" className="btn btn-ghost gap-2 font-medium indicator border border-base-200" aria-label={cartCount > 0 ? `Cart,${cartCount} items` : "Cart"}>
            {
              cartCount > 0 ? (
                <span className="indicator-item indicator-top indicator-end badge badge-primary badge-sm min-w-2 px-1.5 font-samim text-white text-xs tabular-nums">{cartCount > 99 ? "99+" : cartCount}</span>
              ) : null
            }
            <CartShop className="size-6 opacity-90" aria-hidden />
            <span className="hidden sm:inline">سبدخرید</span>
          </Link>

          <Show when={"signed-out"}>
            <SignInButton mode="modal">
              <button type="button" className="btn btn-primary btn-sm gap-1.5 px-3 shadow-md">
                <Login4 className="size-4 drop-shadow-sm" aria-hidden />
                ورود
              </button>
            </SignInButton>
          </Show>

          <Show when={"signed-in"}>
            <div className="flex items-center gap-2 mr-2 pl-3">
              <UserButton
                appearance={{ elements: { avatarBox: "h-10 w-10 ring-2 ring-base-300" } }}
              />
              {
                role === "support" || role === "admin" ? (
                  <span className="text-white badge badge-primary badge-sm hidden capitalize md:inline-flex">
                    {
                      role === "admin" ? "ادمین" : "پشتیبان"
                    }
                  </span>
                ) : null
              }
            </div>
          </Show>

        </nav>
      </div>
    </header>
  )

}

export default Navrbar;