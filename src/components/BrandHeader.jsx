export default function BrandHeader({ brand = "RIFFLAB", icon, logo }) {
  return (
    <header className="riffBrandHeader" aria-label={`${brand} 브랜드 헤더`}>
      {logo ? (
        <img className="riffBrandLogo" src={logo} alt={brand} />
      ) : (
        <>
          <span className="riffBrandIcon" aria-hidden="true">
            {icon ? <img src={icon} alt="" /> : "R"}
          </span>
          <strong className="riffBrandName">{brand}</strong>
        </>
      )}
    </header>
  );
}
