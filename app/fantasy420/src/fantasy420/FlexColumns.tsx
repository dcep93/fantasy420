function FlexColumns(props: { columns: JSX.Element[] }) {
  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        justifyContent: "space-around",
      }}
    >
      {props.columns.map((c, i) => (
        <div key={i} style={{ overflow: "scroll" }}>
          {c}
        </div>
      ))}
    </div>
  );
}

export default FlexColumns;
