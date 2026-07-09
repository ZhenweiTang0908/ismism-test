"use client";

import { motion } from "framer-motion";

type TypewriterProps = {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
};

export function Typewriter({ text, delay = 0, speed = 0.03, className = "" }: TypewriterProps) {
  // Splitting by characters, including spaces
  const characters = text.split("");

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: speed,
            delayChildren: delay,
          },
        },
      }}
      className={className}
    >
      {characters.map((char, index) => (
        <motion.span
          key={index}
          variants={{
            hidden: { opacity: 0, y: 2 },
            visible: { opacity: 1, y: 0 },
          }}
        >
          {char}
        </motion.span>
      ))}
    </motion.div>
  );
}
