import Navrbar from './Navrbar'
import Footer from './Footer'

function Layout({children}) {
  return (
    <div className='flex min-h-screen flex-col bg-base-200 text-base-content'>
        <Navrbar/>
        <main className='mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6 md:py-10'>{children}</main>
        <Footer/>
    </div>
  )
}

export default Layout;