// npx ts-node ./exec.ts

import allWrapped from "../Wrapped/allWrapped";
import { generate } from "./search";

console.log(generate, Object.keys(allWrapped));
