import { WrappedType } from "../FetchWrapped";
import wrapped2021 from "./2021.json";
import wrapped2022 from "./2022.json";
import wrapped2023 from "./2023.json";
import wrapped2024 from "./2024.json";
import wrapped2025 from "./2025.json";

const allWrapped: { [year: string]: WrappedType } = {
  "2025": wrapped2025,
  "2024": wrapped2024,
  "2023": wrapped2023,
  "2022": wrapped2022,
  "2021": wrapped2021,
};

export default allWrapped;
