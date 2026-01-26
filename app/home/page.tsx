"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Github, Sparkles, Zap, Shield, Brain } from "lucide-react";

export default function HomePage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.25, 0, 1],
      },
    },
  };

  const features = [
    {
      icon: <Brain className="w-6 h-6" />,
      title: "AI-Powered Intelligence",
      description:
        "Natural language processing that understands your tasks intuitively",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Privacy-First",
      description:
        "Local storage with IndexedDB keeps your data secure and private",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Lightning Fast",
      description: "PWA with offline support for instant access anywhere",
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Smart Automation",
      description:
        "Create, edit, schedule, and prioritize tasks with natural commands",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-200">
      {/* Hero Section */}
      <motion.main
        className="relative overflow-hidden"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Header */}
          <motion.div className="text-center mb-16" variants={itemVariants}>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-4">
              Cue
            </h1>
            <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto">
              A minimalist AI-powered task manager that intuitively processes
              natural language to organize your day
            </p>
          </motion.div>

          {/* App Screenshot - Main Focus */}
          <motion.div className="relative mb-12" variants={itemVariants}>
            <div className="relative max-w-5xl mx-auto">
              <Image
                src="/hero.png"
                alt="Cue - AI Task Manager Interface"
                width={1200}
                height={800}
                className="w-full h-auto rounded-lg shadow-2xl border-2 border-neutral-700/80 bg-neutral-800/20"
                priority
              />
              {/* Subtle overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/20 via-transparent to-transparent rounded-lg pointer-events-none" />
            </div>
          </motion.div>

          {/* Simple CTA */}
          <motion.div className="text-center" variants={itemVariants}>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-neutral-900 rounded-lg font-medium hover:bg-neutral-100 transition-all duration-200"
            >
              Try Cue Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </motion.main>

      {/* Features Section */}
      <motion.section
        className="py-24 px-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-16" variants={itemVariants}>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Why Choose Cue?
            </h2>
            <p className="text-xl text-neutral-400 max-w-3xl mx-auto leading-relaxed">
              Simply type what you need, and let AI handle the rest. Cue
              transforms natural language into organized, actionable tasks.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700/50 rounded-xl p-8 hover:bg-neutral-800/70 transition-all duration-300 hover:border-neutral-600/50"
                variants={itemVariants}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-14 h-14 bg-white/10 rounded-lg flex items-center justify-center text-white">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* AI Capabilities Section */}
      <motion.section
        className="py-24 px-6 bg-neutral-800/30"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div variants={itemVariants}>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
              AI That Understands You
            </h2>
            <p className="text-xl text-neutral-400 mb-12 leading-relaxed">
              Cue's advanced AI processes natural language commands for seamless
              task management
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 gap-6 text-left"
            variants={itemVariants}
          >
            <div className="space-y-4">
              <div className="bg-neutral-800/50 rounded-lg p-6 border border-neutral-700/50 h-28 flex flex-col">
                <h4 className="text-white font-semibold mb-3 text-base leading-tight">
                  Smart Creation
                </h4>
                <p className="text-neutral-400 text-sm leading-relaxed flex-1 flex items-center">
                  "Add team meeting tomorrow at 3pm with high priority"
                </p>
              </div>
              <div className="bg-neutral-800/50 rounded-lg p-6 border border-neutral-700/50 h-28 flex flex-col">
                <h4 className="text-white font-semibold mb-3 text-base leading-tight">
                  Quick Actions
                </h4>
                <p className="text-neutral-400 text-sm leading-relaxed flex-1 flex items-center">
                  "Mark gym session as complete"
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-neutral-800/50 rounded-lg p-6 border border-neutral-700/50 h-28 flex flex-col">
                <h4 className="text-white font-semibold mb-3 text-base leading-tight">
                  Smart Editing
                </h4>
                <p className="text-neutral-400 text-sm leading-relaxed flex-1 flex items-center">
                  "Move my dentist appointment to Friday at 2pm"
                </p>
              </div>
              <div className="bg-neutral-800/50 rounded-lg p-6 border border-neutral-700/50 h-28 flex flex-col">
                <h4 className="text-white font-semibold mb-3 text-base leading-tight">
                  Bulk Processing
                </h4>
                <p className="text-neutral-400 text-sm leading-relaxed flex-1 flex items-center">
                  "Add buy groceries today and schedule dentist for next week"
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-neutral-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <p className="text-neutral-500 text-sm">
                © {new Date().getFullYear()} Cue. All rights reserved.
              </p>
            </div>

            <div className="flex items-center gap-6">
              <Link
                href="/privacy-policy"
                className="text-neutral-400 text-sm hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>

              <span className="text-neutral-600">•</span>

              <Link
                href="https://github.com/koushikxd/cue"
                className="flex items-center gap-2 text-neutral-400 text-sm hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="w-4 h-4" />
                GitHub
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
