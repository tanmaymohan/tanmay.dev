import React from 'react';
import {useLocation} from '@docusaurus/router';
import {AnimatePresence, motion} from 'motion/react';

export default function PageTransition({children}) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{opacity: 0, y: 8}}
        animate={{opacity: 1, y: 0}}
        exit={{opacity: 0, y: -8}}
        transition={{duration: 0.18, ease: 'easeOut'}}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

