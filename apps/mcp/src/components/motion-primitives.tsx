"use client";

import type { ReactNode } from "react";
import { motion, MotionConfig } from "motion/react";

const easeOut = [0.16, 1, 0.3, 1] as const;

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export function MotionPage({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}

export function MotionSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function MotionItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 18, filter: "blur(7px)" },
        show: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.55, ease: easeOut },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function MotionCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      variants={{
        hidden: { opacity: 0, y: 16, scale: 0.985 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 0.5, ease: easeOut },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
