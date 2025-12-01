import { StateGraph, START, END } from "@langchain/langgraph";
import { PubMenuAnnotation } from "./types";
import { callTools } from "./nodes/tools";

const builder = new StateGraph(PubMenuAnnotation)
  .addNode("callTools", callTools)
  .addEdge(START, "callTools")
  .addEdge("callTools", END);

export const graph = builder.compile();
graph.name = "Pub Menu Agent";


