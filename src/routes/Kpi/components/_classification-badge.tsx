import React from 'react';
import { getClassificationBadgeClass, translateClassification } from '../kpi-utils';

interface ClassificationBadgeProps {
  classification: string;
}

export const ClassificationBadge = React.memo(function ClassificationBadge({
  classification,
}: ClassificationBadgeProps) {
  return (
    <span
      className={`inline-block text-sm font-bold px-2.5 py-1 rounded-lg border ${getClassificationBadgeClass(classification)}`}
    >
      {translateClassification(classification)}
    </span>
  );
});
