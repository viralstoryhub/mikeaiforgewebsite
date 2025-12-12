import React, { Suspense, ComponentType } from 'react';
import * as Skeletons from './Skeletons';

interface LazyLoadProps {
  component: React.LazyExoticComponent<ComponentType<any>>;
  fallback?: React.ReactNode;
  [key: string]: any;
}

const LazyLoad: React.FC<LazyLoadProps> = ({ component: Component, fallback, ...props }) => {
  return (
    <Suspense fallback={fallback || <Skeletons.PageSkeleton />}>
      <Component {...props} />
    </Suspense>
  );
};

export default LazyLoad;
