import React from 'react';
import { Calendar, FilterX } from 'lucide-react';

export interface ReportDateFilterProps {
  dateFrom: string;
  dateTo: string;
  onChange: (dates: { dateFrom: string; dateTo: string }) => void;
  onReset?: () => void;
}

export const ReportDateFilter: React.FC<ReportDateFilterProps> = ({
  dateFrom,
  dateTo,
  onChange,
  onReset,
}) => {
  const formatDateString = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const applyPreset = (days: number | null) => {
    if (days === null) {
      onChange({ dateFrom: '', dateTo: '' });
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    const dateFromStr = formatDateString(start);
    const dateToStr = formatDateString(end);
    onChange({ dateFrom: dateFromStr, dateTo: dateToStr });
  };

  return (
    <div className="report-date-filter-container">
      <div className="report-date-filter-title">
        <Calendar size={18} color="var(--foodshare-green-primary)" />
        <span>Date Range:</span>
      </div>

      <div className="report-date-inputs">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onChange({ dateFrom: e.target.value, dateTo })}
          aria-label="Start Date"
          className="report-date-input"
        />
        <span className="report-date-sep">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onChange({ dateFrom, dateTo: e.target.value })}
          aria-label="End Date"
          className="report-date-input"
        />
      </div>

      <div className="report-date-presets">
        <button
          type="button"
          onClick={() => applyPreset(7)}
          className="btn btn-secondary btn-sm preset-btn"
        >
          7 Days
        </button>
        <button
          type="button"
          onClick={() => applyPreset(30)}
          className="btn btn-secondary btn-sm preset-btn"
        >
          30 Days
        </button>
        <button
          type="button"
          onClick={() => applyPreset(90)}
          className="btn btn-secondary btn-sm preset-btn"
        >
          90 Days
        </button>
        <button
          type="button"
          onClick={() => applyPreset(null)}
          className="btn btn-secondary btn-sm preset-btn"
        >
          All Time
        </button>
        {(dateFrom || dateTo) && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="btn btn-outline btn-sm preset-btn"
            title="Reset Filters"
          >
            <FilterX size={14} style={{ marginRight: '4px' }} />
            Clear
          </button>
        )}
      </div>
    </div>
  );
};
