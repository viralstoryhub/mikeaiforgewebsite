import React, { useMemo } from 'react';
import type { User } from '../../types';

interface UserSignupChartProps {
  users: User[];
}

const UserSignupChart: React.FC<UserSignupChartProps> = ({ users }) => {
  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    const data: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      data.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        count: 0,
      });
    }

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0); // Start of 7 days ago

    users.forEach(user => {
      if (user.createdAt) {
        const signupDate = new Date(user.createdAt);
        if (signupDate >= sevenDaysAgo && signupDate <= today) {
          const dayIndex = 6 - Math.floor((today.getTime() - signupDate.getTime()) / (1000 * 3600 * 24));
          if (dayIndex >= 0 && dayIndex < 7) {
            data[dayIndex].count++;
          }
        }
      }
    });

    return data;
  }, [users]);

  const maxCount = useMemo(() => Math.max(...chartData.map(d => d.count), 1), [chartData]);
  const yAxisLabels = useMemo(() => {
    const labels = new Set<number>();
    for (let i = 0; i <= 5; i++) {
        labels.add(Math.round(maxCount * (i / 5)));
    }
    return Array.from(labels).sort((a,b) => a-b);
  }, [maxCount]);

  return (
    <div className="w-full h-full flex" aria-label="User Signups Chart">
      <div className="flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 pr-2">
        {yAxisLabels.reverse().map(label => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="flex-grow grid grid-cols-7 gap-2 items-end border-l border-b border-gray-200 dark:border-gray-700 pl-2">
        {chartData.map(({ day, count }, index) => (
          <div key={index} className="flex flex-col items-center">
            <div
              className="w-full bg-brand-secondary hover:bg-brand-primary rounded-t-sm transition-all"
              style={{ height: `${(count / maxCount) * 100}%` }}
              title={`${count} signups on ${day}`}
            ></div>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{day}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserSignupChart;
