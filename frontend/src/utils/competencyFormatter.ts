import competencyMapping from '../data/competency_mapping.json';

export const formatCompetencyText = (
  text: string | null | undefined,
  department: string | null | undefined,
  jobRole: string | null | undefined
): string => {
  if (!text) return '';
  
  let formatted = text;

  // 1. Map core competencies
  const coreLabels = competencyMapping.core_labels as Record<string, string>;
  for (const [code, label] of Object.entries(coreLabels)) {
    const regex = new RegExp(code, 'gi');
    formatted = formatted.replace(regex, label);
  }

  // 2. Map department competencies
  if (department) {
    const deptLabels = (competencyMapping.dept_comp_display_labels as any)[department];
    if (deptLabels) {
      for (const [code, label] of Object.entries(deptLabels)) {
        const regex = new RegExp(code, 'gi');
        formatted = formatted.replace(regex, label as string);
      }
    }
  }

  // 3. Map role competencies
  if (jobRole) {
    const roleLabels = (competencyMapping.role_comp_display_labels as any)[jobRole];
    if (roleLabels) {
      for (const [code, label] of Object.entries(roleLabels)) {
        const regex = new RegExp(code, 'gi');
        formatted = formatted.replace(regex, label as string);
      }
    }
  }

  return formatted;
};
