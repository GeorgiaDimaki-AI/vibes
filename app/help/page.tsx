'use client';

import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { HelpCircle, ChevronDown, ChevronUp, Keyboard, Mail } from 'lucide-react';
import { getKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import Link from 'next/link';

const faqs = [
  {
    question: 'What is Zeitgeist?',
    answer:
      'Zeitgeist is your personal cultural advisor that provides contextually-aware advice on topics, behavior, and style for any social situation. It uses a global cultural graph to understand current trends and personalizes recommendations based on your region, interests, and preferences.',
  },
  {
    question: 'How does personalization work?',
    answer:
      'When you complete your profile setup, Zeitgeist learns your region, interests, and conversation style preferences. This allows us to filter and boost vibes that are most relevant to you, ensuring the advice you receive is tailored to your context and preferences.',
  },
  {
    question: 'What are the different tiers?',
    answer:
      'Zeitgeist offers four tiers: Free (5 queries/month), Light ($3/month, 25 queries), Regular ($7/month, 100 queries), and Unlimited ($12/month, unlimited queries). Higher tiers unlock features like regional filtering, interest matching, history tracking, and analytics.',
  },
  {
    question: 'How do I upgrade my tier?',
    answer:
      'You can upgrade your tier by visiting your Profile page and clicking on the tier upgrade button. We support secure payment processing through Stripe.',
  },
  {
    question: 'What are "vibes"?',
    answer:
      'Vibes are cultural trends, topics, or themes that our system tracks in real-time. Each vibe has metadata about its popularity, region, category, and temporal relevance. When you ask for advice, we match relevant vibes to your scenario.',
  },
  {
    question: 'Can I save my favorite advice?',
    answer:
      'Yes! You can save both vibes and advice to your favorites by clicking the heart icon. Access your favorites anytime from the Favorites page in the navigation menu.',
  },
  {
    question: 'How does the rating system work?',
    answer:
      'After receiving advice, you can rate it from 1-5 stars. Your ratings help us improve future recommendations and appear in your analytics dashboard. You can also leave optional feedback.',
  },
  {
    question: 'Is my data private?',
    answer:
      'Yes! We take privacy seriously. Your personal data is encrypted and never sold to third parties. You can export or delete your data at any time from your Profile settings.',
  },
  {
    question: 'How often is the cultural graph updated?',
    answer:
      'The cultural graph is updated hourly through our automated collectors that gather trends from various sources. Older vibes naturally decay over time to keep recommendations current.',
  },
  {
    question: 'Can I use Zeitgeist on mobile?',
    answer:
      'Yes! Zeitgeist is fully responsive and works great on mobile devices. We also support touch gestures and have optimized the interface for smaller screens.',
  },
];

const guides = [
  {
    title: 'Getting Started',
    steps: [
      'Sign up for an account',
      'Complete the onboarding flow to set up your profile',
      'Describe a social situation you need advice for',
      'Review the personalized recommendations',
      'Rate the advice to help improve future recommendations',
    ],
  },
  {
    title: 'Using Favorites',
    steps: [
      'Click the heart icon on any vibe or advice to save it',
      'Navigate to the Favorites page from the menu',
      'Toggle between Vibes and Advice tabs',
      'Use the search bar to find specific favorites',
      'Click the trash icon to remove favorites',
    ],
  },
  {
    title: 'Understanding Your Dashboard',
    steps: [
      'View your monthly usage and remaining queries',
      'Check your average rating and total queries',
      'Explore your top interests and regions',
      'Monitor when your monthly quota resets',
      'Consider upgrading if you approach your limit',
    ],
  },
  {
    title: 'Customizing Your Profile',
    steps: [
      'Go to Profile from the navigation menu',
      'Update your region for better local recommendations',
      'Add or remove interests to refine matching',
      'Choose your preferred conversation style',
      'Toggle email notifications on or off',
    ],
  },
];

export default function HelpPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const shortcuts = getKeyboardShortcuts();

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-black dark:to-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <HelpCircle size={40} className="text-purple-600 dark:text-purple-400" />
              <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
                Help & Documentation
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Everything you need to know about using Zeitgeist
            </p>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <a
              href="#faq"
              className="bg-white dark:bg-gray-800 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-bold text-gray-800 dark:text-white mb-2">FAQ</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Frequently asked questions
              </p>
            </a>
            <a
              href="#guides"
              className="bg-white dark:bg-gray-800 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-bold text-gray-800 dark:text-white mb-2">Guides</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Step-by-step tutorials
              </p>
            </a>
            <a
              href="#shortcuts"
              className="bg-white dark:bg-gray-800 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-bold text-gray-800 dark:text-white mb-2">Shortcuts</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Keyboard shortcuts
              </p>
            </a>
          </div>

          {/* FAQ Section */}
          <section id="faq" className="mb-12">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    aria-expanded={expandedFaq === index}
                    aria-controls={`faq-answer-${index}`}
                  >
                    <span className="font-semibold text-gray-800 dark:text-white">
                      {faq.question}
                    </span>
                    {expandedFaq === index ? (
                      <ChevronUp className="text-purple-600 dark:text-purple-400 flex-shrink-0" size={20} />
                    ) : (
                      <ChevronDown className="text-purple-600 dark:text-purple-400 flex-shrink-0" size={20} />
                    )}
                  </button>
                  {expandedFaq === index && (
                    <div
                      id={`faq-answer-${index}`}
                      className="px-4 pb-4 text-gray-600 dark:text-gray-400"
                    >
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Guides Section */}
          <section id="guides" className="mb-12">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
              How-To Guides
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {guides.map((guide, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
                >
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                    {guide.title}
                  </h3>
                  <ol className="space-y-2">
                    {guide.steps.map((step, stepIndex) => (
                      <li
                        key={stepIndex}
                        className="flex gap-3 text-gray-600 dark:text-gray-400"
                      >
                        <span className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-sm font-semibold">
                          {stepIndex + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section id="shortcuts" className="mb-12">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <Keyboard size={32} className="text-purple-600 dark:text-purple-400" />
              Keyboard Shortcuts
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <span className="text-gray-600 dark:text-gray-400">
                      {shortcut.description}
                    </span>
                    <kbd className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded font-mono text-sm">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Contact Support */}
          <section className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-8 text-center border-2 border-purple-200 dark:border-purple-800">
            <Mail size={48} className="mx-auto text-purple-600 dark:text-purple-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Still need help?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <Link
              href="mailto:support@zeitgeist.app"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
            >
              Contact Support
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
