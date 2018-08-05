import { BuildDefinition } from "./models";

export interface ICheckForChanges {
  (buildDef: BuildDefinition): boolean;
}