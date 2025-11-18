import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

const PricingCard = ({ metal, color, currentPrice, minMonthly, onGetStarted }) => {
  const isGold = metal === 'Gold';
  const gradientClass = isGold 
    ? 'from-amber-500 to-yellow-500' 
    : 'from-slate-400 to-slate-600';

  // 1 ounce = 28.3495 grams
  const gramPrice = (currentPrice / 28.3495).toFixed(2);

  const features = [
    'Automatic monthly contributions',
    'Secure vault storage included',
    'Free shipping when ready',
    'Flexible withdrawal options',
    'Real-time price tracking',
    'No hidden fees'
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
      className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 hover:border-amber-300 transition-all overflow-hidden"
    >
      <div className={`bg-gradient-to-r ${gradientClass} p-6 text-white`}>
        <h3 className="text-2xl font-bold mb-2">{metal} Investment</h3>
        <p className="text-sm opacity-90">Current Price: ${currentPrice}/oz (${gramPrice}/gram)</p>
      </div>

      <div className="p-8">
        <div className="mb-6">
          <div className="flex items-baseline mb-2">
            <span className="text-4xl font-bold text-slate-900">${minMonthly}</span>
            <span className="text-slate-600 ml-2">/month minimum</span>
          </div>
          <p className="text-sm text-slate-600">Invest any amount above ${minMonthly}</p>
        </div>

        <ul className="space-y-3 mb-8">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
              <span className="text-slate-700">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          onClick={onGetStarted}
          className={`w-full bg-gradient-to-r ${gradientClass} hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all`}
        >
          Start {metal} Plan
        </Button>
      </div>
    </motion.div>
  );
};

export default PricingCard;