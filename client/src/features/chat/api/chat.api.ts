import { useAxios } from "@/lib/axios";

export interface Conversation {
  conv_id: number;
  created_at: string;
  user_id: string;
  title: string;
}

export interface Message {
  message_id: number;
  created_at: string;
  conv_id: number;
  role: "user" | "model";
  content: string;
  parent_id: number | null;
}

export const chatApi = {
  getConversations: async (userId: string): Promise<Conversation[]> => {
    const api = useAxios();

    const response = await api.get<{ conversations: Conversation[] }>(
      `/${userId}/conversations`,
    );
    return response.conversations;
  },

  getMessages: async (
    userId: string,
    convId: number,
    limit = 10,
    offset = 0,
  ): Promise<Message[]> => {
    const api = useAxios();
    const response = await api.get<{ messages: Message[] }>(
      `/${userId}/conversations/${convId}/messages`,
      {
        params: { limit, offset },
      },
    );
    return response.messages;
  },
};
