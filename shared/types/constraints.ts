export type ConstraintType =
  | 'length'
  | 'coincident'
  | 'horizontal'
  | 'vertical'
  | 'perpendicular'
  | 'parallel';

export interface Constraint {
  id: string;
  type: ConstraintType;
  sketch_id: string;
  element_ids: string[];
  point_indices?: number[];  // For coincident: 0=start, 1=end
  value?: number;            // For length constraints (mm)
  satisfied: boolean;
  inferred?: boolean;
  confirmed?: boolean;
}

export interface SolveResult {
  success: boolean;
  updated_elements?: Array<{
    element_id: string;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    center_x?: number;
    center_y?: number;
  }>;
  error?: {
    type: 'over_constrained' | 'conflicting' | 'unsolvable';
    conflicting_constraints: string[];
    message: string;
  };
}

export interface ConstraintVisualizationData {
  constraint_id: string;
  constraint_type: ConstraintType;
  sketch_id: string;
  element_ids: string[];
  satisfied: boolean;
  icon_position_3d: [number, number, number];
}
