import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Admin action on an employee's active break. `forceResume` (default
 * true) is the fully-specified "Force Resume" behavior — ends the
 * break and notifies the employee. `forceResume: false` is a quiet
 * correction (audit-logged the same way, no notification).
 */
export class EndBreakDto {
  @IsOptional()
  @IsBoolean()
  forceResume?: boolean;
}
