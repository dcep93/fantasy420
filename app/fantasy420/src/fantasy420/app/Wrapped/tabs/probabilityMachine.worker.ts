import { calculateProbabilities, type ProbabilitySeason } from "./probabilityEngine";

self.onmessage = (event: MessageEvent<ProbabilitySeason>) => {
  try { self.postMessage({ result: calculateProbabilities(event.data) }); }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : String(error) }); }
};
