import { Annotation } from "@langchain/langgraph";
import { GenerativeUIAnnotation } from "../types";

export const PubMenuAnnotation = Annotation.Root({
  messages: GenerativeUIAnnotation.spec.messages,
  ui: GenerativeUIAnnotation.spec.ui,
  timestamp: GenerativeUIAnnotation.spec.timestamp,
});

export type PubMenuState = typeof PubMenuAnnotation.State;
export type PubMenuUpdate = typeof PubMenuAnnotation.Update;


