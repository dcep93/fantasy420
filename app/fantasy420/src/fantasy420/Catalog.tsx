import { Route, Routes } from "react-router-dom";

function Catalog(props: {
  location: string;
  pages: { [k: string]: () => JSX.Element };
  default: () => JSX.Element;
}) {
  return (
    <Routes>
      <Route path="/" element={<props.default />} />
      {Object.entries(props.pages).map(([k, V]) => (
        <Route key={k} path={`/${k}/*`} element={<V />} />
      ))}
    </Routes>
  );
}

export default Catalog;
