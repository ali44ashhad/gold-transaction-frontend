import React from 'react';
import { motion } from 'framer-motion';

const AccumulationProgress = ({ subscription }) => {
  const {
    metal,
    accumulated_value,
    target_weight,
    target_unit,
    plan_name
  } = subscription;

  // A mock total needed, since we don't have live prices here
  const MOCK_SPOT_PRICE_OZ_GOLD = 2343.30;
  const MOCK_SPOT_PRICE_OZ_SILVER = 29.55;
  
  let spotPricePerTargetUnit;
  if (metal.toLowerCase() === 'gold') {
    spotPricePerTargetUnit = target_unit === 'g' ? MOCK_SPOT_PRICE_OZ_GOLD / 28.3495 : MOCK_SPOT_PRICE_OZ_GOLD;
  } else {
    spotPricePerTargetUnit = target_unit === 'g' ? MOCK_SPOT_PRICE_OZ_SILVER / 28.3495 : MOCK_SPOT_PRICE_OZ_SILVER;
  }

  const targetValue = (target_weight || 0) * spotPricePerTargetUnit * 1.26;
  const progress = targetValue > 0 ? ((accumulated_value || 0) / targetValue) * 100 : 0;
  
  const accumulatedValue = accumulated_value || 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white p-4 rounded-xl shadow-sm border border-slate-200"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-slate-800">{plan_name} ({target_weight}{target_unit})</span>
        <span className="text-sm font-bold text-slate-600">${accumulatedValue.toFixed(2)} / ${targetValue.toFixed(2)}</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2.5">
        <motion.div
          className={`h-2.5 rounded-full ${metal.toLowerCase() === 'gold' ? 'bg-amber-500' : 'bg-slate-500'}`}
          style={{ width: `${progress}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-2 text-right">{progress.toFixed(1)}% complete</p>
    </motion.div>
  );
};

export default AccumulationProgress;