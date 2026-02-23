import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  description?: string;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  description,
  className
}) => {
  return (
    <motion.div 
      className={cn('stat-card group', className)}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {(change || description) && (
            <div className="flex items-center gap-2">
              {change && (
                <span className={cn(
                  'text-sm font-medium',
                  changeType === 'positive' && 'text-success',
                  changeType === 'negative' && 'text-destructive',
                  changeType === 'neutral' && 'text-muted-foreground'
                )}>
                  {change}
                </span>
              )}
              {description && (
                <span className="text-sm text-muted-foreground">{description}</span>
              )}
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-tenant-accent-light flex items-center justify-center group-hover:scale-110 transition-transform">
          <Icon className="w-6 h-6 tenant-accent-text" />
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;
