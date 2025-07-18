import { useEffect } from 'react';
import { getSessionInfo, queryReply, type Recipe, type SearchRecipesResult } from './firebase';
import { create } from 'zustand'

export interface HistoryItem {
  role: 'user' | 'ai';
  text?: string;
}

interface ChatState {
  recipe?: Recipe;
  searchResults?: SearchRecipesResult[];
  requestedRedirect?: string;
}


interface AiChatStore {
  sessionId?: string;
  history: HistoryItem[];
  chatState: ChatState;
  isLoading: boolean;
  context: Record<string, unknown>
  submitChatMessage: (value: string, additionalContext?: Record<string, unknown>) => Promise<void>;
  setSession: (sessionId: string, isNew?: boolean) => void;
  setChatStateProperty: <K extends keyof ChatState>(prop: K, newValue: ChatState[K]) => void;
}


const useAiStore = create<AiChatStore>((set, get) => ({
  sessionId: undefined,
  hasLoadedMessages: false,
  chatState: {},
  history: [
    // { role: 'user', text: 'Can you find me some butter chicken recipes?', data: [] },
    // { role: 'ai', ...processAiOutput("Here are some butter chicken recipes I found:\n<FrontendCode type=\"showCard\" title=\"Butter Chicken\" site=\"recipetineats.com\" url=\"https://www.recipetineats.com/butter-chicken/\" summary=\"RECIPE VIDEO above. This is a Chef recipe and is one of the easiest Indian curries to make. The Butter Chicken Sauce is so good that you will want it on tap! Many restaurants take it over the top by adding copious amounts of ghee or butter into the sauce, but you'll find this rich enough as it is. And next time, try the streamlined One-Pan Baked Butter Chicken (readers are loving it!).\" />\n<FrontendCode type=\"showCard\" title=\"Butter Chicken\" site=\"budgetbytes.com\" url=\"https://www.budgetbytes.com/butter-chicken/\" summary=\"This homemade Butter Chicken recipe is rich, creamy, mild, and full of warm spices. Perfect for an easy weeknight dinner for the whole family!\" />\n<FrontendCode type=\"showCard\" title=\"Butter Chicken Recipe (Chicken Makhani) - Swasthi\\'s Recipes\" site=\"indianhealthyrecipes.com\" url=\"https://www.indianhealthyrecipes.com/butter-chicken/\" summary=\"Jun 18, 2024 ... Butter Chicken Recipe (Indian Chicken Makhani) ... Butter chicken is a popular Indian dish made with chicken, spices, tomatoes & cream. This ...\" />\n<FrontendCode type=\"showCard\" title=\"Butter Chicken - RecipeTin Eats\" site=\"recipetineats.com\" url=\"https://www.recipetineats.com/butter-chicken/\" summary=\"Jan 6, 2019 ... The BEST Butter Chicken recipe you will ever make! A chef recipe, easy to make and you can get all the ingredients at the grocery store!!\" />\n<FrontendCode type=\"showCard\" title=\"Butter Chicken - Little Sunny Kitchen\" site=\"littlesunnykitchen.com\" url=\"https://littlesunnykitchen.com/butter-chicken/\" summary=\"Jun 13, 2025 ... Butter Chicken Ingredients · Chicken – use skinless and boneless chicken breast or thighs for this recipe. · Oil, and butter – you will need oil ...\" />\n<FrontendCode type=\"showCard\" title=\"The Best Butter Chicken Recipe (Murgh Makhani) | Little Spice Jar\" site=\"littlespacejar.com\" url=\"https://littlespicejar.com/finger-lickin-butter-chicken-murgh-makhani/\" summary=\"Ingredients for Homemade Butter Chicken: Chicken: Feel free to use boneless skinless chicken breasts or boneless skinless chicken thighs for this recipe. I ...\" />\n<FrontendCode type=\"showCard\" title=\"Butter Chicken - Budget Bytes\" site=\"budgetbytes.com\" url=\"https://www.budgetbytes.com/butter-chicken/\" summary=\"May 6, 2025 ... This homemade Butter Chicken recipe is rich, creamy, mild, and full of warm spices. Perfect for an easy weeknight dinner for the whole ...\" />") }
  ],
  context: {},
  isLoading: false,
  setSession: async (sessionId: string, isNew: boolean = false) => {
    if (get().sessionId === sessionId) return;
    set({ sessionId, isLoading: true, history: [] })
    if (isNew) return;
    const res = await getSessionInfo({ sessionId });
    console.log(res.data.state);
    set({
      history: res.data.messages,
      chatState: res.data.state ?? {},
      isLoading: false,
    });
  },
  submitChatMessage: async (query: string) => {
    set((state) => ({
      history: [...state.history, { role: 'user', text: query, data:{} }],
      isLoading: true
    }));
    try {
      const sessionId = get().sessionId;
      const chatState = get().chatState;
      console.log({ query, chatState, sessionId });
      const res = await queryReply({ query, chatState, sessionId });
      const data = res.data as { text: string, chatState: Record<string, unknown> };
      console.log(data);

      // const res = { data: 'test' };
      set((state) => ({
        history: [...state.history, { role: 'ai', text: data.text }],
        chatState: { ...state.chatState, ...data.chatState },
        isLoading: false
      }));
    } catch (e) {
      console.error(e);
      set((state) => ({
        history: [...state.history, { role: 'ai', text: 'Error getting response', data: { type: 'text', content: 'Error getting response' } }],
        isLoading: false
      }));
    }
  },
  setChatStateProperty: (prop, newValue) => {
    set((state) => ({
      chatState: { ...state.chatState, [prop]: newValue }
    }));
  }
}));


export function useAiChat(): [history: AiChatStore['history'], getIsLoading: AiChatStore['isLoading'], chatState: AiChatStore['chatState'], submitChatMessage: AiChatStore['submitChatMessage'], startNewSession: () => void] {
  const { history, isLoading, chatState, submitChatMessage, setSession } = useAiStore(state => state);

  const startNewSession = () => {
    const randomId = 'chatsess' + Math.random();
    sessionStorage.setItem('chatSessionId', randomId);
    setSession(randomId, true);
  };

  useEffect(() => {
    if (sessionStorage.getItem('chatSessionId')) {
      setSession(sessionStorage.getItem('chatSessionId')!);
    } else {
      startNewSession();
    }
  }, []);

  return [history, isLoading, chatState, submitChatMessage, startNewSession];
}


export function useAiChatState<K extends  keyof ChatState>(property: K): [ChatState[K], (newState: ChatState[K]) => void] {
  const chatState = useAiStore(state => state.chatState);
  const { setChatStateProperty } = useAiStore(state => state);
  return [chatState[property], (newValue) => setChatStateProperty(property, newValue)];
}

