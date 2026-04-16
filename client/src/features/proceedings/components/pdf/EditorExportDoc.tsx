import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { TablePdfExport } from "@/components/ui/table-editor";
import type { EditorPage, HFConfig } from "../../types";
import { px2pt } from "../../types";

interface EditorExportDocProps {
  pages: EditorPage[];
  hf: HFConfig;
  conferenceName?: string;
}

export const EditorExportDoc = ({
  pages,
  hf,
  conferenceName = "",
}: EditorExportDocProps) => {
  const nameLen = conferenceName.length;
  const nameFontSize = nameLen > 80 ? 6.5 : nameLen > 55 ? 7 : 8;

  return (
    <Document>
      {pages.map((pg, pi) => {
        // react-pdf doesn't support CSS gradients in backgroundColor.
        // For gradient pages: render to canvas dataURL and inject as full-page Image.
        const bgStr = pg.bgColor || "#ffffff";
        const isGradient = bgStr.includes("gradient");
        let gradientDataUrl: string | null = null;
        if (isGradient) {
          try {
            const W = 595,
              H = 842;
            const c = document.createElement("canvas");
            c.width = W;
            c.height = H;
            const ctx = c.getContext("2d")!;
            const stopColors: string[] = [];
            const hexPat = /#[0-9a-fA-F]{3,8}\b/g;
            const rgbPat = /rgba?\([^)]+\)/g;
            let m: RegExpExecArray | null;
            while ((m = hexPat.exec(bgStr)) !== null) stopColors.push(m[0]);
            while ((m = rgbPat.exec(bgStr)) !== null) stopColors.push(m[0]);
            if (stopColors.length >= 2) {
              const isRadial = bgStr.includes("radial-gradient");
              let grad: CanvasGradient;
              if (isRadial) {
                grad = ctx.createRadialGradient(
                  W / 2,
                  H * 0.3,
                  0,
                  W / 2,
                  H / 2,
                  Math.max(W, H),
                );
              } else {
                const angleMatch = bgStr.match(
                  /linear-gradient\(\s*(-?\d+)deg/,
                );
                const deg = angleMatch ? parseInt(angleMatch[1]) : 135;
                const rad = ((deg - 90) * Math.PI) / 180;
                const r = Math.sqrt(W * W + H * H) / 2;
                grad = ctx.createLinearGradient(
                  W / 2 - Math.cos(rad) * r,
                  H / 2 - Math.sin(rad) * r,
                  W / 2 + Math.cos(rad) * r,
                  H / 2 + Math.sin(rad) * r,
                );
              }
              stopColors.forEach((color, i) =>
                grad.addColorStop(i / (stopColors.length - 1), color),
              );
              ctx.fillStyle = grad;
            } else {
              ctx.fillStyle = stopColors[0] || "#667eea";
            }
            ctx.fillRect(0, 0, W, H);
            gradientDataUrl = c.toDataURL("image/jpeg", 0.92);
          } catch {
            /* ignore */
          }
        }
        return (
          <Page
            key={pg.id}
            size="A4"
            wrap={false}
            style={{
              padding: 0,
              position: "relative",
              minHeight: 842,
              backgroundColor: isGradient ? "#ffffff" : bgStr,
            }}
          >
            {isGradient && gradientDataUrl && (
              <Image
                src={gradientDataUrl}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: 595,
                  height: 842,
                }}
              />
            )}
            {/* overlay elements */}
            {[...pg.els]
              .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
              .map((el) =>
                el.type === "table" && el.tableData ? (
                  <TablePdfExport
                    key={el.id}
                    tableData={el.tableData}
                    elX={el.x}
                    elY={el.y}
                    elW={el.w}
                    elH={el.h}
                    px2pt={px2pt}
                  />
                ) : el.type === "bar" ? (
                  <View
                    key={el.id}
                    style={{
                      position: "absolute",
                      left: px2pt(el.x, "x"),
                      top: px2pt(el.y, "y"),
                      width: px2pt(el.w, "x"),
                      height: px2pt(el.h, "y"),
                      backgroundColor: el.barColor ?? "#93c5fd",
                    }}
                  />
                ) : el.type === "text" ? (
                  <Text
                    key={el.id}
                    style={{
                      position: "absolute",
                      left: px2pt(el.x, "x"),
                      top: px2pt(el.y, "y"),
                      width: px2pt(el.w, "x"),
                      fontSize: px2pt(el.fontSize ?? 12, "y"),
                      fontFamily:
                        el.fontFamily === "Inter" ||
                        el.fontFamily === "Roboto"
                          ? el.fontFamily
                          : "Inter",
                      fontWeight: el.bold ? "bold" : "normal",
                      fontStyle: el.italic ? "italic" : "normal",
                      color: el.color ?? "#000000",
                      textAlign: (el.align ?? "left") as any,
                      ...(el.rotation
                        ? { transform: `rotate(${el.rotation}deg)` }
                        : {}),
                    }}
                  >
                    {el.text ?? ""}
                  </Text>
                ) : el.type === "image" && el.src ? (
                  <Image
                    key={el.id}
                    src={el.src}
                    style={{
                      position: "absolute",
                      left: px2pt(el.x, "x"),
                      top: px2pt(el.y, "y"),
                      width: px2pt(el.w, "x"),
                      height: px2pt(el.h, "y"),
                      // Background images (zIndex=1, full page): fill to cover page
                      // Normal images (logos, photos, etc.): contain to preserve aspect ratio
                      objectFit:
                        el.zIndex === 1 && el.x === 0 && el.y === 0
                          ? "fill"
                          : "contain",
                      ...(el.rotation
                        ? { transform: `rotate(${el.rotation}deg)` }
                        : {}),
                    }}
                  />
                ) : null,
              )}

            {/* global header */}
            {hf.headerText.trim() && pi > 1 && (
              <Text
                style={{
                  position: "absolute",
                  top: 14,
                  left: 42,
                  right: 42,
                  fontSize: 8,
                  color: "#1a3a6b",
                  textAlign: "center",
                  fontFamily: "Helvetica-Bold",
                }}
              >
                {hf.headerText}
              </Text>
            )}
            {/* global footer: conferenceName above line, footerText+pageNum below */}
            {pi > 1 && (
              <View
                style={{
                  position: "absolute",
                  bottom: 22,
                  left: 42,
                  right: 42,
                }}
              >
                {conferenceName ? (
                  <Text
                    style={{
                      fontSize: nameFontSize,
                      color: "#1a3a6b",
                      fontFamily: "Helvetica",
                      marginBottom: 4,
                    }}
                  >
                    {conferenceName}
                  </Text>
                ) : null}
                <View
                  style={{
                    height: 0.75,
                    backgroundColor: "#1a3a6b",
                    marginBottom: 4,
                  }}
                />
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  {hf.footerText.trim() ? (
                    <Text
                      style={{
                        fontSize: 8,
                        color: "#1a3a6b",
                        fontFamily: "Helvetica",
                        flex: 1,
                      }}
                    >
                      {hf.footerText}
                    </Text>
                  ) : (
                    <Text
                      style={{
                        fontSize: 8,
                        color: "#1a3a6b",
                        fontFamily: "Helvetica",
                        flex: 1,
                      }}
                    >
                      {" "}
                    </Text>
                  )}
                  {hf.showPageNum && (
                    <Text
                      style={{
                        fontSize: 10,
                        color: "#1a3a6b",
                        fontFamily: "Helvetica-Bold",
                      }}
                    >
                      {hf.startFrom + (pi - 2)}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </Page>
        );
      })}
    </Document>
  );
};
