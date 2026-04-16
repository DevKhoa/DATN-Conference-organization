import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { pdfStyles } from "./pdf-styles";
import type { ProceedingsData, KeynoteSpeaker } from "../../types";

interface ProceedingsDocumentProps {
  data: ProceedingsData;
}

export const ProceedingsDocument = ({ data }: ProceedingsDocumentProps) => {
  // Group committee by role
  const committeeByRole: Record<string, typeof data.committee> = {};
  (data.committee || []).forEach((m) => {
    if (!committeeByRole[m.role]) committeeByRole[m.role] = [];
    committeeByRole[m.role].push(m);
  });

  // Group summary schedule by date
  const scheduleByDate: Record<string, typeof data.summarySchedule> = {};
  (data.summarySchedule || []).forEach((s) => {
    const key = s.date || "Unscheduled";
    if (!scheduleByDate[key]) scheduleByDate[key] = [];
    scheduleByDate[key].push(s);
  });

  const tocItems = [
    { label: "Foreword", page: 1 },
    { label: "Organizing Committee", page: 2 },
    { label: "General Information", page: 3 },
    { label: "Program at a Glance", page: 4 },
    ...(data.keynotes?.length > 0
      ? [{ label: "Keynote Speakers", page: 5 }]
      : []),
    {
      label: "Detailed Program with Abstracts",
      page: data.keynotes?.length > 0 ? 6 : 5,
    },
  ];

  const formatAbstract = (text?: string) => {
    if (!text) return "";
    return text.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  };

  return (
    <Document>
      {/* ── COVER ── */}
      <Page size="A4" style={pdfStyles.coverPage}>
        <Text style={pdfStyles.coverTag}>Program Book</Text>
        <View style={pdfStyles.coverDivider} />
        <Text style={pdfStyles.coverTitle}>
          {data.cover.title || "CONFERENCE PROCEEDINGS"}
        </Text>
        <Text style={pdfStyles.coverSubtitle}>{data.cover.conferenceName}</Text>
        <Text style={pdfStyles.coverDateLoc}>
          {data.cover.date} · {data.cover.location}
        </Text>

        {data.cover.sponsorLogos?.length > 0
          ? (() => {
              const count = data.cover.sponsorLogos.length;
              const logoW = Math.min(
                80,
                Math.floor((475 - (count - 1) * 10) / count),
              );
              const logoH = Math.round(logoW * 0.75);
              return (
                <>
                  <Text style={pdfStyles.coverSponsorLabel}>
                    Sponsors & Partners
                  </Text>
                  <View style={pdfStyles.coverLogos}>
                    {data.cover.sponsorLogos.map((logo: string, i: number) => (
                      <Image
                        key={i}
                        src={logo}
                        style={{
                          width: logoW,
                          height: logoH,
                          objectFit: "contain",
                          marginRight: i < count - 1 ? 10 : 0,
                        }}
                      />
                    ))}
                  </View>
                </>
              );
            })()
          : null}
      </Page>

      {/* ── TABLE OF CONTENTS ── */}
      <Page size="A4" style={{ ...pdfStyles.page, position: "relative" }}>
        {(() => {
          const cn = data.cover.conferenceName || "CONFERENCE";
          const len = cn.length;
          const fs = Math.max(
            16,
            Math.min(140, 800 / (Math.max(1, len) * 0.65)),
          );
          const tw = 800;
          const lft = Math.round(40 - tw / 2);
          const lineH = Math.round(Math.max(1, fs) * 1.4);
          const tp = Math.round(421 - lineH / 2);
          return (
            <Text
              style={{
                position: "absolute",
                left: lft,
                top: tp,
                width: tw,
                fontSize: fs,
                fontFamily: "Helvetica-Bold",
                color: "#3b6cb5",
                letterSpacing: Math.max(1, Math.round(fs * 0.05)),
                opacity: 0.8,
                textAlign: "center",
                transform: "rotate(-90deg)",
              }}
            >
              {cn}
            </Text>
          );
        })()}

        <Text style={pdfStyles.tocTitle}>TABLE OF CONTENT</Text>

        <View style={{ paddingLeft: 120, paddingTop: 15 }}>
          {tocItems.map((item, i) => (
            <View key={i} style={pdfStyles.tocEntryRow}>
              <Text style={pdfStyles.tocPageNum}>{item.page}</Text>
              <Text style={pdfStyles.tocLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </Page>

      {/* ── FOREWORD ── */}
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.sectionTitle}>Foreword</Text>
        <View style={pdfStyles.sectionDivider} />
        {data.foreword ? (
          data.foreword
            .split("\n")
            .filter((p: string) => p.trim())
            .map((p: string, i: number) => (
              <Text
                key={i}
                style={{
                  marginBottom: 10,
                  textAlign: "justify",
                  fontSize: 10,
                  lineHeight: 1.7,
                  color: "#2d3748",
                }}
              >
                {p.trim()}
              </Text>
            ))
        ) : (
          <Text
            style={{
              color: "#718096",
              fontFamily: "Inter",
              fontStyle: "italic",
            }}
          >
            No foreword provided.
          </Text>
        )}
        <View style={pdfStyles.footerContainer} fixed>
          <Text style={pdfStyles.footerTitle}>
            {data.cover.conferenceName}{" "}
          </Text>
          <Text
            style={pdfStyles.pageNumber}
            render={({ pageNumber }) => `${pageNumber}`}
          />
        </View>
      </Page>

      {/* ── ORGANIZING COMMITTEE ── */}
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.sectionTitle}>Organizing Committee</Text>
        <View style={pdfStyles.sectionDivider} />
        {Object.keys(committeeByRole).length === 0 ? (
          <Text
            style={{
              color: "#718096",
              fontFamily: "Inter",
              fontStyle: "italic",
            }}
          >
            No committee members added.
          </Text>
        ) : (
          Object.entries(committeeByRole).map(([role, members], i) => (
            <View key={i}>
              <Text style={pdfStyles.roleHeader}>{role}</Text>
              {members.map((m, j) => (
                <Text key={j} style={pdfStyles.memberLine}>
                  {m.name}
                  {m.affiliation ? `, ${m.affiliation}` : ""}
                </Text>
              ))}
            </View>
          ))
        )}
        <View style={pdfStyles.footerContainer} fixed>
          <Text style={pdfStyles.footerTitle}>
            {data.cover.conferenceName}{" "}
          </Text>
          <Text
            style={pdfStyles.pageNumber}
            render={({ pageNumber }) => `${pageNumber}`}
          />
        </View>
      </Page>

      {/* ── CONFERENCE INFORMATION ── */}
      <Page size="A4" style={pdfStyles.page}>
        {(() => {
          const infoTitle = data.cover.conferenceName
            ? `${data.cover.conferenceName.toUpperCase()} INFORMATION`
            : "CONFERENCE INFORMATION";
          const titleFontSize = Math.max(
            14,
            Math.min(24, Math.floor(475 / (infoTitle.length * 0.6))),
          );
          return (
            <Text
              style={{
                fontSize: titleFontSize,
                fontFamily: "Helvetica-Bold",
                color: "#2a4365",
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              {infoTitle}
            </Text>
          );
        })()}

        {(() => {
          const renderInf = (label: string, text?: string) => {
            if (!text?.trim()) return null;
            return (
              <View wrap={false} style={{ marginBottom: 15 }}>
                <View
                  style={{
                    backgroundColor: "#2a4365",
                    padding: "4px 6px",
                    marginBottom: 5,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontFamily: "Helvetica-Bold",
                      color: "#ffffff",
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </Text>
                </View>
                {text
                  .split("\n")
                  .filter((l) => l.trim())
                  .map((line, i) => (
                    <Text
                      key={i}
                      style={{ fontSize: 9, color: "#2d3748", lineHeight: 1.5 }}
                    >
                      {line.trim()}
                    </Text>
                  ))}
              </View>
            );
          };
          return (
            <>
              {renderInf("Conference Venue", data.generalInfo?.venueDetails)}
              {renderInf(
                "Registration Desk Opening Time",
                data.generalInfo?.registrationHours,
              )}
              {renderInf("Function Rooms", data.generalInfo?.roomAssignments)}
              {renderInf(
                "Refreshments & Internet Access",
                data.generalInfo?.coffeeInternetInfo,
              )}
              {renderInf("Gala Dinner", data.generalInfo?.galaDinner)}
            </>
          );
        })()}

        {data.generalInfo?.floorPlan &&
          (() => {
            const layoutTitle = data.cover.conferenceName
              ? `${data.cover.conferenceName.toUpperCase()} LAYOUT`
              : "VENUE LAYOUT";
            const layoutFontSize = Math.max(
              14,
              Math.min(24, Math.floor(475 / (layoutTitle.length * 0.6))),
            );
            return (
              <View style={{ marginTop: 10 }}>
                <Text
                  style={{
                    fontSize: layoutFontSize,
                    fontFamily: "Helvetica-Bold",
                    color: "#2a4365",
                    textAlign: "center",
                    marginBottom: 12,
                  }}
                >
                  {layoutTitle}
                </Text>
                <Image
                  src={data.generalInfo.floorPlan}
                  style={{
                    width: "100%",
                    maxHeight: 220,
                    objectFit: "contain",
                  }}
                />
              </View>
            );
          })()}

        <View style={pdfStyles.footerContainer} fixed>
          <Text style={pdfStyles.footerTitle}>
            {data.cover.conferenceName}{" "}
          </Text>
          <Text
            style={pdfStyles.pageNumber}
            render={({ pageNumber }) => `${pageNumber}`}
          />
        </View>
      </Page>

      {/* ── PROGRAM AT A GLANCE ── */}
      <Page size="A4" style={pdfStyles.page}>
        <Text
          style={{
            fontSize: 22,
            fontFamily: "Helvetica-Bold",
            color: "#1a3a6b",
            textTransform: "uppercase",
            letterSpacing: 1,
            textAlign: "center",
            marginBottom: 14,
          }}
        >
          Program at a Glance
        </Text>

        {Object.keys(scheduleByDate).length === 0 && (
          <Text style={{ color: "#718096", fontFamily: "Helvetica-Oblique" }}>
            No schedule data loaded.
          </Text>
        )}

        <View style={pdfStyles.footerContainer} fixed>
          <Text style={pdfStyles.footerTitle}>
            {data.cover.conferenceName}{" "}
          </Text>
          <Text
            style={pdfStyles.pageNumber}
            render={({ pageNumber }) => `${pageNumber}`}
          />
        </View>
      </Page>

      {/* ── KEYNOTE SPEAKERS ── */}
      {data.keynotes?.length > 0 ? (
        <Page size="A4" style={pdfStyles.page}>
          <Text style={pdfStyles.sectionTitle}>Keynote Speakers</Text>
          <View style={pdfStyles.sectionDivider} />
          {data.keynotes.map((k: KeynoteSpeaker, i: number) => (
            <View key={i} style={pdfStyles.keynoteCard} wrap={false}>
              <View style={pdfStyles.keynoteHeader}>
                {k.photo ? (
                  <Image src={k.photo} style={pdfStyles.keynotePhoto} />
                ) : null}
                <View style={pdfStyles.keynoteInfo}>
                  <Text style={pdfStyles.keynoteTitle}>
                    {k.presentationTitle || "Untitled Keynote"}
                  </Text>
                  <Text style={pdfStyles.keynoteSpeaker}>
                    {k.name || "Unknown Speaker"}
                  </Text>
                </View>
              </View>

              {k.abstract ? (
                <View>
                  <Text style={pdfStyles.abstractLabel}>Abstract</Text>
                  <Text style={pdfStyles.abstractText}>{k.abstract}</Text>
                </View>
              ) : null}
              {k.bio ? <Text style={pdfStyles.bioText}>{k.bio}</Text> : null}
            </View>
          ))}
          <View style={pdfStyles.footerContainer} fixed>
            <Text style={pdfStyles.footerTitle}>
              {data.cover.conferenceName}{" "}
            </Text>
            <Text
              style={pdfStyles.pageNumber}
              render={({ pageNumber }) => `${pageNumber}`}
            />
          </View>
        </Page>
      ) : null}

      {/* ── DETAILED PROGRAM WITH ABSTRACTS ── */}
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.sectionTitle}>
          Detailed Program with Abstracts
        </Text>
        <View style={pdfStyles.sectionDivider} />
        {(() => {
          const schedule = data.detailedSchedule || [];
          if (schedule.length === 0) {
            return (
              <Text
                style={{ color: "#718096", fontFamily: "Helvetica-Oblique" }}
              >
                No accepted papers found for this conference.
              </Text>
            );
          }

          // Group by session
          const sessions: Record<
            string,
            { session: (typeof schedule)[0]; papers: typeof schedule }
          > = {};
          schedule.forEach((s) => {
            const key = s.sessionName || "General";
            if (!sessions[key]) {
              sessions[key] = { session: s, papers: [] };
            }
            s.papers.forEach((p) =>
              sessions[key].papers.push({ ...s, papers: [p] }),
            );
          });

          return Object.entries(sessions).map(
            ([sessionName, { session, papers }], si) => (
              <View key={si}>
                <View
                  style={{
                    backgroundColor: "#1a3a6b",
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    marginTop: si === 0 ? 0 : 16,
                    marginBottom: 8,
                  }}
                  wrap={false}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: "Helvetica-Bold",
                      color: "#ffffff",
                      letterSpacing: 0.5,
                    }}
                  >
                    {sessionName}
                  </Text>
                </View>

                {session.papers.map((p, i) => (
                  <View key={i} style={pdfStyles.paperBlock} wrap={false}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "baseline",
                        marginBottom: 2,
                      }}
                    >
                      {p.timeSlot ? (
                        <Text
                          style={{
                            fontSize: 8.5,
                            fontFamily: "Helvetica-Bold",
                            color: "#1a3a6b",
                            width: 34,
                            marginRight: 4,
                          }}
                        >
                          {p.timeSlot}
                        </Text>
                      ) : null}
                      <Text
                        style={[
                          pdfStyles.paperAuthors,
                          { marginBottom: 0, flex: 1 },
                        ]}
                      >
                        {p.authors}
                      </Text>
                    </View>

                    <Text
                      style={[
                        pdfStyles.paperTitle,
                        { paddingLeft: p.timeSlot ? 38 : 0 },
                      ]}
                    >
                      {p.paperTitle}
                    </Text>

                    {p.abstract ? (
                      <Text
                        style={[
                          pdfStyles.abstractText,
                          { paddingLeft: p.timeSlot ? 38 : 0 },
                        ]}
                      >
                        {"ABSTRACT. " + formatAbstract(p.abstract)}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ),
          );
        })()}
        <View style={pdfStyles.footerContainer} fixed>
          <Text style={pdfStyles.footerTitle}>
            {data.cover.conferenceName}{" "}
          </Text>
          <Text
            style={pdfStyles.pageNumber}
            render={({ pageNumber }) => `${pageNumber}`}
          />
        </View>
      </Page>
    </Document>
  );
};
