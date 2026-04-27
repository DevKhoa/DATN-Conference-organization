import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NotificationsKeys } from "../queries/keys";
import { supabase } from "@/lib/supabase";

export const useMarkNotificationAsReadMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notifId: number) => {
      const { error } = await supabase
        .from("user_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notifId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [NotificationsKeys.UserNotifications],
        exact: false,
      });
    },
  });
};

export const useMarkAllNotificationsAsReadMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notifIds: number[]) => {
      if (notifIds.length === 0) return;

      const { error } = await supabase
        .from("user_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in("id", notifIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [NotificationsKeys.UserNotifications],
        exact: false,
      });
    },
  });
};

export const resolveNotificationTargetUsers = async ({
  confScope,
  selectedConfIds,
  peopleScope,
  selectedRoles,
  selectedUserIds,
}: {
  confScope: "all" | "specific";
  selectedConfIds: number[];
  peopleScope: "all" | "specific" | "byRole";
  selectedRoles: string[];
  selectedUserIds: number[];
}) => {
  if (peopleScope === "specific") {
    return selectedUserIds;
  }

  if (peopleScope === "byRole") {
    if (selectedRoles.length === 0) return [];

    const userIdSets: number[][] = [];
    const confIds = confScope === "specific" ? selectedConfIds : null;

    if (selectedRoles.includes("author")) {
      let paperIds: number[] = [];

      if (confIds) {
        const { data: sessionsData } = await supabase
          .from("sessions")
          .select("session_id")
          .in("conf_id", confIds);

        const sessionIds = (sessionsData || [])
          .map((session: any) => session.session_id)
          .filter(Boolean);

        if (sessionIds.length > 0) {
          const { data: sessionPapersData } = await supabase
            .from("session_papers")
            .select("paper_id")
            .in("session_id", sessionIds);

          paperIds = [
            ...new Set(
              (sessionPapersData || [])
                .map((sessionPaper: any) => sessionPaper.paper_id)
                .filter(Boolean),
            ),
          ];
        }
      } else {
        const { data: sessionPapersData } = await supabase
          .from("session_papers")
          .select("paper_id");

        paperIds = [
          ...new Set(
            (sessionPapersData || [])
              .map((sessionPaper: any) => sessionPaper.paper_id)
              .filter(Boolean),
          ),
        ];
      }

      if (paperIds.length > 0) {
        const { data: authorsData } = await supabase
          .from("papers")
          .select("primary_author_id")
          .in("paper_id", paperIds);

        const primaryAuthorIds = (authorsData || [])
          .map((paper: any) => paper.primary_author_id)
          .filter(Boolean);

        const { data: coAuthorsData } = await supabase
          .from("paper_coauthors")
          .select("user_id")
          .in("paper_id", paperIds);

        const coAuthorIds = (coAuthorsData || [])
          .map((coAuthor: any) => coAuthor.user_id)
          .filter(Boolean);

        userIdSets.push([...primaryAuthorIds, ...coAuthorIds]);
      }
    }

    if (selectedRoles.includes("chairperson")) {
      let chairQuery = supabase.from("sessions").select("chair_person_id");
      if (confIds) chairQuery = chairQuery.in("conf_id", confIds);

      const { data: chairData } = await chairQuery;
      userIdSets.push(
        (chairData || [])
          .map((session: any) => session.chair_person_id)
          .filter(Boolean),
      );
    }

    if (selectedRoles.includes("attendee")) {
      if (confIds) {
        const { data: sessionsData } = await supabase
          .from("sessions")
          .select("session_id")
          .in("conf_id", confIds);

        const sessionIds = (sessionsData || [])
          .map((session: any) => session.session_id)
          .filter(Boolean);

        if (sessionIds.length > 0) {
          const { data: ticketSessionData } = await supabase
            .from("ticket_session")
            .select("ticket_id")
            .in("session_id", sessionIds);

          const ticketIds = [
            ...new Set(
              (ticketSessionData || [])
                .map((ticket: any) => ticket.ticket_id)
                .filter(Boolean),
            ),
          ];

          if (ticketIds.length > 0) {
            const { data: registrationsData } = await supabase
              .from("registrations")
              .select("user_id")
              .in("ticket_id", ticketIds);

            userIdSets.push(
              (registrationsData || [])
                .map((registration: any) => registration.user_id)
                .filter(Boolean),
            );
          }
        }
      } else {
        const { data: registrationsData } = await supabase
          .from("registrations")
          .select("user_id");

        userIdSets.push(
          (registrationsData || [])
            .map((registration: any) => registration.user_id)
            .filter(Boolean),
        );
      }
    }

    return [...new Set(userIdSets.flat())];
  }

  if (confScope === "all") {
    const { data } = await supabase.from("profiles").select("user_id");
    return (data || []).map((user: any) => user.user_id).filter(Boolean);
  }

  if (selectedConfIds.length === 0) return [];

  const { data: sessionsData, error: sessionsError } = await supabase
    .from("sessions")
    .select("session_id")
    .in("conf_id", selectedConfIds);
  if (sessionsError) throw sessionsError;

  const sessionIds = (sessionsData || [])
    .map((session: any) => session.session_id)
    .filter(Boolean);
  if (sessionIds.length === 0) return [];

  const { data: ticketSessionData, error: ticketSessionError } = await supabase
    .from("ticket_session")
    .select("ticket_id")
    .in("session_id", sessionIds);
  if (ticketSessionError) throw ticketSessionError;

  const ticketIds = [
    ...new Set(
      (ticketSessionData || [])
        .map((ticket: any) => ticket.ticket_id)
        .filter(Boolean),
    ),
  ];
  if (ticketIds.length === 0) return [];

  const { data: registrationsData, error: registrationsError } = await supabase
    .from("registrations")
    .select("user_id")
    .in("ticket_id", ticketIds);
  if (registrationsError) throw registrationsError;

  return [
    ...new Set(
      (registrationsData || [])
        .map((registration: any) => registration.user_id)
        .filter(Boolean),
    ),
  ];
};

export const useSaveNotificationTemplateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      templateName,
      titleTemplate,
      contentTemplate,
      confId,
      createdBy,
    }: {
      templateId: number | null;
      templateName: string;
      titleTemplate: string;
      contentTemplate: string;
      confId: number | null;
      createdBy: number | null;
    }) => {
      if (templateId !== null) {
        const { error } = await supabase
          .from("notification_templates")
          .update({
            template_name: templateName,
            title_template: titleTemplate,
            content_template: contentTemplate,
            conf_id: confId,
          })
          .eq("template_id", templateId);

        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("notification_templates").insert({
        template_name: templateName,
        title_template: titleTemplate,
        content_template: contentTemplate,
        conf_id: confId,
        created_by: createdBy,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [NotificationsKeys.NotificationTemplates],
      });
    },
  });
};

export const useSendNotificationMutation = () => {
  return useMutation({
    mutationFn: async ({
      senderEmail,
      conferenceId,
      confScope,
      selectedConfIds,
      peopleScope,
      selectedRoles,
      finalTitle,
      finalContent,
      targetUserIds,
      activeTab,
    }: {
      senderEmail: string;
      conferenceId?: number;
      confScope: "all" | "specific";
      selectedConfIds: number[];
      peopleScope: "all" | "specific" | "byRole";
      selectedRoles: string[];
      finalTitle: string;
      finalContent: string;
      targetUserIds: number[];
      activeTab: "template" | "manual";
    }) => {
      const { data: sender } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", senderEmail)
        .single();
      if (!sender) throw new Error("Sender not found.");

      const notifConfId =
        confScope === "specific" && selectedConfIds.length === 1
          ? selectedConfIds[0]
          : (conferenceId ?? null);

      const targetCriteria = {
        scope: confScope,
        conf_ids: confScope === "specific" ? selectedConfIds : "all",
        people_scope: peopleScope,
        ...(peopleScope === "byRole" ? { roles: selectedRoles } : {}),
      };

      const finalType: "manual" | "template" =
        activeTab === "template" ? "template" : "manual";
      const finalTargetType = confScope === "all" ? "all" : "specific_users";

      const { data: notifData, error: notifErr } = await supabase
        .from("notifications")
        .insert({
          conf_id: notifConfId,
          sender_id: sender.user_id,
          title: finalTitle,
          content: finalContent,
          type: finalType,
          target_type: finalTargetType,
          target_criteria: targetCriteria,
        })
        .select("notification_id")
        .single();

      if (notifErr) throw notifErr;

      if (targetUserIds.length > 0) {
        const rows = targetUserIds.map((userId) => ({
          notification_id: notifData.notification_id,
          user_id: userId,
          dynamic_title: finalTitle,
          dynamic_content: finalContent,
          is_read: false,
        }));

        for (let i = 0; i < rows.length; i += 200) {
          const { error: fanOutErr } = await supabase
            .from("user_notifications")
            .insert(rows.slice(i, i + 200));

          if (fanOutErr) {
            throw new Error(`Fan-out insert failed: ${fanOutErr.message}`);
          }
        }
      }
    },
  });
};
