import { FFTeamType } from "../../../FetchWrapped";
import { colors } from "../ManagerPlot";

export default function Chart(props: {
  scores: {
    week: number;
    state: string;
    score: number | null;
    owner: FFTeamType | undefined;
  }[];
}) {
  const color = props.scores.map((s) => colors[parseInt(s.owner?.id!)]);
  return <div>chart</div>;
}
