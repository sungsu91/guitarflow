export default function BrandHeader({ brand = "RIFFLAB", icon, logo, variant = "v1" }) {
  const wordmark = (
    <div className="riffBrandWordmark" aria-label={brand}>
      <span className="riffBrandWordmark__ri">RI</span>
      <span className="riffBrandWordmark__ff" aria-hidden="true">
        <span>F</span>
        <span>F</span>
      </span>
      <span className="riffBrandWordmark__lab">LAB</span>
    </div>
  );

  if (["plate-v1", "plate-v2", "plate-v3", "plate-v4"].includes(variant)) {
    const isSymbolPlate = variant === "plate-v2" || variant === "plate-v3";
    const isAmpPlate = variant === "plate-v4";

    return (
      <header className={`riffBrandHeader riffBrandHeader--brandPlate riffBrandHeader--${variant}`} aria-label={`${brand} brand plate ${variant.toUpperCase()}`}>
        {isAmpPlate ? (
          <>
            <span className="riffBrandPlateScrew riffBrandPlateScrew--left" aria-hidden="true" />
            <span className="riffBrandPlateScrew riffBrandPlateScrew--right" aria-hidden="true" />
          </>
        ) : null}
        {isSymbolPlate ? <span className="riffBrandIcon riffBrandPlateSymbol" aria-hidden="true">R</span> : null}
        <div className="riffBrandPlateBody">
          {wordmark}
          <span className="riffBrandSlogan">Repeat. Refine. Master.</span>
        </div>
        {variant === "plate-v3" ? <span className="riffBrandPlateTag">TRAINING SYSTEM</span> : null}
      </header>
    );
  }

  if (["v5", "v6", "v7", "v8", "v9"].includes(variant)) {
    return (
      <header className={`riffBrandHeader riffBrandHeader--v2 riffBrandHeader--${variant}`} aria-label={`${brand} brand header ${variant.toUpperCase()}`}>
        {wordmark}
        <span className="riffBrandSlogan">Repeat. Refine. Master.</span>
      </header>
    );
  }

  if (variant === "v10") {
    return (
      <header className="riffBrandHeader riffBrandHeader--v4 riffBrandHeader--v10" aria-label={`${brand} brand header V10`}>
        <span className="riffBrandIcon riffBrandIcon--hybrid" aria-hidden="true">R</span>
        <div className="riffBrandStack">
          {wordmark}
          <span className="riffBrandSlogan">Repeat. Refine. Master.</span>
        </div>
      </header>
    );
  }

  if (variant === "v3") {
    return (
      <header className="riffBrandHeader riffBrandHeader--v3" aria-label={`${brand} brand header V3`}>
        <span className="riffBrandSymbol riffBrandSymbol--abstract" aria-hidden="true">
          <span>R</span>
        </span>
        <div className="riffBrandStack">
          {wordmark}
          <span className="riffBrandSlogan">Repeat. Refine. Master.</span>
        </div>
      </header>
    );
  }

  if (variant === "v4") {
    return (
      <header className="riffBrandHeader riffBrandHeader--v4" aria-label={`${brand} brand header V4`}>
        <span className="riffBrandIcon riffBrandIcon--refined" aria-hidden="true">R</span>
        <div className="riffBrandStack">
          {wordmark}
          <span className="riffBrandSlogan">Repeat. Refine. Master.</span>
        </div>
      </header>
    );
  }

  if (variant === "v2") {
    return (
      <header className="riffBrandHeader riffBrandHeader--v2" aria-label={`${brand} brand header V2`}>
        {wordmark}
        <span className="riffBrandSlogan">Repeat. Refine. Master.</span>
      </header>
    );
  }

  return (
    <header className="riffBrandHeader riffBrandHeader--v1" aria-label={`${brand} brand header V1`}>
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
