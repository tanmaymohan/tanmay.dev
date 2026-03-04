import React from 'react';
import PageTransition from '../components/PageTransition';

export default function Root({children}) {
  return <PageTransition>{children}</PageTransition>;
}

