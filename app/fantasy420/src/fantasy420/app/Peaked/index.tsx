import raw_generated from "./generated.json";

const generated: {
  peaked: { url: string; text: string };
  teams: { name: string; players: string[] }[];
} = raw_generated;

export default function Peaked() {
  return <pre>{JSON.stringify(generated, null, 2)}</pre>;
}
