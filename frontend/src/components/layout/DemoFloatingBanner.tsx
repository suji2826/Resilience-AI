import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, X, Zap } from 'lucide-react';
import { useDemo, DEMO_STEPS } from '../../hooks/useDemo';

export const DemoFloatingBanner: React.FC = () => {
  const { isDemoActive, currentStep, currentStepIndex, nextStep, prevStep, stopDemo } = useDemo();

  if (!isDemoActive) return null;

  const progressPercent = (currentStepIndex / DEMO_STEPS.length) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 left-4 right-4 lg:left-72 lg:right-8 z-50 bg-slate-900/97 backdrop-blur-xl border border-brand-500/50 rounded-2xl shadow-2xl shadow-brand-500/10 p-4 text-white"
      >
        {/* Progress Line */}
        <div className="w-full bg-slate-800 h-1 rounded-full mb-3 overflow-hidden">
          <motion.div
            style={{ width: `${progressPercent}%` }}
            className="h-full bg-gradient-to-r from-blue-500 to-teal-400 rounded-full"
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            {/* Step title row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                {currentStep.badge}
              </span>
              <h4 className="text-sm font-bold text-slate-100">
                {currentStep.title}
              </h4>
              <span className="text-xs text-slate-500 font-mono shrink-0">
                {currentStepIndex} / {DEMO_STEPS.length}
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              {currentStep.description}
            </p>

            {/* Highlight metric pill */}
            {currentStep.highlightText && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/25 text-teal-300 text-[11px] font-mono font-semibold">
                <Zap className="w-3 h-3 text-teal-400 shrink-0" />
                <span className="truncate">{currentStep.highlightText}</span>
              </div>
            )}
          </div>

          {/* Navigation controls */}
          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            {currentStepIndex > 1 && (
              <button
                onClick={prevStep}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}

            <button
              onClick={nextStep}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-500 hover:to-teal-500 text-white shadow-glow-blue transition-all"
            >
              <span>{currentStep.actionButtonText || (currentStepIndex === DEMO_STEPS.length ? 'Finish Tour' : 'Next Step')}</span>
              {currentStepIndex < DEMO_STEPS.length && <ArrowRight className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={stopDemo}
              aria-label="Exit Demo Tour"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
