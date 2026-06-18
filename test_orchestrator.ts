// test_orchestrator.ts
import { runOrchestratedPipeline } from './src/lib/agents/orchestrator/orchestratorAgent';

async function main() {
  console.log('Running orchestrator pipeline...');
  const res = await runOrchestratedPipeline('manual');
  console.log('Orchestrator Result:', res);
}

main().catch(console.error);
