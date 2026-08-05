import { Loader } from 'reicon-react';


const PageLoader = () => {
    return(
        <div className="flex h-screen items-center justify-center">
            <Loader className="size-10 animate-spin text-primary"/>
        </div>
    );
};

export default PageLoader;