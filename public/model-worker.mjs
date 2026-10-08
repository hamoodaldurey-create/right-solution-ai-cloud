// Loaded only after the visitor chooses to enable on-device AI.
import {WebWorkerMLCEngineHandler} from 'https://esm.run/@mlc-ai/web-llm@0.2.84';
const handler=new WebWorkerMLCEngineHandler();
self.onmessage=message=>handler.onmessage(message);
