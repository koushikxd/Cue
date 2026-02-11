"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-200 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to app</span>
          </Link>
        </div>

        <motion.h1
          className="text-2xl md:text-3xl font-medium mb-4 text-white"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          Privacy Policy
        </motion.h1>

        <motion.div
          className="space-y-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <section className="mb-8">
            <p className="text-sm text-neutral-400 mb-2">
              Last updated:{" "}
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p className="text-neutral-300 leading-relaxed mt-4">
              Cue is a minimalist AI-powered task manager committed to privacy
              and data security. This privacy policy explains how we handle your
              data when you use our application.
            </p>
          </section>

          <section className="pb-5 border-b border-neutral-800">
            <h2 className="text-lg font-medium mb-4 text-white">Overview</h2>
            <p className="text-neutral-300 leading-relaxed">
              Cue is designed with privacy at its core. By default, all your
              task data is stored locally on your device. When you choose to
              enable optional features like Google Calendar integration,
              specific data is shared as outlined in this policy.
            </p>
          </section>

          <section className="pb-5 border-b border-neutral-800">
            <h2 className="text-lg font-medium mb-4 text-white">
              Data Collection and Storage
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium mb-2 text-white">
                  Local Storage
                </h3>
                <p className="text-neutral-300 leading-relaxed">
                  By default, all your tasks, preferences, and settings are
                  stored locally on your device using IndexedDB. This data never
                  leaves your device unless you explicitly enable cloud
                  features.
                </p>
              </div>

              <div>
                <h3 className="text-base font-medium mb-2 text-white">
                  AI Processing
                </h3>
                <p className="text-neutral-300 leading-relaxed">
                  When using AI features, your task text is temporarily sent to
                  our AI providers (such as Claude, Llama, Grok, or Qwen) to
                  process natural language commands. This data is not stored by
                  the AI providers beyond what is necessary to process your
                  request.
                </p>
              </div>

              <div>
                <h3 className="text-base font-medium mb-2 text-white">
                  Google Calendar Integration
                </h3>
                <p className="text-neutral-300 leading-relaxed">
                  If you enable Google Calendar synchronization, your task data
                  (including title, description, date, time, and priority) will
                  be sent to Google's servers to create and manage calendar
                  events. This integration requires your explicit consent and
                  only occurs when you enable the feature in settings.
                </p>
              </div>
            </div>
          </section>

          <section className="pb-5 border-b border-neutral-800">
            <h2 className="text-lg font-medium mb-4 text-white">
              Data Sharing and Third Parties
            </h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              We don't sell or share your data with third parties for marketing
              or advertising purposes. Any data sharing is limited to services
              that are essential to the functionality you've enabled:
            </p>
            <ul className="space-y-2 text-neutral-300 list-disc pl-5">
              <li>
                <span className="font-medium text-white">Clerk:</span> Used for
                authentication when connecting third-party services like Google
                Calendar.
              </li>
              <li>
                <span className="font-medium text-white">Google:</span> If you
                enable calendar synchronization, task details are shared with
                Google Calendar.
              </li>
              <li>
                <span className="font-medium text-white">AI Providers:</span>{" "}
                Task text for natural language processing when using AI
                features.
              </li>
            </ul>
          </section>

          <section className="pb-5 border-b border-neutral-800">
            <h2 className="text-lg font-medium mb-4 text-white">
              Your Rights and Controls
            </h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              You have complete control over your data in Cue:
            </p>
            <ul className="space-y-2 text-neutral-300 list-disc pl-5">
              <li>All features requiring data sharing are opt-in only.</li>
              <li>You can export your data as JSON at any time.</li>
              <li>
                You can disconnect Google Calendar integration in settings.
              </li>
              <li>
                You can clear all local data from your browser's settings.
              </li>
              <li>
                You can disable AI features in settings to prevent any data from
                being sent for processing.
              </li>
            </ul>
          </section>

          <section className="pb-5 border-b border-neutral-800">
            <h2 className="text-lg font-medium mb-4 text-white">Security</h2>
            <p className="text-neutral-300 leading-relaxed">
              We implement appropriate security measures to protect your data.
              For locally stored data, we rely on your browser's built-in
              security. For any cloud integrations, we use OAuth and other
              industry-standard security protocols to ensure your data is
              protected in transit and at rest.
            </p>
          </section>

          <section className="pb-5 border-b border-neutral-800">
            <h2 className="text-lg font-medium mb-4 text-white">
              Changes to This Policy
            </h2>
            <p className="text-neutral-300 leading-relaxed">
              We may update this privacy policy from time to time. We will
              notify you of any changes by posting the new privacy policy on
              this page and updating the "Last updated" date at the top.
            </p>
          </section>

          <section className="pb-5">
            <h2 className="text-lg font-medium mb-4 text-white">Contact</h2>
            <p className="text-neutral-300 leading-relaxed">
              If you have any questions about this privacy policy or our data
              practices, please contact us at
              <a
                href="mailto:privacy@cuedot.tech"
                className="text-blue-400 hover:text-blue-300 ml-1 transition-colors"
              >
                privacy@cuedot.tech
              </a>
              .
            </p>
          </section>
        </motion.div>

        <footer className="mt-16 text-sm text-neutral-500 text-center">
          <p>© {new Date().getFullYear()} Cue. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
