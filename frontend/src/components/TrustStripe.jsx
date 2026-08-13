
import { ShieldCheck, Truck, CreditCard, Headphones } from 'reicon-react';



const items = [
    {
        icon: Truck,
        title: "راستی آزمایی شده",
        desc: "محصولات ساختار بندی شده"
    },
    {
        icon: ShieldCheck,
        title: "پرداخت امن",
        desc: "پرداخت رمزنگاری شده به همراه تاییدیه سفارشات"
    },
    {
        icon: CreditCard,
        title: "ارسال محموله",
        desc: "قیمت به واحد دلار ، پرداخت ارزش افزوده در محل تحویل"
    },
    {
        icon: Headphones,
        title: "پشتیانی",
        desc: "پشتیبانی در صفحه ی سفارش به همراه آپشن ارسال ویدئو"
    }
];

export function TrustStripe() {
    return (
        <section className='grid gap-4 rounded-box border border-base-300 bg-base-100 p-6 sm:grid-cols-2 lg:grid-cols-4'>
            {items.map(({ icon, title, desc }) => {
                const Iconmap = icon;
                return (
                    <div key={title} className='flex gap-3'>
                        <div className='flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                            <Iconmap className='size-5' aria-hidden />
                        </div>
                        <div>
                            <h3 className='font-samimBold text-base-content'>{title}</h3>
                            <p className='mt-0.5 text-sm text-base-content/65'>{desc}</p>
                        </div>
                    </div>
                )
            })}
        </section>
    )
}