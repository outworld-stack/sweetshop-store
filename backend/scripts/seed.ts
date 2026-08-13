import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { products } from "../src/db/schema.js";
import { error, log } from "console";


const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const CATALOG = [
    {
        "slug": "alpha-zv-mirrorless",
        "name": "دوربین بدون آینه سونی Alpha ZV",
        "category": "Camera",
        "description": "دوربین فوق حرفه‌ای با سنسور ۲۴.۲ مگاپیکسل EXMOR R، فیلمبرداری ۴K با نرخ ۱۲۰ فریم، فوکوس خودکار هیبریدی با تشخیص چشم و حیوانات، نمایشگر لمسی چرخان ۳ اینچی، وزن فوق‌سبک ۴۲۰ گرمی، مناسب برای تولید محتوای سینمایی و ولاگ‌های لوکس",
        "priceCents": 87900,
        "imageUrl": "https://cdn.dribbble.com/userupload/48661022/file/f3410cca96d8ab1bfe73537f7be5e135.png"
    },
    {
        "slug": "JB-pro-mic",
        "name": "هدفون بیسیم JB ",
        "category": "Audio",
        "description": "هدفون با درایورهای ۴۰ میلی‌متری تیتانیوم و کیفیت صدای استودیویی، مجهز به قوی‌ترین فناوری حذف نویز فعال (ANC) تا ۴۵ دسی‌بل، باتری ۴۵ ساعته با شارژ سریع ۱۰ دقیقه‌ای، اتصال بلوتوث ۵.۳ با پشتیبانی از کدک LDAC، طراحی با چرم مموری‌فوم",
        "priceCents": 35900,
        "imageUrl": "https://cdn.dribbble.com/users/98765/screenshots/1234567/media/headphone_shot.jpg"
    },
    {
        "slug": "titan-ultra-watch",
        "name": "ساعت هوشمند Titan Ultra watch",
        "category": "Wearable",
        "description": "ساعت با صفحه نمایش ۱.۴۳ اینچی AMOLED با روشنایی ۱۰۰۰ نیت، حسگرهای پیشرفته PPG برای اندازه‌گیری فشار خون و اکسیژن خون (SpO2)، GPS دو فرکانسه برای مسیریابی دقیق، مقاوم در برابر آب تا ۱۰۰ متر، باتری فوق‌طویل ۲۰ روزه در حالت عادی",
        "priceCents": 49900,
        "imageUrl": "https://cdn.dribbble.com/users/111222/screenshots/3334444/media/smartwatch_gold.png"
    },
    {
        "slug": "ergo-pro-chair",
        "name": "صندلی ارگونومیک Ergo Pro chair",
        "category": "Workspace",
        "description": "صندلی اداری با توری ۳D تنفس‌پذیر درجه یک، قابلیت تنظیم ۴ بعدی دسته‌ها و پشتی با زاویه ۱۳۵ درجه و قفل مورب، تکیه‌گاه کمری با قابلیت تنظیم ارتفاع و عمق، پایه‌های نایلونی با چرخ‌های سیلیکونی بی‌صدا و ترمزدار، مناسب برای کاربران حرفه‌ای و برنامه‌نویسان",
        "priceCents": 72900,
        "imageUrl": "https://cdn.dribbble.com/users/555666/screenshots/7778888/media/ergonomic_chair_3d.jpg"
    },
    {
        "slug": "luggage-shell",
        "name": "چمدان هوشمند",
        "category": "Travel",
        "description": "چمدان با بدنه پلی‌کربنات آلمانی و الگوی الماس ضدخط، مجهز به چهار چرخ ۳۶۰ درجه با سیستم تعلیق، قفل هوشمند TSA با قابلیت بازشدن با اثر انگشت، دارای پورت USB-C برای شارژ وسایل، زیپ‌های ضدسرقت و بندهای کمربندی داخلی ۴ جهته",
        "priceCents": 59900,
        "imageUrl": "https://cdn.dribbble.com/users/121212/screenshots/3434343/media/luggage_travel.jpg"
    },
    {
        "slug": "volt-core-20000",
        "name": "پاوربانک سریع‌شارژ Volt Core ۲۰۰۰۰",
        "category": "Accessories",
        "description": "پاوربانک با ظرفیت واقعی ۲۰۰۰۰ میلی‌آمپر ساعت، پشتیبانی از توان ۱۰۰ وات (PD 3.0 & PPS)، دارای ۲ پورت USB-C و ۱ پورت USB-A با خروجی ۲۲.۵ وات، نمایشگر OLED هوشمند برای نمایش ولتاژ و جریان لحظه‌ای، قابلیت شارژ مک‌بوک و گوشی‌های گیمینگ",
        "priceCents": 21900,
        "imageUrl": "https://cdn.dribbble.com/users/998877/screenshots/6655443/media/powerbank_oled.png"
    },
    {
        "slug": "action-x-titan",
        "name": "دوربین اکشن Titan X 5.3K",
        "category": "Camera",
        "description": "دوربین اکشن با سنسور ۱/۱.۹ اینچی و کیفیت ۵.۳K با نرخ ۶۰ فریم، لرزشگیر فوق‌پیشرفته FlowState 4.0، مقاوم در برابر آب تا عمق ۱۵ متر بدون قاب، نمایشگر لمسی ۲.۲۵ اینچی با روشنایی ۵۰۰ نیت، قابلیت فیلمبرداری شب با رنگ‌های زنده و باتری ۱۸۰۰ میلی‌آمپر",
        "priceCents": 41900,
        "imageUrl": "https://cdn.dribbble.com/users/445566/screenshots/2233445/media/action_camera_waterproof.jpg"
    },
    {
        "slug": "studio-condenser-pro",
        "name": "میکروفون کندانسور استودیویی Pro",
        "category": "Audio",
        "description": "میکروفون با دیافراگم بزرگ ۳۴ میلی‌متری و الگوی قطبی کاردیوئید و فیگور-۸، پاسخ فرکانسی فوق‌گسترده ۲۰ هرتز تا ۴۰ کیلوهرتز، خروجی دوگانه USB-C و XLR با تبدیل‌کننده آنالوگ به دیجیتال ۲۴ بیت/۱۹۲ کیلوهرتز، دارای فیلتر پاپ سه‌لایه و شاک‌ماونت حرفه‌ای",
        "priceCents": 17900,
        "imageUrl": "https://cdn.dribbble.com/users/776655/screenshots/1122334/media/studio_mic_pro.png"
    },
    {
        "slug": "elevate-aluminum-stand",
        "name": "پایه لپ‌تاپ آلومینیومی Elevate",
        "category": "Workspace",
        "description": "پایه لپ‌تاپ با جنس آلومینیوم سری ۶۰۰۰ و برش لیزری، قابلیت تنظیم ارتفاع در ۷ سطح با مکانیزم فنری بدون پله، وزن تحمل ۱۵ کیلوگرم، مجهز به زیرپایی سیلیکونی با شیارهای خنک‌کننده، جمع‌شونده به ضخامت ۱.۸ سانتی‌متر و وزن ۷۰۰ گرم، ایده‌آل برای میزهای مینیمال",
        "priceCents": 10900,
        "imageUrl": "https://cdn.dribbble.com/users/334455/screenshots/6677889/media/laptop_stand_metal.jpg"
    },
    {
        "slug": "fit-pulse-band",
        "name": "دستبند سلامتی Fit Pulse",
        "category": "Wearable",
        "description": "دستبند هوشمند با سنسور اپتیکال نسل ششم برای اندازه‌گیری دقیق فشار خون، نوار قلب (ECG)، کیفیت خواب و سطح استرس، صفحه نمایش ۱.۴۷ اینچی AMOLED همیشه روشن، ضد آب IP69K، باتری ۱۵ روزه، اعلان‌های هوشمند و قابلیت ردگیری ۲۵ ورزش مختلف، با بند نایلونی نظامی",
        "priceCents": 14900,
        "imageUrl": "https://cdn.dribbble.com/users/224466/screenshots/9988776/media/fitness_band_health.jpg"
    }
];


async function main() {
    const rows = CATALOG.map((p) => ({
        slug: p.slug,
        name: p.name,
        category: p.category,
        description: p.description,
        priceCents: p.priceCents,
        imageUrl: p.imageUrl,
        currency: "usd",
        active: true
    }));

    for (const row of rows) {
        await db
            .insert(products)
            .values(row)
            .onConflictDoUpdate({
                target: products.slug,
                set: {
                    name: row.name,
                    category: row.category,
                    description: row.description,
                    priceCents: row.priceCents,
                    imageUrl: row.imageUrl,
                },
            });
    }

    console.log(`Seed complete (${CATALOG.length} products updated).`);
    await pool.end();


}


main().catch((e) => {
    console.error(e);
    process.exit(1);
})