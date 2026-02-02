import React from 'react';
import * as Icons from './Icons';

const StatCard = ({ icon, label, value, trend, comparison, delay = 0 }) => {
  const IconComponent = Icons[icon];
  const isPositive = trend > 0;
  const isNeutral = Math.abs(trend) < 1;

  const formatValue = (val) => {
    if (typeof val === 'number') {
      if (val >= 1000) {
        return val.toLocaleString();
      }
      return val;
    }
    return val;
  };

  return (
    <div className="stat-card" style={{ '--delay': delay }}>
      <div className="stat-header">
        <div className={`stat-icon ${icon.toLowerCase()}`}>
          {IconComponent && <IconComponent />}
        </div>
        <span className={`stat-trend ${isNeutral ? 'neutral' : isPositive ? 'positive' : 'negative'}`}>
          {isNeutral ? <Icons.Minus /> : isPositive ? <Icons.TrendingUp /> : <Icons.TrendingDown />}
          {isPositive && '+'}{trend}%
        </span>
      </div>
      <div className="stat-body">
        <span className="stat-value">
          {label.includes('Revenue') && '$'}{formatValue(value)}
        </span>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-footer">
        <span className="stat-comparison">{comparison}</span>
      </div>
    </div>
  );
};

export default StatCard;
