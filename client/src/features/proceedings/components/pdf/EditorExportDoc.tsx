import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { TablePdfExport } from "@/components/ui/table-editor";
import type { EditorPage, HFConfig } from "../../types";
import { px2pt } from "../../types";

interface EditorExportDocProps {
  pages: EditorPage[];
  hf: HFConfig;
}

export const EditorExportDoc = ({ pages, hf }: EditorExportDocProps) => (
  <Document>
    {pages.map((pg, pi) => (
      <Page
        key={pg.id}
        size="A4"
        wrap={false}
        style={{
          padding: 0,
          position: "relative",
          minHeight: 842,
          backgroundColor: pg.bgColor || "#ffffff",
        }}
      >
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
                    el.fontFamily === "Inter" || el.fontFamily === "Roboto"
                      ? el.fontFamily
                      : "Inter",
                  fontWeight: el.bold ? "bold" : "normal",
                  fontStyle: el.italic ? "italic" : "normal",
                  color: el.color ?? "#000000",
                  textAlign: (el.align ?? "left") as
                    | "left"
                    | "center"
                    | "right"
                    | "justify",
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
                  objectFit: "contain",
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
              color: "#888",
              textAlign: "center",
              fontFamily: "Helvetica",
            }}
          >
            {hf.headerText}
          </Text>
        )}

        {/* global footer */}
        {(hf.footerText.trim() || hf.showPageNum) && pi > 1 && (
          <View
            style={{
              position: "absolute",
              bottom: 14,
              left: 42,
              right: 42,
              flexDirection: "row",
              justifyContent:
                hf.pageNumPos === "left"
                  ? "flex-start"
                  : hf.pageNumPos === "right"
                    ? "flex-end"
                    : "center",
              borderTopWidth: 0.5,
              borderTopColor: "#ccc",
              paddingTop: 4,
              alignItems: "center",
            }}
          >
            {hf.footerText.trim() && (
              <Text
                style={{
                  fontSize: 8,
                  color: "#888",
                  fontFamily: "Helvetica",
                  flex: 1,
                }}
              >
                {hf.footerText}
              </Text>
            )}
            {hf.showPageNum && (
              <Text
                style={{ fontSize: 8, color: "#888", fontFamily: "Helvetica" }}
              >
                {hf.startFrom + (pi - 2)}
              </Text>
            )}
          </View>
        )}
      </Page>
    ))}
  </Document>
);
