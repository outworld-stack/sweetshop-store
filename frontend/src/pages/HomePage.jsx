import React from 'react';
import { HomeHero } from '../components/HomeHero.jsx';
import { useHomeCatalog } from '../hooks/useHomeCatalog';
import { TrustStripe } from '../components/TrustStripe.jsx';
import { PageError } from '../components/PageError.jsx';
import { CatalogProductCard } from '../components/CatalogProductCard.jsx';

function HomePage() {

    const { categoryFilter, setCategory, categories, products, loadingList, categoryChipsLoading, loadingCategories, error } = useHomeCatalog();

    return (
        <div className='space-y-12'>
            <HomeHero categories={categories} loadingCategories={loadingCategories} />
            <TrustStripe />

            {/* catalog */}
            <section id='catalog' className='scroll-mt-25'>
                <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
                    <div>
                        <h2 className='text-2xl font-samimBold text-base-content md:text-2xl uppercase'>
                            محصولات
                        </h2>
                    </div>

                    <div className='flex flex-wrap gap-2'>
                        <button type='button' className={`btn btn-sm ${!categoryFilter ? "btn-primary" : "btn-ghost border border-base-300"}`} onClick={() => setCategory("")}>
                            All
                        </button>
                        {
                            categoryChipsLoading
                                ? [1, 2, 3, 4].map((i) => (
                                    <div key={i} className='skleton h-8 w-20 rounded-lg' aria-hidden />
                                ))
                                :
                                categories.map((category) => (
                                    <button
                                        key={category}
                                        type='button'
                                        className={`btn btn-sm ${categoryFilter === category ? "btn-primary" : "btn-ghost border border-base-300"}`} onClick={() => setCategory(category)}>
                                        {category}
                                    </button>
                                ))
                        }

                    </div>


                </div>
                {
                    loadingList ? (
                        <ul className='grid gap-6 sm:grid-cols-2 xl:grid-cols-3'>
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <li key={i}>
                                    <div className='skeleton h-96 w-full rounded-box' aria-hidden />
                                </li>
                            ))
                            }
                        </ul>
                    ) : error ? (
                        <PageError message="در حال حاضر بارگذاری محصولات با مشکل مواجه است. بعدا دوباره امتحان کنید." />
                    ) : products.length === 0 ? (
                        <div className='rounded-box border border-base-300 bg-base-100 py-16 text-center text-base-content/60'>
                            محصولی در این دسته وجود ندارد
                        </div>
                    ) : (
                        <ul className='grid gap-6 sm:grid-cols-2 xl:grid-cols-3'>
                            {
                                products.map((product) => (
                                    <li key={product.id}>
                                        <CatalogProductCard product={product} />
                                    </li>
                                ))
                            }
                        </ul>
                    )
                }
            </section>
        </div>
    )
}

export default HomePage;