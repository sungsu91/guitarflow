export default function BrandHeader({ brand = "RIFFLAB", icon, logo, variant = "v1" }) {
  const splitWordmark = (
    <div className="riffBrandWordmark" aria-label={brand}>
      <span className="riffBrandWordmark__ri">RI</span>
      <span className="riffBrandWordmark__ff" aria-hidden="true">
        <span>F</span>
        <span>F</span>
      </span>
      <span className="riffBrandWordmark__lab">LAB</span>
    </div>
  );

  const logoLabVariants = [
    "v11",
    ...Array.from({ length: 200 }, (_, index) => `v11-${String(index + 1).padStart(3, "0")}`),
  ];
  const logoLabVariantNumber = Number(variant.replace("v", ""));
  const derivativeLogoLabMatch = variant.match(/^v11-(\d{3})$/);
  const isNumberedLogoLabVariant = Number.isInteger(logoLabVariantNumber) && logoLabVariantNumber >= 1 && logoLabVariantNumber <= 50;
  const isDerivedLogoLabVariant = Boolean(derivativeLogoLabMatch);
  const v11DerivativeIndex = variant.startsWith("v11-") ? Number(variant.split("-")[1]) || 0 : 0;
  const v11FamilyIndex = v11DerivativeIndex > 0 ? (v11DerivativeIndex - 1) % 20 : -1;
  const v11TreatmentIndex = v11DerivativeIndex > 0
    ? Math.floor((v11DerivativeIndex - 1) / 20) * 5 + ((v11DerivativeIndex - 1) % 5)
    : -1;
  const v11DerivativeClass = v11DerivativeIndex > 0
    ? `riffBrandHeader--v11-family-${v11FamilyIndex} riffBrandHeader--v11-treatment-${v11TreatmentIndex}`
    : "";
  const v11VariantStyle = v11DerivativeIndex > 0
    ? {
        "--v11-pad-x": `${20 + (v11TreatmentIndex % 4) * 2}px`,
        "--v11-pad-y": `${11 + (v11TreatmentIndex % 3)}px`,
        "--v11-font-size": `${25 + (v11FamilyIndex % 3)}px`,
        "--v11-letter": `${0.12 + (v11TreatmentIndex % 4) * 0.018}em`,
        "--v11-slogan-letter": `${0.2 + (v11TreatmentIndex % 5) * 0.018}em`,
        "--v11-border-alpha": `${0.16 + (v11TreatmentIndex % 5) * 0.018}`,
        "--v11-frame-alpha": `${0.08 + (v11TreatmentIndex % 4) * 0.018}`,
        "--v11-point-alpha": `${0.12 + (v11TreatmentIndex % 5) * 0.018}`,
        "--v11-line-alpha": `${0.26 + (v11TreatmentIndex % 5) * 0.036}`,
        "--v11-body-alpha": `${0.022 + (v11TreatmentIndex % 4) * 0.01}`,
        "--v11-sheen-x": `${18 + (v11FamilyIndex % 5) * 16}%`,
        "--v11-depth-alpha": `${0.14 + (v11FamilyIndex % 6) * 0.018}`,
      }
    : undefined;

  if (logoLabVariants.includes(variant)) {
    return (
      <header className={`riffBrandHeader riffBrandHeader--logoLab riffBrandHeader--${variant} ${v11DerivativeClass}`} style={v11VariantStyle} aria-label={`${brand} logo lab ${variant.toUpperCase()}`}>
        <span className="riffBrandPlateScrew riffBrandPlateScrew--left" aria-hidden="true" />
        <span className="riffBrandPlateScrew riffBrandPlateScrew--right" aria-hidden="true" />
        {v11DerivativeIndex > 0 ? <span className="riffBrandDerivativeLight riffBrandDerivativeLight--left" aria-hidden="true" /> : null}
        {v11DerivativeIndex > 0 ? <span className="riffBrandDerivativeLight riffBrandDerivativeLight--right" aria-hidden="true" /> : null}
        {v11DerivativeIndex > 0 ? <span className="riffBrandDerivativeRail" aria-hidden="true" /> : null}
        {variant === "v5" || variant === "v19" || variant === "v36" || variant === "v46" ? <span className="riffBrandLogoWave" aria-hidden="true" /> : null}
        {variant === "v6" || variant === "v12" || variant === "v40" ? <span className="riffBrandLogoBox" aria-hidden="true">R</span> : null}
        {variant === "v15" || variant === "v31" || variant === "v32" || variant === "v43" ? <span className="riffBrandDataGrid" aria-hidden="true" /> : null}
        {variant === "v16" || variant === "v23" || variant === "v34" || variant === "v44" ? <span className="riffBrandLaserLine" aria-hidden="true" /> : null}
        <div className="riffBrandLogoBody">
          {variant === "v7" || variant === "v9" || variant === "v20" ? <span className="riffBrandBrushR" aria-hidden="true">R</span> : null}
          {[5, 10, 15].includes(v11FamilyIndex) ? <span className="riffBrandMiniSymbol" aria-hidden="true">R</span> : null}
          {isNumberedLogoLabVariant || isDerivedLogoLabVariant ? (
            <div className="riffBrandLogoText" aria-label={brand}>
              <span>R</span>
              <span>I</span>
              <span>F</span>
              <span>F</span>
              <span>L</span>
              <span>A</span>
              <span>B</span>
            </div>
          ) : null}
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
          {splitWordmark}
          <span className="riffBrandSlogan">Repeat. Refine. Master.</span>
        </div>
      </header>
    );
  }

  if (variant === "v2") {
    return (
      <header className="riffBrandHeader riffBrandHeader--v2" aria-label={`${brand} brand header V2`}>
        {splitWordmark}
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
