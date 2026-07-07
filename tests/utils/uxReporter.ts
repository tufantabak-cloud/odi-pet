import * as fs from 'fs';
import * as path from 'path';
import { Persona } from './personas';

export interface ModuleResult {
  module: string;
  outcome: 'completed_unaided' | 'failed' | 'abandoned' | 'skipped';
  duration_seconds: number;
  status: 'pass' | 'stuck_candidate' | 'stuck_confirmed' | 'missing_selector' | 'technical_error';
  stuck_screen: string;
  selector_used: string;
  error_message: string;
  screenshot_path: string;
  notes: string;
}

export interface PersonaReport {
  session_id: string;
  persona: {
    name: string;
    age: number;
    device: string;
    tech_level: string;
  };
  environment: {
    base_url: string;
    is_production: boolean;
    viewport: string;
    browser: string;
  };
  results: ModuleResult[];
  overall_result: 'pass' | 'partial' | 'fail';
  ux_lead_note: string;
}

export class UXReporter {
  private reports: PersonaReport[] = [];

  addReport(report: PersonaReport) {
    this.reports.push(report);
  }

  saveReport(filePath: string, isProduction: boolean) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const total = this.reports.length;
    let passed = 0;
    let partial = 0;
    let failed = 0;

    const moduleStats: Record<string, { completed: number; totalDuration: number; count: number; failedCount: number }> = {};

    const missingSelectorsSet = new Set<string>();
    const blockerIssues: string[] = [];
    const majorIssues: string[] = [];
    const minorIssues: string[] = [];

    for (const rep of this.reports) {
      if (rep.overall_result === 'pass') passed++;
      else if (rep.overall_result === 'partial') partial++;
      else failed++;

      for (const res of rep.results) {
        if (!moduleStats[res.module]) {
          moduleStats[res.module] = { completed: 0, totalDuration: 0, count: 0, failedCount: 0 };
        }
        moduleStats[res.module].count++;
        moduleStats[res.module].totalDuration += res.duration_seconds;

        if (res.outcome === 'completed_unaided') {
          moduleStats[res.module].completed++;
        } else {
          moduleStats[res.module].failedCount++;
          if (res.status === 'stuck_confirmed') {
            blockerIssues.push(`${rep.persona.name} got stuck at ${res.module} (${res.stuck_screen})`);
          } else if (res.status === 'technical_error') {
            majorIssues.push(`${res.module} threw a technical error: ${res.error_message}`);
          } else if (res.status === 'missing_selector') {
            missingSelectorsSet.add(res.selector_used);
            minorIssues.push(`Missing selector: ${res.selector_used}`);
          }
        }
      }
    }

    let mostFailedModule = '';
    let maxFailed = -1;
    let slowestModule = '';
    let maxAvgDuration = -1;

    for (const [mod, stat] of Object.entries(moduleStats)) {
      if (stat.failedCount > maxFailed) {
        maxFailed = stat.failedCount;
        mostFailedModule = mod;
      }
      const avg = stat.count > 0 ? stat.totalDuration / stat.count : 0;
      if (avg > maxAvgDuration) {
        maxAvgDuration = avg;
        slowestModule = mod;
      }
    }

    const recommendedActions: string[] = [];
    if (mostFailedModule) {
      recommendedActions.push(`Fix issues in the ${mostFailedModule} module since it had the highest failure rate.`);
    }
    if (missingSelectorsSet.size > 0) {
      recommendedActions.push(`Inject missing data-testid attributes for: ${Array.from(missingSelectorsSet).join(', ')}`);
    }

    const finalReport = {
      reports: this.reports,
      summary: {
        total_personas: total,
        passed_personas: passed,
        partial_personas: partial,
        failed_personas: failed,
        most_failed_module: mostFailedModule,
        slowest_module: slowestModule,
        missing_selectors: Array.from(missingSelectorsSet),
        blocker_issues: blockerIssues,
        major_issues: majorIssues,
        minor_issues: minorIssues,
        recommended_actions: recommendedActions
      },
      cleanup_skipped: true,
      cleanup_reason: isProduction ? "Production ve yazma testi engellendiğinden cleanup atlandı." : "Admin cleanup yetkisi bulunamadı."
    };

    fs.writeFileSync(filePath, JSON.stringify(finalReport, null, 2), 'utf-8');
  }
}
